import { FlightLabsClient, FlightLabsClientConfig, FlightLabsApiError } from './FlightLabsClient';
import { FlightLabsCache } from './FlightLabsCache';
import { FlightDataProcessor } from './FlightDataProcessor';
import { CallSignDataProcessor } from './CallSignDataProcessor';
import { HistoricalDataProcessor } from './HistoricalDataProcessor';
import { ScheduleDataProcessor } from './ScheduleDataProcessor';
import { FutureFlightDataProcessor } from './FutureFlightDataProcessor';
import { DelayDataProcessor } from './DelayDataProcessor';
import { FlightByNumberProcessor } from './FlightByNumberProcessor';
import { FlightPriceProcessor } from './FlightPriceProcessor';
import { AirportSearchProcessor } from './AirportSearchProcessor';
import { AirportFilterProcessor, AirportFilterStatistics, GroupedAirports } from './AirportFilterProcessor';
import { CountryDataProcessor, CountryStatistics, GroupedCountries } from './CountryDataProcessor';
import { AirlineDataProcessor, AirlineStatistics, GroupedAirlines } from './AirlineDataProcessor';
import { RouteDataProcessor, RouteStatistics, GroupedRoutes } from './RouteDataProcessor';
import { 
  FlightData, FlightQueryParams, FlightStatus, CallSignQueryParams, CallSignFlightData,
  HistoricalFlightData, HistoricalFlightQueryParams, FlightScheduleData,
  FlightScheduleQueryParams, FlightScheduleResponse, FutureFlightData,
  FutureFlightQueryParams, FlightDelayData, FlightDelayQueryParams,
  FlightByNumberData, FlightByNumberQueryParams, FlightPriceQueryParams,
  FlightPriceResponse, FlightItinerary, AirportSearchQueryParams,
  AirportSearchResponse, AirportSearchResult, AirportsByFilterQueryParams,
  AirportFilterData, isMajorAirport, isInternationalAirport, hasSchedules,
  isActiveAirport, getAirportNameInLanguage, CountryData, CountryDetailedData,
  CountryNames, AirlineData, isInternationalAirline as isInternationalAirlineType,
  isPassengerAirline, isCargoAirline, isScheduledAirline, isIosaRegistered,
  AirlineQueryParams, RouteData, RouteQueryParams, isCodeshareRoute, hasTerminalInfo,
  hasAircraftInfo, operatesOnDay, getDayNames, CityData
} from '../../types/flightlabs.types';

/**
 * Service configuration extending client config with cache settings
 */
export interface FlightLabsServiceConfig extends FlightLabsClientConfig {
  cacheEnabled?: boolean;
  cacheTTL?: number;
  cacheMaxEntries?: number;
  autoCleanupInterval?: number;
}

/**
 * Enhanced FlightLabs service with caching and data processing
 */
export class FlightLabsService {
  private client: FlightLabsClient;
  private cache: FlightLabsCache | null = null;
  private cleanupTimer: any = null;

  constructor(config: FlightLabsServiceConfig) {
    this.client = new FlightLabsClient(config);

    // Initialize cache if enabled
    if (config.cacheEnabled !== false) {
      this.cache = new FlightLabsCache(
        config.cacheTTL || 60,
        config.cacheMaxEntries || 100
      );

      // Set up automatic cache cleanup
      if (config.autoCleanupInterval) {
        this.cleanupTimer = setInterval(
          () => this.cache?.cleanup(),
          config.autoCleanupInterval * 1000
        );
      }
    }
  }

  /**
   * Get flights with caching support
   */
  async getFlights(params: Partial<FlightQueryParams> = {}): Promise<FlightData[]> {
    // Check cache first
    if (this.cache) {
      const cachedData = this.cache.get(params);
      if (cachedData) {
        return cachedData;
      }
    }

    // Fetch from API
    const data = await this.client.getFlights(params);

    // Store in cache
    if (this.cache && data.length > 0) {
      this.cache.set(params, data);
    }

    return data;
  }

  /**
   * Get flights by airline IATA code
   * @param airlineIata Airline IATA code
   * @param additionalParams Additional query parameters
   */
  async getFlightsByAirline(
    airlineIata: string,
    additionalParams: Partial<FlightQueryParams> = {}
  ): Promise<FlightData[]> {
    return this.getFlights({ airlineIata, ...additionalParams });
  }

  /**
   * Get flights by airline with formatted data
   */
  async getFlightsByAirlineFormatted(
    airlineIata: string,
    additionalParams: Partial<FlightQueryParams> = {}
  ) {
    const flights = await this.getFlights({ airlineIata, ...additionalParams });
    return flights.map(flight => FlightDataProcessor.formatFlightInfo(flight));
  }

  /**
   * Get active flights (en-route) only
   */
  async getActiveFlights(params: Partial<FlightQueryParams> = {}): Promise<FlightData[]> {
    const flights = await this.getFlights(params);
    return FlightDataProcessor.filterByStatus(flights, FlightStatus.EN_ROUTE);
  }

  /**
   * Get flights within a geographic area
   */
  async getFlightsInArea(
    bounds: { north: number; south: number; east: number; west: number },
    additionalParams: Partial<FlightQueryParams> = {}
  ): Promise<FlightData[]> {
    const flights = await this.getFlights(additionalParams);
    return FlightDataProcessor.filterByBoundingBox(flights, bounds);
  }

  /**
   * Get flights at cruising altitude (above 9000 meters)
   */
  async getCruisingFlights(params: Partial<FlightQueryParams> = {}): Promise<FlightData[]> {
    const flights = await this.getFlights(params);
    return FlightDataProcessor.filterByAltitude(flights, 9000, Infinity);
  }

  /**
   * Get low altitude flights (below 3000 meters)
   */
  async getLowAltitudeFlights(params: Partial<FlightQueryParams> = {}): Promise<FlightData[]> {
    const flights = await this.getFlights(params);
    return FlightDataProcessor.filterByAltitude(flights, 0, 3000);
  }

  /**
   * Get flight tracking data with enhanced information
   */
  async trackFlight(flightIata: string): Promise<{
    flight: FlightData | null;
    formatted: any;
    dataAge: number;
    isStale: boolean;
  } | null> {
    const flights = await this.getFlights({ flightIata });
    
    if (flights.length === 0) {
      return null;
    }

    const flight = flights[0];
    const dataAge = FlightDataProcessor.getDataAge(flight);

    return {
      flight,
      formatted: FlightDataProcessor.formatFlightInfo(flight),
      dataAge,
      isStale: FlightDataProcessor.isDataStale(flight),
    };
  }

  /**
   * Get airline fleet status
   */
  async getAirlineFleetStatus(airlineIata: string): Promise<{
    total: number;
    enRoute: number;
    scheduled: number;
    landed: number;
    byAircraft: Map<string, number>;
    averageAltitude: number;
    averageSpeed: number;
  }> {
    const flights = await this.getFlights({ airlineIata });
    
    const stats = {
      total: flights.length,
      enRoute: 0,
      scheduled: 0,
      landed: 0,
      byAircraft: new Map<string, number>(),
      totalAltitude: 0,
      totalSpeed: 0,
    };

    flights.forEach(flight => {
      // Count by status
      switch (flight.status) {
        case FlightStatus.EN_ROUTE:
          stats.enRoute++;
          break;
        case FlightStatus.SCHEDULED:
          stats.scheduled++;
          break;
        case FlightStatus.LANDED:
          stats.landed++;
          break;
      }

      // Count by aircraft type
      const aircraftType = flight.aircraft_icao;
      stats.byAircraft.set(
        aircraftType,
        (stats.byAircraft.get(aircraftType) || 0) + 1
      );

      // Sum altitude and speed for averages
      stats.totalAltitude += flight.alt;
      stats.totalSpeed += flight.speed;
    });

    return {
      total: stats.total,
      enRoute: stats.enRoute,
      scheduled: stats.scheduled,
      landed: stats.landed,
      byAircraft: stats.byAircraft,
      averageAltitude: stats.total > 0 ? Math.round(stats.totalAltitude / stats.total) : 0,
      averageSpeed: stats.total > 0 ? Math.round(stats.totalSpeed / stats.total) : 0,
    };
  }

  /**
   * Get airport activity
   */
  async getAirportActivity(airportIata: string): Promise<{
    departures: FlightData[];
    arrivals: FlightData[];
    totalMovements: number;
    airlines: Set<string>;
  }> {
    const [departures, arrivals] = await Promise.all([
      this.getFlights({ depIata: airportIata }),
      this.getFlights({ arrIata: airportIata })
    ]);

    const airlines = new Set<string>();
    [...departures, ...arrivals].forEach(flight => {
      airlines.add(flight.airline_iata || flight.airline_icao);
    });

    return {
      departures,
      arrivals,
      totalMovements: departures.length + arrivals.length,
      airlines,
    };
  }

  /**
   * Search flights with comprehensive criteria and sorting
   */
  async searchAndSortFlights(
    searchCriteria: Parameters<FlightLabsClient['searchFlights']>[0],
    sortBy: Parameters<typeof FlightDataProcessor.sortFlights>[1] = 'updated',
    sortOrder: Parameters<typeof FlightDataProcessor.sortFlights>[2] = 'desc'
  ): Promise<FlightData[]> {
    const flights = await this.client.searchFlights(searchCriteria);
    return FlightDataProcessor.sortFlights(flights, sortBy, sortOrder);
  }

  /**
   * Get flights by call sign with caching
   */
  async getFlightsByCallSign(params: Partial<CallSignQueryParams> = {}): Promise<CallSignFlightData[]> {
    // Check cache first
    if (this.cache) {
      const cacheKey = { ...params, endpoint: 'callsign' };
      const cachedData = this.cache.get(cacheKey as any);
      if (cachedData) {
        return cachedData as any as CallSignFlightData[];
      }
    }

    // Fetch from API
    const data = await this.client.getFlightsByCallSign(params);

    // Store in cache
    if (this.cache && data.length > 0) {
      const cacheKey = { ...params, endpoint: 'callsign' };
      this.cache.set(cacheKey as any, data as any);
    }

    return data;
  }

  /**
   * Track flight by call sign
   */
  async trackFlightByCallSign(callsign: string): Promise<{
    flights: CallSignFlightData[];
    airborne: CallSignFlightData[];
    grounded: CallSignFlightData[];
    formatted: any[];
  }> {
    const flights = await this.getFlightsByCallSign({ callsign });
    
    return {
      flights,
      airborne: CallSignDataProcessor.getAirborneFlights(flights),
      grounded: CallSignDataProcessor.getGroundedFlights(flights),
      formatted: flights.map(f => CallSignDataProcessor.formatCallSignFlight(f)),
    };
  }

  /**
   * Get airline flights using call sign endpoint
   */
  async getAirlineFlightsByCallSign(airlineIcao: string): Promise<{
    total: number;
    airborne: number;
    grounded: number;
    flights: CallSignFlightData[];
    byAircraft: Map<string, CallSignFlightData[]>;
  }> {
    const flights = await this.getFlightsByCallSign({ airline_icao: airlineIcao });
    const airborne = CallSignDataProcessor.getAirborneFlights(flights);
    const grounded = CallSignDataProcessor.getGroundedFlights(flights);
    
    // Group by aircraft registration
    const byAircraft = new Map<string, CallSignFlightData[]>();
    flights.forEach(flight => {
      const reg = flight.registration;
      if (!byAircraft.has(reg)) {
        byAircraft.set(reg, []);
      }
      byAircraft.get(reg)!.push(flight);
    });

    return {
      total: flights.length,
      airborne: airborne.length,
      grounded: grounded.length,
      flights,
      byAircraft,
    };
  }

  /**
   * Get emergency flights
   */
  async getEmergencyFlights(params: Partial<CallSignQueryParams> = {}): Promise<CallSignFlightData[]> {
    const flights = await this.getFlightsByCallSign(params);
    return CallSignDataProcessor.getEmergencyFlights(flights);
  }

  /**
   * Search and sort call sign flights
   */
  async searchAndSortCallSignFlights(
    params: Partial<CallSignQueryParams>,
    sortBy: Parameters<typeof CallSignDataProcessor.sortFlights>[1] = 'time',
    sortOrder: Parameters<typeof CallSignDataProcessor.sortFlights>[2] = 'desc'
  ): Promise<CallSignFlightData[]> {
    const flights = await this.getFlightsByCallSign(params);
    return CallSignDataProcessor.sortFlights(flights, sortBy, sortOrder);
  }

  /**
   * Get flights by airline ICAO using flights-by-airline endpoint
   * @param airlineIcao Airline ICAO code
   * @param limit Optional limit for results
   * @returns Promise with flight data and analysis
   */
  async getFlightsByAirlineIcao(
    airlineIcao: string,
    limit?: number
  ): Promise<{
    flights: CallSignFlightData[];
    total: number;
    airborne: CallSignFlightData[];
    grounded: CallSignFlightData[];
    byRoute: Map<string, CallSignFlightData[]>;
    byAircraft: Map<string, CallSignFlightData[]>;
    statistics: {
      averageAltitude: number;
      averageSpeed: number;
      emergencyCount: number;
    };
  }> {
    // Check cache first
    if (this.cache) {
      const cacheKey = { airline_icao: airlineIcao, limit, endpoint: 'flights-by-airline' };
      const cachedData = this.cache.get(cacheKey as any);
      if (cachedData) {
        const flights = cachedData as any as CallSignFlightData[];
        return this.analyzeAirlineFlights(flights);
      }
    }

    // Fetch from API
    const flights = limit 
      ? await this.client.getFlightsByAirlineWithLimit(airlineIcao, limit)
      : await this.client.getFlightsByAirlineIcao(airlineIcao);

    // Store in cache
    if (this.cache && flights.length > 0) {
      const cacheKey = { airline_icao: airlineIcao, limit, endpoint: 'flights-by-airline' };
      this.cache.set(cacheKey as any, flights as any);
    }

    return this.analyzeAirlineFlights(flights);
  }

  /**
   * Analyze airline flights data
   * @param flights Array of flight data
   * @returns Analysis results
   */
  private analyzeAirlineFlights(flights: CallSignFlightData[]): {
    flights: CallSignFlightData[];
    total: number;
    airborne: CallSignFlightData[];
    grounded: CallSignFlightData[];
    byRoute: Map<string, CallSignFlightData[]>;
    byAircraft: Map<string, CallSignFlightData[]>;
    statistics: {
      averageAltitude: number;
      averageSpeed: number;
      emergencyCount: number;
    };
  } {
    const airborne = CallSignDataProcessor.getAirborneFlights(flights);
    const grounded = CallSignDataProcessor.getGroundedFlights(flights);
    const emergencies = CallSignDataProcessor.getEmergencyFlights(flights);

    // Group by route
    const byRoute = new Map<string, CallSignFlightData[]>();
    flights.forEach(flight => {
      if (flight.origin_airport_iata && flight.destination_airport_iata) {
        const route = `${flight.origin_airport_iata}-${flight.destination_airport_iata}`;
        if (!byRoute.has(route)) {
          byRoute.set(route, []);
        }
        byRoute.get(route)!.push(flight);
      }
    });

    // Group by aircraft
    const byAircraft = new Map<string, CallSignFlightData[]>();
    flights.forEach(flight => {
      const aircraft = flight.registration;
      if (!byAircraft.has(aircraft)) {
        byAircraft.set(aircraft, []);
      }
      byAircraft.get(aircraft)!.push(flight);
    });

    // Calculate statistics
    let totalAltitude = 0;
    let totalSpeed = 0;
    let count = 0;

    airborne.forEach(flight => {
      totalAltitude += flight.altitude;
      totalSpeed += flight.ground_speed;
      count++;
    });

    return {
      flights,
      total: flights.length,
      airborne,
      grounded,
      byRoute,
      byAircraft,
      statistics: {
        averageAltitude: count > 0 ? Math.round(totalAltitude / count) : 0,
        averageSpeed: count > 0 ? Math.round(totalSpeed / count) : 0,
        emergencyCount: emergencies.length,
      },
    };
  }

  /**
   * Get real-time airline operations summary
   * @param airlineIcao Airline ICAO code
   * @returns Comprehensive operations summary
   */
  async getAirlineOperationsSummary(airlineIcao: string): Promise<{
    airline: string;
    fleetStatus: {
      total: number;
      airborne: number;
      grounded: number;
      emergency: number;
    };
    routeNetwork: {
      activeRoutes: number;
      topRoutes: Array<{ route: string; flights: number }>;
    };
    aircraftUtilization: {
      inUse: number;
      topAircraft: Array<{ registration: string; flights: number }>;
    };
    operationalMetrics: {
      averageAltitude: { meters: number; feet: number };
      averageSpeed: { knots: number; mph: number; kmh: number };
    };
    flights: CallSignFlightData[];
  }> {
    const analysis = await this.getFlightsByAirlineIcao(airlineIcao);

    // Get top routes
    const topRoutes = Array.from(analysis.byRoute.entries())
      .map(([route, flights]) => ({ route, flights: flights.length }))
      .sort((a, b) => b.flights - a.flights)
      .slice(0, 5);

    // Get top aircraft
    const topAircraft = Array.from(analysis.byAircraft.entries())
      .map(([registration, flights]) => ({ registration, flights: flights.length }))
      .sort((a, b) => b.flights - a.flights)
      .slice(0, 5);

    return {
      airline: airlineIcao,
      fleetStatus: {
        total: analysis.total,
        airborne: analysis.airborne.length,
        grounded: analysis.grounded.length,
        emergency: analysis.statistics.emergencyCount,
      },
      routeNetwork: {
        activeRoutes: analysis.byRoute.size,
        topRoutes,
      },
      aircraftUtilization: {
        inUse: analysis.byAircraft.size,
        topAircraft,
      },
      operationalMetrics: {
        averageAltitude: {
          meters: analysis.statistics.averageAltitude,
          feet: Math.round(analysis.statistics.averageAltitude * 3.28084),
        },
        averageSpeed: {
          knots: analysis.statistics.averageSpeed,
          mph: CallSignDataProcessor.knotsToMph(analysis.statistics.averageSpeed),
          kmh: CallSignDataProcessor.knotsToKmh(analysis.statistics.averageSpeed),
        },
      },
      flights: analysis.flights,
    };
  }

  /**
   * Get historical flight data with caching
   */
  async getHistoricalFlights(params: HistoricalFlightQueryParams): Promise<HistoricalFlightData[]> {
    // Check cache first
    if (this.cache) {
      const cacheKey = { ...params, endpoint: 'historical' };
      const cachedData = this.cache.get(cacheKey as any);
      if (cachedData) {
        return cachedData as any as HistoricalFlightData[];
      }
    }

    // Fetch from API
    const data = await this.client.getHistoricalFlights(params);

    // Store in cache
    if (this.cache && data.length > 0) {
      const cacheKey = { ...params, endpoint: 'historical' };
      this.cache.set(cacheKey as any, data as any);
    }

    return data;
  }

  /**
   * Get historical departures with analysis
   */
  async getHistoricalDeparturesAnalysis(
    airportCode: string,
    dateFrom: string,
    dateTo: string,
    filters: Partial<HistoricalFlightQueryParams> = {}
  ): Promise<{
    flights: HistoricalFlightData[];
    sorted: HistoricalFlightData[];
    byAirline: Map<string, HistoricalFlightData[]>;
    byTerminal: Map<string, HistoricalFlightData[]>;
    byAircraft: Map<string, HistoricalFlightData[]>;
    peakHours: Map<number, number>;
    statistics: {
      total: number;
      cargo: number;
      codeshare: number;
      airlines: number;
      aircraftTypes: number;
    };
  }> {
    const flights = await this.client.getHistoricalDepartures(airportCode, dateFrom, dateTo, filters);
    const sorted = HistoricalDataProcessor.sortByScheduledTime(flights);
    
    return {
      flights,
      sorted,
      byAirline: HistoricalDataProcessor.groupByAirline(flights),
      byTerminal: HistoricalDataProcessor.groupByTerminal(flights),
      byAircraft: HistoricalDataProcessor.groupByAircraftModel(flights),
      peakHours: HistoricalDataProcessor.getPeakHours(flights),
      statistics: {
        total: flights.length,
        cargo: HistoricalDataProcessor.filterCargoFlights(flights).length,
        codeshare: HistoricalDataProcessor.getCodeshareFlights(flights).length,
        airlines: HistoricalDataProcessor.groupByAirline(flights).size,
        aircraftTypes: HistoricalDataProcessor.getUniqueAircraftModels(flights).length,
      },
    };
  }

  /**
   * Get historical arrivals with analysis
   */
  async getHistoricalArrivalsAnalysis(
    airportCode: string,
    dateFrom: string,
    dateTo: string,
    filters: Partial<HistoricalFlightQueryParams> = {}
  ): Promise<{
    flights: HistoricalFlightData[];
    sorted: HistoricalFlightData[];
    byAirline: Map<string, HistoricalFlightData[]>;
    byTerminal: Map<string, HistoricalFlightData[]>;
    byAircraft: Map<string, HistoricalFlightData[]>;
    peakHours: Map<number, number>;
    statistics: {
      total: number;
      cargo: number;
      codeshare: number;
      airlines: number;
      aircraftTypes: number;
    };
  }> {
    const flights = await this.client.getHistoricalArrivals(airportCode, dateFrom, dateTo, filters);
    const sorted = HistoricalDataProcessor.sortByScheduledTime(flights);
    
    return {
      flights,
      sorted,
      byAirline: HistoricalDataProcessor.groupByAirline(flights),
      byTerminal: HistoricalDataProcessor.groupByTerminal(flights),
      byAircraft: HistoricalDataProcessor.groupByAircraftModel(flights),
      peakHours: HistoricalDataProcessor.getPeakHours(flights),
      statistics: {
        total: flights.length,
        cargo: HistoricalDataProcessor.filterCargoFlights(flights).length,
        codeshare: HistoricalDataProcessor.getCodeshareFlights(flights).length,
        airlines: HistoricalDataProcessor.groupByAirline(flights).size,
        aircraftTypes: HistoricalDataProcessor.getUniqueAircraftModels(flights).length,
      },
    };
  }

  /**
   * Get historical flights for a specific date
   */
  async getHistoricalFlightsByDate(
    airportCode: string,
    type: 'departure' | 'arrival',
    date: string,
    filters: Partial<HistoricalFlightQueryParams> = {}
  ): Promise<HistoricalFlightData[]> {
    return this.client.getHistoricalFlightsByDate(airportCode, type, date, filters);
  }

  /**
   * Get airline frequency analysis for historical data
   */
  async getAirlineFrequencyAnalysis(
    airportCode: string,
    type: 'departure' | 'arrival',
    dateFrom: string,
    dateTo: string
  ): Promise<{
    frequency: Map<string, { airline: string; count: number; percentage: number }>;
    sorted: Array<[string, { airline: string; count: number; percentage: number }]>;
  }> {
    const flights = await this.getHistoricalFlights({
      code: airportCode,
      type,
      date_from: dateFrom,
      date_to: dateTo,
    } as HistoricalFlightQueryParams);
    
    const frequency = HistoricalDataProcessor.calculateAirlineFrequency(flights);
    const sorted = Array.from(frequency.entries()).sort((a, b) => b[1].count - a[1].count);
    
    return { frequency, sorted };
  }

  /**
   * Get flight schedules with caching
   */
  async getFlightSchedules(params: FlightScheduleQueryParams): Promise<FlightScheduleResponse> {
    // Check cache first
    if (this.cache) {
      const cacheKey = { ...params, endpoint: 'schedules' };
      const cachedData = this.cache.get(cacheKey as any);
      if (cachedData) {
        return cachedData as any as FlightScheduleResponse;
      }
    }

    // Fetch from API
    const data = await this.client.getFlightSchedules(params);

    // Store in cache
    if (this.cache) {
      const cacheKey = { ...params, endpoint: 'schedules' };
      this.cache.set(cacheKey as any, data as any);
    }

    return data;
  }

  /**
   * Get departure schedules with analysis
   */
  async getDepartureSchedulesAnalysis(
    airportCode: string,
    options: Omit<FlightScheduleQueryParams, 'iataCode' | 'type' | 'access_key'> = {}
  ): Promise<{
    response: FlightScheduleResponse;
    flights: FlightScheduleData[];
    sorted: FlightScheduleData[];
    byAirline: Map<string, FlightScheduleData[]>;
    byTerminal: Map<string, FlightScheduleData[]>;
    statistics: {
      total: number;
      scheduled: number;
      active: number;
      cancelled: number;
      delayed: number;
      onTimePerformance: number;
      codeshare: number;
    };
  }> {
    const response = await this.client.getDepartureSchedules(airportCode, options);
    const sorted = ScheduleDataProcessor.sortByDepartureTime(response.data);
    const delayed = ScheduleDataProcessor.filterDelayedFlights(response.data);
    const onTimeStats = ScheduleDataProcessor.calculateOnTimePerformance(response.data);
    
    return {
      response,
      flights: response.data,
      sorted,
      byAirline: ScheduleDataProcessor.groupByAirline(response.data),
      byTerminal: ScheduleDataProcessor.groupByTerminal(response.data, 'departure'),
      statistics: {
        total: response.data.length,
        scheduled: ScheduleDataProcessor.filterByStatus(response.data, 'scheduled').length,
        active: ScheduleDataProcessor.filterByStatus(response.data, 'active').length,
        cancelled: ScheduleDataProcessor.filterByStatus(response.data, 'cancelled').length,
        delayed: delayed.length,
        onTimePerformance: onTimeStats.onTimePercentage,
        codeshare: ScheduleDataProcessor.getCodeshareFlights(response.data).length,
      },
    };
  }

  /**
   * Get arrival schedules with analysis
   */
  async getArrivalSchedulesAnalysis(
    airportCode: string,
    options: Omit<FlightScheduleQueryParams, 'iataCode' | 'type' | 'access_key'> = {}
  ): Promise<{
    response: FlightScheduleResponse;
    flights: FlightScheduleData[];
    sorted: FlightScheduleData[];
    byAirline: Map<string, FlightScheduleData[]>;
    byTerminal: Map<string, FlightScheduleData[]>;
    statistics: {
      total: number;
      scheduled: number;
      active: number;
      landed: number;
      cancelled: number;
      delayed: number;
      onTimePerformance: number;
      baggageClaims: Map<string, FlightScheduleData[]>;
    };
  }> {
    const response = await this.client.getArrivalSchedules(airportCode, options);
    const sorted = ScheduleDataProcessor.sortByArrivalTime(response.data);
    const delayed = ScheduleDataProcessor.filterDelayedFlights(response.data);
    const onTimeStats = ScheduleDataProcessor.calculateOnTimePerformance(response.data);
    
    // Get baggage claim assignments
    const baggageClaims = new Map<string, FlightScheduleData[]>();
    response.data.forEach(flight => {
      if (flight.arr_baggage) {
        if (!baggageClaims.has(flight.arr_baggage)) {
          baggageClaims.set(flight.arr_baggage, []);
        }
        baggageClaims.get(flight.arr_baggage)!.push(flight);
      }
    });
    
    return {
      response,
      flights: response.data,
      sorted,
      byAirline: ScheduleDataProcessor.groupByAirline(response.data),
      byTerminal: ScheduleDataProcessor.groupByTerminal(response.data, 'arrival'),
      statistics: {
        total: response.data.length,
        scheduled: ScheduleDataProcessor.filterByStatus(response.data, 'scheduled').length,
        active: ScheduleDataProcessor.filterByStatus(response.data, 'active').length,
        landed: ScheduleDataProcessor.filterByStatus(response.data, 'landed').length,
        cancelled: ScheduleDataProcessor.filterByStatus(response.data, 'cancelled').length,
        delayed: delayed.length,
        onTimePerformance: onTimeStats.onTimePercentage,
        baggageClaims,
      },
    };
  }

  /**
   * Get all schedules with pagination (async generator)
   */
  async *getAllSchedulesPaginated(
    airportCode: string,
    type: 'departure' | 'arrival' = 'arrival',
    pageSize: number = 100,
    filters: Omit<FlightScheduleQueryParams, 'iataCode' | 'type' | 'limit' | 'skip' | 'access_key'> = {}
  ): AsyncGenerator<FlightScheduleData[], void, unknown> {
    yield* this.client.getFlightSchedulesPaginated(airportCode, type, pageSize, filters);
  }

  /**
   * Get flight schedule for specific flight
   */
  async getFlightSchedule(
    flightIata: string,
    airportCode: string,
    type: 'departure' | 'arrival' = 'departure'
  ): Promise<FlightScheduleData[]> {
    return this.client.getFlightSchedule(flightIata, airportCode, type);
  }

  /**
   * Get gate assignments
   */
  async getGateAssignments(
    airportCode: string,
    type: 'departure' | 'arrival' = 'departure',
    options: Omit<FlightScheduleQueryParams, 'iataCode' | 'type' | 'access_key'> = {}
  ): Promise<{
    gates: Map<string, FlightScheduleData[]>;
    unassigned: FlightScheduleData[];
    total: number;
  }> {
    const response = await this.client.getFlightSchedules({
      iataCode: airportCode,
      type,
      ...options,
    } as FlightScheduleQueryParams);
    
    const gates = ScheduleDataProcessor.getGateAssignments(response.data, type);
    const unassigned = response.data.filter(flight => {
      const gate = type === 'departure' ? flight.dep_gate : flight.arr_gate;
      return !gate;
    });
    
    return {
      gates,
      unassigned,
      total: response.data.length,
    };
  }

  /**
   * Get future flight predictions with caching
   */
  async getFutureFlights(params: FutureFlightQueryParams): Promise<FutureFlightData[]> {
    // Check cache first
    if (this.cache) {
      const cacheKey = { ...params, endpoint: 'future' };
      const cachedData = this.cache.get(cacheKey as any);
      if (cachedData) {
        return cachedData as any as FutureFlightData[];
      }
    }

    // Fetch from API
    const data = await this.client.getFutureFlights(params);

    // Store in cache
    if (this.cache && data.length > 0) {
      const cacheKey = { ...params, endpoint: 'future' };
      this.cache.set(cacheKey as any, data as any);
    }

    return data;
  }

  /**
   * Get future departures with analysis
   */
  async getFutureDeparturesAnalysis(
    airportCode: string,
    date: string
  ): Promise<{
    flights: FutureFlightData[];
    sorted: FutureFlightData[];
    byCarrier: Map<string, FutureFlightData[]>;
    byCity: Map<string, FutureFlightData[]>;
    hourlyDistribution: Map<number, number>;
    timeSlots: {
      morning: FutureFlightData[];
      afternoon: FutureFlightData[];
      evening: FutureFlightData[];
    };
    statistics: {
      total: number;
      carriers: number;
      destinations: number;
      codeshare: number;
      carrierStats: Map<string, any>;
      popularRoutes: Array<any>;
    };
  }> {
    const flights = await this.client.getFutureDepartures(airportCode, date);
    const sorted = FutureFlightDataProcessor.sortByDepartureTime(flights);
    const carrierStats = FutureFlightDataProcessor.getCarrierStatistics(flights);
    const popularRoutes = FutureFlightDataProcessor.getPopularRoutes(flights);
    
    return {
      flights,
      sorted,
      byCarrier: FutureFlightDataProcessor.groupByCarrier(flights),
      byCity: FutureFlightDataProcessor.groupByCity(flights),
      hourlyDistribution: FutureFlightDataProcessor.getHourlyDistribution(flights, 'departure'),
      timeSlots: {
        morning: FutureFlightDataProcessor.getMorningFlights(flights, 'departure'),
        afternoon: FutureFlightDataProcessor.getAfternoonFlights(flights, 'departure'),
        evening: FutureFlightDataProcessor.getEveningFlights(flights, 'departure'),
      },
      statistics: {
        total: flights.length,
        carriers: FutureFlightDataProcessor.groupByCarrier(flights).size,
        destinations: FutureFlightDataProcessor.groupByCity(flights).size,
        codeshare: FutureFlightDataProcessor.getCodeshareFlights(flights).length,
        carrierStats,
        popularRoutes,
      },
    };
  }

  /**
   * Get future arrivals with analysis
   */
  async getFutureArrivalsAnalysis(
    airportCode: string,
    date: string
  ): Promise<{
    flights: FutureFlightData[];
    sorted: FutureFlightData[];
    byCarrier: Map<string, FutureFlightData[]>;
    byCity: Map<string, FutureFlightData[]>;
    hourlyDistribution: Map<number, number>;
    timeSlots: {
      morning: FutureFlightData[];
      afternoon: FutureFlightData[];
      evening: FutureFlightData[];
    };
    statistics: {
      total: number;
      carriers: number;
      origins: number;
      codeshare: number;
    };
  }> {
    const flights = await this.client.getFutureArrivals(airportCode, date);
    const sorted = FutureFlightDataProcessor.sortByArrivalTime(flights);
    
    return {
      flights,
      sorted,
      byCarrier: FutureFlightDataProcessor.groupByCarrier(flights),
      byCity: FutureFlightDataProcessor.groupByCity(flights),
      hourlyDistribution: FutureFlightDataProcessor.getHourlyDistribution(flights, 'arrival'),
      timeSlots: {
        morning: FutureFlightDataProcessor.getMorningFlights(flights, 'arrival'),
        afternoon: FutureFlightDataProcessor.getAfternoonFlights(flights, 'arrival'),
        evening: FutureFlightDataProcessor.getEveningFlights(flights, 'arrival'),
      },
      statistics: {
        total: flights.length,
        carriers: FutureFlightDataProcessor.groupByCarrier(flights).size,
        origins: FutureFlightDataProcessor.groupByCity(flights).size,
        codeshare: FutureFlightDataProcessor.getCodeshareFlights(flights).length,
      },
    };
  }

  /**
   * Get future flights for date range
   */
  async getFutureFlightsRange(
    airportCode: string,
    type: 'departure' | 'arrival',
    startDate: string,
    endDate: string
  ): Promise<{
    flightsByDate: Map<string, FutureFlightData[]>;
    totals: Map<string, number>;
    grandTotal: number;
    dateRange: string[];
  }> {
    const flightsByDate = await this.client.getFutureFlightsRange(
      airportCode,
      type,
      startDate,
      endDate
    );
    
    const totals = new Map<string, number>();
    let grandTotal = 0;
    const dateRange: string[] = [];
    
    flightsByDate.forEach((flights, date) => {
      totals.set(date, flights.length);
      grandTotal += flights.length;
      dateRange.push(date);
    });
    
    return {
      flightsByDate,
      totals,
      grandTotal,
      dateRange: dateRange.sort(),
    };
  }

  /**
   * Compare future schedules between dates
   */
  async compareFutureSchedules(
    airportCode: string,
    type: 'departure' | 'arrival',
    date1: string,
    date2: string
  ): Promise<{
    date1: {
      date: string;
      flights: FutureFlightData[];
      carriers: Set<string>;
      destinations: Set<string>;
    };
    date2: {
      date: string;
      flights: FutureFlightData[];
      carriers: Set<string>;
      destinations: Set<string>;
    };
    comparison: {
      flightDifference: number;
      commonCarriers: Set<string>;
      uniqueCarriersDate1: Set<string>;
      uniqueCarriersDate2: Set<string>;
      commonDestinations: Set<string>;
      uniqueDestinationsDate1: Set<string>;
      uniqueDestinationsDate2: Set<string>;
    };
  }> {
    const [flights1, flights2] = await Promise.all([
      this.getFutureFlights({ iataCode: airportCode, type, date: date1 } as FutureFlightQueryParams),
      this.getFutureFlights({ iataCode: airportCode, type, date: date2 } as FutureFlightQueryParams)
    ]);
    
    const carriers1 = new Set(flights1.map(f => f.carrier.fs));
    const carriers2 = new Set(flights2.map(f => f.carrier.fs));
    const destinations1 = new Set(flights1.map(f => f.airport.city));
    const destinations2 = new Set(flights2.map(f => f.airport.city));
    
    const commonCarriers = new Set([...carriers1].filter(c => carriers2.has(c)));
    const commonDestinations = new Set([...destinations1].filter(d => destinations2.has(d)));
    
    return {
      date1: {
        date: date1,
        flights: flights1,
        carriers: carriers1,
        destinations: destinations1,
      },
      date2: {
        date: date2,
        flights: flights2,
        carriers: carriers2,
        destinations: destinations2,
      },
      comparison: {
        flightDifference: flights2.length - flights1.length,
        commonCarriers,
        uniqueCarriersDate1: new Set([...carriers1].filter(c => !carriers2.has(c))),
        uniqueCarriersDate2: new Set([...carriers2].filter(c => !carriers1.has(c))),
        commonDestinations,
        uniqueDestinationsDate1: new Set([...destinations1].filter(d => !destinations2.has(d))),
        uniqueDestinationsDate2: new Set([...destinations2].filter(d => !destinations1.has(d))),
      },
    };
  }

  /**
   * Get delayed flights with caching
   */
  async getDelayedFlights(params: FlightDelayQueryParams): Promise<FlightDelayData[]> {
    // Check cache first
    if (this.cache) {
      const cacheKey = { ...params, endpoint: 'delays' };
      const cachedData = this.cache.get(cacheKey as any);
      if (cachedData) {
        return cachedData as any as FlightDelayData[];
      }
    }

    // Fetch from API
    const data = await this.client.getDelayedFlights(params);

    // Store in cache
    if (this.cache && data.length > 0) {
      const cacheKey = { ...params, endpoint: 'delays' };
      this.cache.set(cacheKey as any, data as any);
    }

    return data;
  }

  /**
   * Get delayed departures with analysis
   */
  async getDelayedDeparturesAnalysis(
    airportCode: string,
    minimumDelay: number,
    filters: Omit<FlightDelayQueryParams, 'delay' | 'type' | 'dep_iata' | 'access_key'> = {}
  ): Promise<{
    flights: FlightDelayData[];
    sorted: FlightDelayData[];
    active: FlightDelayData[];
    byAirline: Map<string, FlightDelayData[]>;
    byCategory: Map<string, FlightDelayData[]>;
    statistics: ReturnType<typeof DelayDataProcessor.calculateDelayStatistics>;
    worstDelays: FlightDelayData[];
    airlinePerformance: Map<string, any>;
  }> {
    const flights = await this.client.getDelayedDepartures(airportCode, minimumDelay, filters);
    const sorted = DelayDataProcessor.sortByDelayTime(flights);
    const active = DelayDataProcessor.getActiveDelays(flights);
    const statistics = DelayDataProcessor.calculateDelayStatistics(flights);
    const worstDelays = DelayDataProcessor.getWorstDelays(flights, 5);
    const airlinePerformance = DelayDataProcessor.calculateAirlineDelayPerformance(flights);
    
    return {
      flights,
      sorted,
      active,
      byAirline: DelayDataProcessor.groupByAirline(flights),
      byCategory: DelayDataProcessor.groupByDelayCategory(flights),
      statistics,
      worstDelays,
      airlinePerformance,
    };
  }

  /**
   * Get delayed arrivals with analysis
   */
  async getDelayedArrivalsAnalysis(
    airportCode: string,
    minimumDelay: number,
    filters: Omit<FlightDelayQueryParams, 'delay' | 'type' | 'arr_iata' | 'access_key'> = {}
  ): Promise<{
    flights: FlightDelayData[];
    sorted: FlightDelayData[];
    active: FlightDelayData[];
    byOriginAirport: Map<string, FlightDelayData[]>;
    byCategory: Map<string, FlightDelayData[]>;
    statistics: ReturnType<typeof DelayDataProcessor.calculateDelayStatistics>;
    worstDelays: FlightDelayData[];
    delayTrends: Map<string, number>;
  }> {
    const flights = await this.client.getDelayedArrivals(airportCode, minimumDelay, filters);
    const sorted = DelayDataProcessor.sortByDelayTime(flights);
    const active = DelayDataProcessor.getActiveDelays(flights);
    const statistics = DelayDataProcessor.calculateDelayStatistics(flights);
    const worstDelays = DelayDataProcessor.getWorstDelays(flights, 5);
    
    // Calculate delay trends
    const delayTrends = new Map<string, number>();
    flights.forEach(flight => {
      const trend = DelayDataProcessor.getDelayTrend(flight);
      delayTrends.set(trend, (delayTrends.get(trend) || 0) + 1);
    });
    
    return {
      flights,
      sorted,
      active,
      byOriginAirport: DelayDataProcessor.groupByDepartureAirport(flights),
      byCategory: DelayDataProcessor.groupByDelayCategory(flights),
      statistics,
      worstDelays,
      delayTrends,
    };
  }

  /**
   * Get airline delay analysis
   */
  async getAirlineDelayAnalysis(
    airlineIata: string,
    minimumDelay: number,
    type: 'departures' | 'arrivals',
    filters: Omit<FlightDelayQueryParams, 'delay' | 'type' | 'airline_iata' | 'access_key'> = {}
  ): Promise<{
    flights: FlightDelayData[];
    sorted: FlightDelayData[];
    byRoute: Map<string, FlightDelayData[]>;
    byCategory: Map<string, FlightDelayData[]>;
    statistics: ReturnType<typeof DelayDataProcessor.calculateDelayStatistics>;
    estimatedCosts: {
      total: number;
      perFlight: number;
      breakdown: Array<{
        flight: string;
        delay: number;
        cost: ReturnType<typeof DelayDataProcessor.estimateDelayCost>;
      }>;
    };
  }> {
    const flights = await this.client.getDelayedFlightsByAirline(
      airlineIata,
      minimumDelay,
      type,
      filters
    );
    const sorted = DelayDataProcessor.sortByDelayTime(flights);
    const statistics = DelayDataProcessor.calculateDelayStatistics(flights);
    
    // Group by route
    const byRoute = new Map<string, FlightDelayData[]>();
    flights.forEach(flight => {
      const route = `${flight.dep_iata}-${flight.arr_iata}`;
      if (!byRoute.has(route)) {
        byRoute.set(route, []);
      }
      byRoute.get(route)!.push(flight);
    });
    
    // Calculate estimated costs
    let totalCost = 0;
    const costBreakdown = flights.map(flight => {
      const cost = DelayDataProcessor.estimateDelayCost(flight.delayed);
      totalCost += cost.totalCost;
      return {
        flight: flight.flight_iata,
        delay: flight.delayed,
        cost,
      };
    });
    
    return {
      flights,
      sorted,
      byRoute,
      byCategory: DelayDataProcessor.groupByDelayCategory(flights),
      statistics,
      estimatedCosts: {
        total: totalCost,
        perFlight: flights.length > 0 ? Math.round(totalCost / flights.length) : 0,
        breakdown: costBreakdown.slice(0, 10), // Top 10 most costly
      },
    };
  }

  /**
   * Get route delay analysis
   */
  async getRouteDelayAnalysis(
    depIata: string,
    arrIata: string,
    minimumDelay: number,
    type: 'departures' | 'arrivals' = 'departures'
  ): Promise<{
    flights: FlightDelayData[];
    sorted: FlightDelayData[];
    byAirline: Map<string, FlightDelayData[]>;
    statistics: ReturnType<typeof DelayDataProcessor.calculateDelayStatistics>;
    airlineComparison: Array<{
      airline: string;
      flights: number;
      averageDelay: number;
      reliability: number;
    }>;
  }> {
    const flights = await this.client.getDelayedFlightsOnRoute(
      depIata,
      arrIata,
      minimumDelay,
      type
    );
    const sorted = DelayDataProcessor.sortByDelayTime(flights);
    const byAirline = DelayDataProcessor.groupByAirline(flights);
    const statistics = DelayDataProcessor.calculateDelayStatistics(flights);
    
    // Compare airline performance on this route
    const airlineComparison: Array<any> = [];
    byAirline.forEach((airlineFlights, iata) => {
      const stats = DelayDataProcessor.calculateDelayStatistics(airlineFlights);
      airlineComparison.push({
        airline: iata,
        flights: airlineFlights.length,
        averageDelay: stats.averageDelay,
        reliability: 100 - ((stats.byCategory.get('major') || 0) + (stats.byCategory.get('severe') || 0)) / airlineFlights.length * 100,
      });
    });
    
    // Sort by reliability
    airlineComparison.sort((a, b) => b.reliability - a.reliability);
    
    return {
      flights,
      sorted,
      byAirline,
      statistics,
      airlineComparison,
    };
  }

  /**
   * Get specific flight delay history
   */
  async getFlightDelayHistory(
    flightIata: string,
    minimumDelay: number = 1,
    type: 'departures' | 'arrivals' = 'departures'
  ): Promise<{
    flights: FlightDelayData[];
    sorted: FlightDelayData[];
    statistics: ReturnType<typeof DelayDataProcessor.calculateDelayStatistics>;
    delayPattern: {
      improving: number;
      worsening: number;
      stable: number;
      unknown: number;
    };
    formatted: Array<ReturnType<typeof DelayDataProcessor.formatDelayedFlight>>;
  }> {
    const flights = await this.client.getDelayedFlight(flightIata, minimumDelay, type);
    const sorted = DelayDataProcessor.sortByDelayTime(flights);
    const statistics = DelayDataProcessor.calculateDelayStatistics(flights);
    
    // Analyze delay patterns
    const delayPattern = {
      improving: 0,
      worsening: 0,
      stable: 0,
      unknown: 0,
    };
    
    flights.forEach(flight => {
      const trend = DelayDataProcessor.getDelayTrend(flight);
      delayPattern[trend]++;
    });
    
    // Format top delays
    const formatted = sorted
      .slice(0, 5)
      .map(flight => DelayDataProcessor.formatDelayedFlight(flight));
    
    return {
      flights,
      sorted,
      statistics,
      delayPattern,
      formatted,
    };
  }

  /**
   * Monitor severe delays across the network
   */
  async getNetworkDelayMonitor(
    minimumDelay: number = 60,
    type: 'departures' | 'arrivals' = 'departures',
    filters: Omit<FlightDelayQueryParams, 'delay' | 'type' | 'access_key'> = {}
  ): Promise<{
    totalDelays: number;
    severeDelays: number;
    affectedAirports: Map<string, number>;
    affectedAirlines: Map<string, number>;
    statistics: ReturnType<typeof DelayDataProcessor.calculateDelayStatistics>;
    costEstimate: {
      totalCost: number;
      averageCostPerDelay: number;
    };
  }> {
    const flights = await this.getDelayedFlights({
      delay: minimumDelay,
      type,
      ...filters,
    } as FlightDelayQueryParams);
    
    const statistics = DelayDataProcessor.calculateDelayStatistics(flights);
    const severeDelays = flights.filter(f => f.delayed >= 120).length;
    
    // Count affected airports
    const affectedDepartureAirports = DelayDataProcessor.groupByDepartureAirport(flights);
    const affectedArrivalAirports = DelayDataProcessor.groupByArrivalAirport(flights);
    const affectedAirports = new Map<string, number>();
    
    affectedDepartureAirports.forEach((flights, airport) => {
      affectedAirports.set(airport, flights.length);
    });
    
    affectedArrivalAirports.forEach((flights, airport) => {
      affectedAirports.set(airport, (affectedAirports.get(airport) || 0) + flights.length);
    });
    
    // Count affected airlines
    const affectedAirlines = new Map<string, number>();
    const airlineGroups = DelayDataProcessor.groupByAirline(flights);
    airlineGroups.forEach((flights, airline) => {
      affectedAirlines.set(airline, flights.length);
    });
    
    // Estimate total cost
    let totalCost = 0;
    flights.forEach(flight => {
      const cost = DelayDataProcessor.estimateDelayCost(flight.delayed);
      totalCost += cost.totalCost;
    });
    
    return {
      totalDelays: flights.length,
      severeDelays,
      affectedAirports,
      affectedAirlines,
      statistics,
      costEstimate: {
        totalCost,
        averageCostPerDelay: flights.length > 0 ? Math.round(totalCost / flights.length) : 0,
      },
    };
  }

  /**
   * Get flight information by flight number with caching
   */
  async getFlightByNumber(
    flightNumber: string,
    date?: string
  ): Promise<FlightByNumberData[]> {
    // Check cache first
    if (this.cache) {
      const cacheKey = { flight_number: flightNumber, date, endpoint: 'flight-by-number' };
      const cachedData = this.cache.get(cacheKey as any);
      if (cachedData) {
        return cachedData as any as FlightByNumberData[];
      }
    }

    // Fetch from API
    const data = await this.client.getFlightByNumber(flightNumber, date);

    // Store in cache
    if (this.cache && data.length > 0) {
      const cacheKey = { flight_number: flightNumber, date, endpoint: 'flight-by-number' };
      this.cache.set(cacheKey as any, data as any);
    }

    return data;
  }

  /**
   * Get flight by number with analysis
   */
  async getFlightByNumberAnalysis(
    flightNumber: string,
    date?: string
  ): Promise<{
    flights: FlightByNumberData[];
    sorted: FlightByNumberData[];
    formatted: Array<ReturnType<typeof FlightByNumberProcessor.formatFlightInfo>>;
    statistics: ReturnType<typeof FlightByNumberProcessor.getStatistics>;
    byDate: Map<string, FlightByNumberData[]>;
    byStatus: Map<string, FlightByNumberData[]>;
    byAircraft: Map<string, FlightByNumberData[]>;
    routes: Array<{ from: string; to: string; count: number }>;
    nextFlight: FlightByNumberData | null;
  }> {
    const flights = await this.getFlightByNumber(flightNumber, date);
    const sorted = FlightByNumberProcessor.sortByDate(flights);
    const formatted = flights.map(f => FlightByNumberProcessor.formatFlightInfo(f));
    const statistics = FlightByNumberProcessor.getStatistics(flights);
    
    return {
      flights,
      sorted,
      formatted,
      statistics,
      byDate: FlightByNumberProcessor.groupByDate(flights),
      byStatus: FlightByNumberProcessor.groupByStatus(flights),
      byAircraft: FlightByNumberProcessor.groupByAircraft(flights),
      routes: FlightByNumberProcessor.getUniqueRoutes(flights),
      nextFlight: FlightByNumberProcessor.getNextScheduledFlight(flights),
    };
  }

  /**
   * Get flight schedule for specific date
   */
  async getFlightByNumberOnDate(
    flightNumber: string,
    date: string
  ): Promise<{
    flights: FlightByNumberData[];
    sorted: FlightByNumberData[];
    scheduled: FlightByNumberData[];
    landed: FlightByNumberData[];
    cancelled: FlightByNumberData[];
    formatted: Array<ReturnType<typeof FlightByNumberProcessor.formatFlightInfo>>;
    byRoute: Map<string, number>;
  }> {
    const flights = await this.getFlightByNumber(flightNumber, date);
    const sorted = FlightByNumberProcessor.sortByDepartureTime(flights);
    const scheduled = FlightByNumberProcessor.getScheduledFlights(flights);
    const landed = FlightByNumberProcessor.getLandedFlights(flights);
    const cancelled = FlightByNumberProcessor.getCancelledFlights(flights);
    
    // Count by route
    const byRoute = new Map<string, number>();
    flights.forEach(flight => {
      const route = `${flight.FROM}-${flight.TO}`;
      byRoute.set(route, (byRoute.get(route) || 0) + 1);
    });
    
    return {
      flights,
      sorted,
      scheduled,
      landed,
      cancelled,
      formatted: sorted.map(f => FlightByNumberProcessor.formatFlightInfo(f)),
      byRoute,
    };
  }

  /**
   * Track flight number over date range
   */
  async trackFlightNumberDateRange(
    flightNumber: string,
    startDate: string,
    endDate: string
  ): Promise<{
    flightsByDate: Map<string, FlightByNumberData[]>;
    totalFlights: number;
    statistics: {
      scheduled: number;
      landed: number;
      cancelled: number;
      routes: Array<{ from: string; to: string; count: number }>;
      aircraftTypes: Map<string, number>;
      averageFlightTime: number | null;
    };
    dateRange: string[];
    weekdayDistribution: Map<number, number>;
  }> {
    const flightsByDate = await this.client.getFlightByNumberDateRange(
      flightNumber,
      startDate,
      endDate
    );
    
    // Aggregate all flights
    const allFlights: FlightByNumberData[] = [];
    flightsByDate.forEach(flights => {
      allFlights.push(...flights);
    });
    
    const statistics = FlightByNumberProcessor.getStatistics(allFlights);
    
    // Calculate weekday distribution
    const weekdayDistribution = new Map<number, number>();
    for (let i = 0; i < 7; i++) {
      weekdayDistribution.set(i, 0);
    }
    
    allFlights.forEach(flight => {
      const date = FlightByNumberProcessor.parseDate(flight.DATE);
      if (date) {
        const weekday = date.getDay();
        weekdayDistribution.set(weekday, (weekdayDistribution.get(weekday) || 0) + 1);
      }
    });
    
    return {
      flightsByDate,
      totalFlights: allFlights.length,
      statistics: {
        scheduled: statistics.scheduled,
        landed: statistics.landed,
        cancelled: statistics.cancelled,
        routes: FlightByNumberProcessor.getUniqueRoutes(allFlights),
        aircraftTypes: statistics.aircraftTypes,
        averageFlightTime: statistics.averageFlightTime,
      },
      dateRange: Array.from(flightsByDate.keys()).sort(),
      weekdayDistribution,
    };
  }

  /**
   * Compare flight number performance between dates
   */
  async compareFlightNumberPerformance(
    flightNumber: string,
    date1: string,
    date2: string
  ): Promise<{
    date1: {
      date: string;
      flights: FlightByNumberData[];
      statistics: ReturnType<typeof FlightByNumberProcessor.getStatistics>;
      onTimeCount: number;
    };
    date2: {
      date: string;
      flights: FlightByNumberData[];
      statistics: ReturnType<typeof FlightByNumberProcessor.getStatistics>;
      onTimeCount: number;
    };
    comparison: {
      totalFlightsDiff: number;
      cancelledDiff: number;
      commonRoutes: Array<string>;
      uniqueRoutesDate1: Array<string>;
      uniqueRoutesDate2: Array<string>;
      aircraftChanges: Map<string, { date1: number; date2: number }>;
    };
  }> {
    const [flights1, flights2] = await Promise.all([
      this.getFlightByNumber(flightNumber, date1),
      this.getFlightByNumber(flightNumber, date2)
    ]);
    
    const stats1 = FlightByNumberProcessor.getStatistics(flights1);
    const stats2 = FlightByNumberProcessor.getStatistics(flights2);
    
    // Count on-time (not cancelled)
    const onTime1 = flights1.filter(f => f.STATUS.toLowerCase() !== 'cancelled').length;
    const onTime2 = flights2.filter(f => f.STATUS.toLowerCase() !== 'cancelled').length;
    
    // Compare routes
    const routes1 = new Set(FlightByNumberProcessor.getUniqueRoutes(flights1).map(r => `${r.from}-${r.to}`));
    const routes2 = new Set(FlightByNumberProcessor.getUniqueRoutes(flights2).map(r => `${r.from}-${r.to}`));
    
    const commonRoutes = Array.from(routes1).filter(r => routes2.has(r));
    const uniqueRoutesDate1 = Array.from(routes1).filter(r => !routes2.has(r));
    const uniqueRoutesDate2 = Array.from(routes2).filter(r => !routes1.has(r));
    
    // Compare aircraft usage
    const aircraftChanges = new Map<string, { date1: number; date2: number }>();
    stats1.aircraftTypes.forEach((count, aircraft) => {
      aircraftChanges.set(aircraft, { date1: count, date2: 0 });
    });
    stats2.aircraftTypes.forEach((count, aircraft) => {
      const existing = aircraftChanges.get(aircraft);
      if (existing) {
        existing.date2 = count;
      } else {
        aircraftChanges.set(aircraft, { date1: 0, date2: count });
      }
    });
    
    return {
      date1: {
        date: date1,
        flights: flights1,
        statistics: stats1,
        onTimeCount: onTime1,
      },
      date2: {
        date: date2,
        flights: flights2,
        statistics: stats2,
        onTimeCount: onTime2,
      },
      comparison: {
        totalFlightsDiff: stats2.total - stats1.total,
        cancelledDiff: stats2.cancelled - stats1.cancelled,
        commonRoutes,
        uniqueRoutesDate1,
        uniqueRoutesDate2,
        aircraftChanges,
      },
    };
  }

  /**
   * Get flight number weekly pattern
   */
  async getFlightNumberWeeklyPattern(
    flightNumber: string
  ): Promise<{
    flights: FlightByNumberData[];
    weekdayPattern: Map<number, {
      day: string;
      count: number;
      scheduled: number;
      landed: number;
      cancelled: number;
      routes: Array<string>;
    }>;
    mostFrequentDay: { day: string; weekday: number; count: number };
    leastFrequentDay: { day: string; weekday: number; count: number };
  }> {
    const flights = await this.getFlightByNumber(flightNumber);
    
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayPattern = new Map<number, any>();
    
    // Initialize pattern
    for (let i = 0; i < 7; i++) {
      weekdayPattern.set(i, {
        day: weekdays[i],
        count: 0,
        scheduled: 0,
        landed: 0,
        cancelled: 0,
        routes: new Set<string>(),
      });
    }
    
    // Process flights
    flights.forEach(flight => {
      const date = FlightByNumberProcessor.parseDate(flight.DATE);
      if (!date) return;
      
      const weekday = date.getDay();
      const pattern = weekdayPattern.get(weekday)!;
      
      pattern.count++;
      
      const status = flight.STATUS.toLowerCase();
      if (status === 'scheduled') pattern.scheduled++;
      else if (status === 'landed') pattern.landed++;
      else if (status === 'cancelled') pattern.cancelled++;
      
      pattern.routes.add(`${flight.FROM}-${flight.TO}`);
    });
    
    // Convert route sets to arrays
    weekdayPattern.forEach(pattern => {
      pattern.routes = Array.from(pattern.routes);
    });
    
    // Find most and least frequent days
    let mostFrequent = { day: '', weekday: 0, count: 0 };
    let leastFrequent = { day: '', weekday: 0, count: Infinity };
    
    weekdayPattern.forEach((pattern, weekday) => {
      if (pattern.count > mostFrequent.count) {
        mostFrequent = { day: pattern.day, weekday, count: pattern.count };
      }
      if (pattern.count < leastFrequent.count && pattern.count > 0) {
        leastFrequent = { day: pattern.day, weekday, count: pattern.count };
      }
    });
    
    // Handle case where no flights found
    if (leastFrequent.count === Infinity) {
      leastFrequent = { day: 'None', weekday: -1, count: 0 };
    }
    
    return {
      flights,
      weekdayPattern,
      mostFrequentDay: mostFrequent,
      leastFrequentDay: leastFrequent,
    };
  }

  /**
   * Search multiple flight numbers
   */
  async searchMultipleFlightNumbers(
    flightNumbers: string[],
    date?: string
  ): Promise<Map<string, {
    flightNumber: string;
    flights: FlightByNumberData[];
    statistics: ReturnType<typeof FlightByNumberProcessor.getStatistics>;
    routes: Array<{ from: string; to: string; count: number }>;
    error?: string;
  }>> {
    const results = new Map<string, any>();
    
    // Fetch all flight numbers in parallel
    const promises = flightNumbers.map(async (flightNumber) => {
      try {
        const flights = await this.getFlightByNumber(flightNumber, date);
        const statistics = FlightByNumberProcessor.getStatistics(flights);
        const routes = FlightByNumberProcessor.getUniqueRoutes(flights);
        
        return {
          flightNumber,
          flights,
          statistics,
          routes,
        };
      } catch (error) {
        return {
          flightNumber,
          flights: [],
          statistics: FlightByNumberProcessor.getStatistics([]),
          routes: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
    
    const allResults = await Promise.all(promises);
    
    allResults.forEach(result => {
      results.set(result.flightNumber, result);
    });
    
    return results;
  }

  /**
   * Get flight prices/itineraries with caching
   */
  async getFlightPrices(params: FlightPriceQueryParams): Promise<FlightPriceResponse> {
    // Check cache first
    if (this.cache) {
      const cacheKey = { ...params, endpoint: 'flight-prices' };
      const cachedData = this.cache.get(cacheKey as any);
      if (cachedData) {
        return cachedData as any as FlightPriceResponse;
      }
    }

    // Fetch from API
    const data = await this.client.getFlightPrices(params);

    // Store in cache
    if (this.cache && data.itineraries.length > 0) {
      const cacheKey = { ...params, endpoint: 'flight-prices' };
      this.cache.set(cacheKey as any, data as any);
    }

    return data;
  }

  /**
   * Get one-way flight prices with analysis
   */
  async getOneWayFlightPricesAnalysis(
    origin: { skyId: string; entityId: string },
    destination: { skyId: string; entityId: string },
    date: string,
    options: Omit<FlightPriceQueryParams, 'access_key' | 'originSkyId' | 'destinationSkyId' | 
                 'originEntityId' | 'destinationEntityId' | 'date'> = {}
  ): Promise<{
    response: FlightPriceResponse;
    itineraries: FlightItinerary[];
    cheapest: FlightItinerary | null;
    fastest: FlightItinerary | null;
    bestValue: FlightItinerary | null;
    directFlights: FlightItinerary[];
    statistics: ReturnType<typeof FlightPriceProcessor.getStatistics>;
    byAirline: Map<string, FlightItinerary[]>;
    formatted: string[];
  }> {
    const response = await this.client.getOneWayFlightPrices(origin, destination, date, options);
    const itineraries = response.itineraries;
    
    // Find special flights
    const cheapest = itineraries.length > 0 ? 
      FlightPriceProcessor.sortByPrice(itineraries)[0] : null;
    const fastest = itineraries.length > 0 ? 
      FlightPriceProcessor.sortByDuration(itineraries)[0] : null;
    const bestValue = FlightPriceProcessor.findBestValue(itineraries);
    const directFlights = FlightPriceProcessor.filterDirectFlightsOnly(itineraries);
    
    // Get statistics
    const statistics = FlightPriceProcessor.getStatistics(itineraries);
    
    // Group by airline
    const byAirline = new Map<string, FlightItinerary[]>();
    itineraries.forEach(itinerary => {
      itinerary.legs.forEach(leg => {
        leg.carriers.marketing.forEach(carrier => {
          if (!byAirline.has(carrier.name)) {
            byAirline.set(carrier.name, []);
          }
          byAirline.get(carrier.name)!.push(itinerary);
        });
      });
    });
    
    // Format top results
    const formatted = itineraries.slice(0, 5).map(i => 
      FlightPriceProcessor.formatItinerarySummary(i)
    );
    
    return {
      response,
      itineraries,
      cheapest,
      fastest,
      bestValue,
      directFlights,
      statistics,
      byAirline,
      formatted,
    };
  }

  /**
   * Get round-trip flight prices with analysis
   */
  async getRoundTripFlightPricesAnalysis(
    origin: { skyId: string; entityId: string },
    destination: { skyId: string; entityId: string },
    departureDate: string,
    returnDate: string,
    options: Omit<FlightPriceQueryParams, 'access_key' | 'originSkyId' | 'destinationSkyId' | 
                 'originEntityId' | 'destinationEntityId' | 'date' | 'returnDate'> = {}
  ): Promise<{
    response: FlightPriceResponse;
    itineraries: FlightItinerary[];
    cheapest: FlightItinerary | null;
    fastest: FlightItinerary | null;
    bestValue: FlightItinerary | null;
    directFlights: FlightItinerary[];
    statistics: ReturnType<typeof FlightPriceProcessor.getStatistics>;
    byAlliance: Map<string, FlightItinerary[]>;
    overnightLayovers: FlightItinerary[];
  }> {
    const response = await this.client.getRoundTripFlightPrices(
      origin, destination, departureDate, returnDate, options
    );
    const itineraries = response.itineraries;
    
    // Find special flights
    const cheapest = itineraries.length > 0 ? 
      FlightPriceProcessor.sortByPrice(itineraries)[0] : null;
    const fastest = itineraries.length > 0 ? 
      FlightPriceProcessor.sortByDuration(itineraries)[0] : null;
    const bestValue = FlightPriceProcessor.findBestValue(itineraries);
    const directFlights = FlightPriceProcessor.filterDirectFlightsOnly(itineraries);
    
    // Get statistics
    const statistics = FlightPriceProcessor.getStatistics(itineraries);
    
    // Group by alliance
    const byAlliance = FlightPriceProcessor.groupByAlliance(itineraries);
    
    // Find overnight layovers
    const overnightLayovers = itineraries.filter(i => 
      FlightPriceProcessor.hasOvernightLayover(i)
    );
    
    return {
      response,
      itineraries,
      cheapest,
      fastest,
      bestValue,
      directFlights,
      statistics,
      byAlliance,
      overnightLayovers,
    };
  }

  /**
   * Search flights with price filters
   */
  async searchFlightsByPriceRange(
    origin: { skyId: string; entityId: string },
    destination: { skyId: string; entityId: string },
    date: string,
    maxPrice: number,
    options: Omit<FlightPriceQueryParams, 'access_key' | 'originSkyId' | 'destinationSkyId' | 
                 'originEntityId' | 'destinationEntityId' | 'date'> = {}
  ): Promise<{
    allItineraries: FlightItinerary[];
    filteredItineraries: FlightItinerary[];
    statistics: {
      total: number;
      withinBudget: number;
      percentageWithinBudget: number;
      cheapestPrice: number;
      averagePrice: number;
    };
    byStops: Map<number, FlightItinerary[]>;
  }> {
    const response = await this.client.getOneWayFlightPrices(origin, destination, date, options);
    const allItineraries = response.itineraries;
    const filteredItineraries = FlightPriceProcessor.filterByMaxPrice(allItineraries, maxPrice);
    
    // Calculate statistics
    const stats = FlightPriceProcessor.getStatistics(allItineraries);
    const statistics = {
      total: allItineraries.length,
      withinBudget: filteredItineraries.length,
      percentageWithinBudget: allItineraries.length > 0 ? 
        Math.round((filteredItineraries.length / allItineraries.length) * 100) : 0,
      cheapestPrice: stats.priceRange.min,
      averagePrice: Math.round(stats.priceRange.average),
    };
    
    // Group by stops
    const byStops = new Map<number, FlightItinerary[]>();
    filteredItineraries.forEach(itinerary => {
      const stops = FlightPriceProcessor.getTotalStops(itinerary);
      if (!byStops.has(stops)) {
        byStops.set(stops, []);
      }
      byStops.get(stops)!.push(itinerary);
    });
    
    return {
      allItineraries,
      filteredItineraries,
      statistics,
      byStops,
    };
  }

  /**
   * Get morning flights
   */
  async getMorningFlights(
    origin: { skyId: string; entityId: string },
    destination: { skyId: string; entityId: string },
    date: string,
    options: Omit<FlightPriceQueryParams, 'access_key' | 'originSkyId' | 'destinationSkyId' | 
                 'originEntityId' | 'destinationEntityId' | 'date'> = {}
  ): Promise<{
    itineraries: FlightItinerary[];
    sorted: FlightItinerary[];
    statistics: ReturnType<typeof FlightPriceProcessor.getStatistics>;
    earliestDeparture: FlightItinerary | null;
    bestMorningValue: FlightItinerary | null;
  }> {
    const response = await this.client.getOneWayFlightPrices(origin, destination, date, options);
    
    // Filter morning flights (6 AM - 12 PM)
    const morningFlights = FlightPriceProcessor.filterByDepartureTime(
      response.itineraries, '06:00', '12:00'
    );
    
    const sorted = FlightPriceProcessor.sortByPrice(morningFlights);
    const statistics = FlightPriceProcessor.getStatistics(morningFlights);
    
    // Find earliest departure
    const earliestDeparture = morningFlights.length > 0 ?
      morningFlights.reduce((earliest, current) => {
        const earliestTime = new Date(earliest.legs[0].departure);
        const currentTime = new Date(current.legs[0].departure);
        return currentTime < earliestTime ? current : earliest;
      }) : null;
    
    const bestMorningValue = FlightPriceProcessor.findBestValue(morningFlights);
    
    return {
      itineraries: morningFlights,
      sorted,
      statistics,
      earliestDeparture,
      bestMorningValue,
    };
  }

  /**
   * Compare flight prices across dates
   */
  async compareFlightPricesAcrossDates(
    origin: { skyId: string; entityId: string },
    destination: { skyId: string; entityId: string },
    dates: string[],
    options: Omit<FlightPriceQueryParams, 'access_key' | 'originSkyId' | 'destinationSkyId' | 
                 'originEntityId' | 'destinationEntityId' | 'date'> = {}
  ): Promise<Map<string, {
    date: string;
    itineraries: FlightItinerary[];
    cheapest: FlightItinerary | null;
    averagePrice: number;
    directFlightCount: number;
    totalFlights: number;
  }>> {
    const results = new Map<string, any>();
    
    // Fetch prices for all dates in parallel
    const promises = dates.map(async (date) => {
      try {
        const response = await this.client.getOneWayFlightPrices(
          origin, destination, date, options
        );
        
        const stats = FlightPriceProcessor.getStatistics(response.itineraries);
        const cheapest = response.itineraries.length > 0 ?
          FlightPriceProcessor.sortByPrice(response.itineraries)[0] : null;
        const directFlights = FlightPriceProcessor.filterDirectFlightsOnly(response.itineraries);
        
        return {
          date,
          itineraries: response.itineraries,
          cheapest,
          averagePrice: Math.round(stats.priceRange.average),
          directFlightCount: directFlights.length,
          totalFlights: response.itineraries.length,
        };
      } catch (error) {
        return {
          date,
          itineraries: [],
          cheapest: null,
          averagePrice: 0,
          directFlightCount: 0,
          totalFlights: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
    
    const allResults = await Promise.all(promises);
    
    allResults.forEach(result => {
      results.set(result.date, result);
    });
    
    return results;
  }

  /**
   * Get flights by specific cabin class
   */
  async getFlightsByCabinClassAnalysis(
    origin: { skyId: string; entityId: string },
    destination: { skyId: string; entityId: string },
    date: string,
    cabinClass: 'economy' | 'premium_economy' | 'business' | 'first',
    options: Omit<FlightPriceQueryParams, 'access_key' | 'originSkyId' | 'destinationSkyId' | 
                 'originEntityId' | 'destinationEntityId' | 'date' | 'cabinClass'> = {}
  ): Promise<{
    response: FlightPriceResponse;
    itineraries: FlightItinerary[];
    cheapest: FlightItinerary | null;
    bestValue: FlightItinerary | null;
    statistics: ReturnType<typeof FlightPriceProcessor.getStatistics>;
    airlines: string[];
    directOptions: FlightItinerary[];
  }> {
    const response = await this.client.getFlightsByCabinClass(
      origin, destination, date, cabinClass, options
    );
    
    const itineraries = response.itineraries;
    const cheapest = itineraries.length > 0 ?
      FlightPriceProcessor.sortByPrice(itineraries)[0] : null;
    const bestValue = FlightPriceProcessor.findBestValue(itineraries);
    const statistics = FlightPriceProcessor.getStatistics(itineraries);
    const directOptions = FlightPriceProcessor.filterDirectFlightsOnly(itineraries);
    
    return {
      response,
      itineraries,
      cheapest,
      bestValue,
      statistics,
      airlines: statistics.airlines,
      directOptions,
    };
  }

  /**
   * Get layover analysis for a route
   */
  async getLayoverAnalysis(
    origin: { skyId: string; entityId: string },
    destination: { skyId: string; entityId: string },
    date: string,
    options: Omit<FlightPriceQueryParams, 'access_key' | 'originSkyId' | 'destinationSkyId' | 
                 'originEntityId' | 'destinationEntityId' | 'date'> = {}
  ): Promise<{
    directFlights: FlightItinerary[];
    oneStopFlights: FlightItinerary[];
    multiStopFlights: FlightItinerary[];
    layoverAirports: Map<string, {
      airport: string;
      count: number;
      averageDuration: string;
      flights: FlightItinerary[];
    }>;
    overnightLayovers: FlightItinerary[];
    shortLayovers: Array<{
      itinerary: FlightItinerary;
      layover: { airport: string; duration: string };
    }>;
  }> {
    const response = await this.client.getOneWayFlightPrices(origin, destination, date, options);
    const itineraries = response.itineraries;
    
    // Categorize by stops
    const directFlights = FlightPriceProcessor.filterDirectFlightsOnly(itineraries);
    const oneStopFlights = itineraries.filter(i => 
      FlightPriceProcessor.getTotalStops(i) === 1
    );
    const multiStopFlights = itineraries.filter(i => 
      FlightPriceProcessor.getTotalStops(i) > 1
    );
    
    // Analyze layover airports
    const layoverAirports = new Map<string, any>();
    const shortLayovers: any[] = [];
    
    itineraries.forEach(itinerary => {
      itinerary.legs.forEach(leg => {
        const layovers = FlightPriceProcessor.getLayoverInfo(leg);
        
        layovers.forEach(layover => {
          // Track layover airports
          if (!layoverAirports.has(layover.airport)) {
            layoverAirports.set(layover.airport, {
              airport: layover.airport,
              count: 0,
              totalMinutes: 0,
              flights: [],
            });
          }
          
          const airportData = layoverAirports.get(layover.airport)!;
          airportData.count++;
          airportData.flights.push(itinerary);
          
          // Parse duration
          const match = layover.duration.match(/(\d+)h\s*(\d+)m|(\d+)h|(\d+)m/);
          if (match) {
            const hours = parseInt(match[1] || match[3] || '0');
            const minutes = parseInt(match[2] || match[4] || '0');
            airportData.totalMinutes += hours * 60 + minutes;
          }
          
          // Check for short layovers (< 90 minutes)
          const totalMinutes = (match ? 
            (parseInt(match[1] || match[3] || '0') * 60 + parseInt(match[2] || match[4] || '0')) : 
            0
          );
          
          if (totalMinutes > 0 && totalMinutes < 90) {
            shortLayovers.push({ itinerary, layover });
          }
        });
      });
    });
    
    // Calculate average durations
    layoverAirports.forEach((data, airport) => {
      const avgMinutes = Math.round(data.totalMinutes / data.count);
      data.averageDuration = FlightPriceProcessor.formatDuration(avgMinutes);
      delete data.totalMinutes;
    });
    
    // Find overnight layovers
    const overnightLayovers = itineraries.filter(i => 
      FlightPriceProcessor.hasOvernightLayover(i)
    );
    
    return {
      directFlights,
      oneStopFlights,
      multiStopFlights,
      layoverAirports,
      overnightLayovers,
      shortLayovers,
    };
  }

  /**
   * Get carbon emissions analysis
   */
  async getCarbonEmissionsAnalysis(
    origin: { skyId: string; entityId: string },
    destination: { skyId: string; entityId: string },
    date: string,
    options: Omit<FlightPriceQueryParams, 'access_key' | 'originSkyId' | 'destinationSkyId' | 
                 'originEntityId' | 'destinationEntityId' | 'date'> = {}
  ): Promise<{
    itineraries: Array<{
      itinerary: FlightItinerary;
      emissions: number;
      emissionsPerDollar: number;
    }>;
    lowestEmissions: FlightItinerary | null;
    highestEmissions: FlightItinerary | null;
    averageEmissions: number;
    directFlightEmissions: number;
    bestValueForCarbon: FlightItinerary | null;
  }> {
    const response = await this.client.getOneWayFlightPrices(origin, destination, date, options);
    
    // Calculate emissions for each itinerary
    const withEmissions = response.itineraries.map(itinerary => ({
      itinerary,
      emissions: FlightPriceProcessor.estimateCarbonEmissions(itinerary),
      emissionsPerDollar: FlightPriceProcessor.estimateCarbonEmissions(itinerary) / itinerary.price.raw,
    }));
    
    // Sort by emissions
    const sortedByEmissions = [...withEmissions].sort((a, b) => a.emissions - b.emissions);
    
    const lowestEmissions = sortedByEmissions.length > 0 ? sortedByEmissions[0].itinerary : null;
    const highestEmissions = sortedByEmissions.length > 0 ? 
      sortedByEmissions[sortedByEmissions.length - 1].itinerary : null;
    
    const totalEmissions = withEmissions.reduce((sum, item) => sum + item.emissions, 0);
    const averageEmissions = withEmissions.length > 0 ? 
      Math.round(totalEmissions / withEmissions.length) : 0;
    
    // Calculate average for direct flights
    const directFlights = FlightPriceProcessor.filterDirectFlightsOnly(response.itineraries);
    const directEmissions = directFlights.map(i => 
      FlightPriceProcessor.estimateCarbonEmissions(i)
    );
    const directFlightEmissions = directEmissions.length > 0 ?
      Math.round(directEmissions.reduce((a, b) => a + b, 0) / directEmissions.length) : 0;
    
    // Find best value considering both price and emissions
    const bestValueForCarbon = withEmissions.length > 0 ?
      [...withEmissions].sort((a, b) => {
        // Normalize both values to 0-1 scale
        const maxPrice = Math.max(...withEmissions.map(w => w.itinerary.price.raw));
        const minPrice = Math.min(...withEmissions.map(w => w.itinerary.price.raw));
        const maxEmissions = Math.max(...withEmissions.map(w => w.emissions));
        const minEmissions = Math.min(...withEmissions.map(w => w.emissions));
        
        const priceScoreA = 1 - (a.itinerary.price.raw - minPrice) / (maxPrice - minPrice || 1);
        const priceScoreB = 1 - (b.itinerary.price.raw - minPrice) / (maxPrice - minPrice || 1);
        const emissionsScoreA = 1 - (a.emissions - minEmissions) / (maxEmissions - minEmissions || 1);
        const emissionsScoreB = 1 - (b.emissions - minEmissions) / (maxEmissions - minEmissions || 1);
        
        // Weight: 60% price, 40% emissions
        const totalScoreA = priceScoreA * 0.6 + emissionsScoreA * 0.4;
        const totalScoreB = priceScoreB * 0.6 + emissionsScoreB * 0.4;
        
        return totalScoreB - totalScoreA;
      })[0].itinerary : null;
    
    return {
      itineraries: withEmissions,
      lowestEmissions,
      highestEmissions,
      averageEmissions,
      directFlightEmissions,
      bestValueForCarbon,
    };
  }

  /**
   * Search for airports with caching
   */
  async searchAirports(query: string): Promise<AirportSearchResult[]> {
    // Check cache first
    if (this.cache) {
      const cacheKey = { query, endpoint: 'airport-search' };
      const cachedData = this.cache.get(cacheKey as any);
      if (cachedData) {
        return cachedData as any as AirportSearchResult[];
      }
    }

    // Fetch from API
    const data = await this.client.searchAirports(query);

    // Store in cache
    if (this.cache && data.length > 0) {
      const cacheKey = { query, endpoint: 'airport-search' };
      this.cache.set(cacheKey as any, data as any);
    }

    return data;
  }

  /**
   * Search for airports with analysis
   */
  async searchAirportsWithAnalysis(query: string): Promise<{
    results: AirportSearchResult[];
    grouped: ReturnType<typeof AirportSearchProcessor.groupByType>;
    statistics: ReturnType<typeof AirportSearchProcessor.getStatistics>;
    ranked: AirportSearchResult[];
    majorHubs: AirportSearchResult[];
    exactMatches: AirportSearchResult[];
    summary: string;
  }> {
    const results = await this.searchAirports(query);
    
    return {
      results,
      grouped: AirportSearchProcessor.groupByType(results),
      statistics: AirportSearchProcessor.getStatistics(results),
      ranked: AirportSearchProcessor.rankResults(results),
      majorHubs: results.filter(r => AirportSearchProcessor.isMajorHub(r)),
      exactMatches: AirportSearchProcessor.findExactMatches(results, query),
      summary: AirportSearchProcessor.createSearchSummary(query, results),
    };
  }

  /**
   * Get airport by IATA code
   */
  async getAirportByIata(iataCode: string): Promise<AirportSearchResult | null> {
    return this.client.getAirportByIata(iataCode);
  }

  /**
   * Search city and get all airports
   */
  async searchCityAndAirports(cityName: string): Promise<{
    city: AirportSearchResult | null;
    airports: AirportSearchResult[];
    formatted: string[];
    flightParams: Array<ReturnType<typeof AirportSearchProcessor.getFlightSearchParams>>;
  }> {
    const result = await this.client.searchCityAndAirports(cityName);
    
    const formatted = [
      ...(result.city ? [AirportSearchProcessor.formatSearchResult(result.city)] : []),
      ...result.airports.map(a => AirportSearchProcessor.formatSearchResult(a))
    ];
    
    const flightParams = [
      ...(result.city ? [AirportSearchProcessor.getFlightSearchParams(result.city)] : []),
      ...result.airports.map(a => AirportSearchProcessor.getFlightSearchParams(a))
    ];
    
    return {
      city: result.city,
      airports: result.airports,
      formatted,
      flightParams,
    };
  }

  /**
   * Search multiple locations and get flight parameters
   */
  async searchMultipleLocations(
    queries: string[]
  ): Promise<Map<string, {
    query: string;
    results: AirportSearchResult[];
    bestMatch: AirportSearchResult | null;
    flightParams: ReturnType<typeof AirportSearchProcessor.getFlightSearchParams> | null;
    error?: string;
  }>> {
    const results = new Map<string, any>();
    
    // Search all queries in parallel
    const promises = queries.map(async (query) => {
      try {
        const searchResults = await this.searchAirports(query);
        const ranked = AirportSearchProcessor.rankResults(searchResults);
        const bestMatch = ranked.length > 0 ? ranked[0] : null;
        
        return {
          query,
          results: searchResults,
          bestMatch,
          flightParams: bestMatch ? AirportSearchProcessor.getFlightSearchParams(bestMatch) : null,
        };
      } catch (error) {
        return {
          query,
          results: [],
          bestMatch: null,
          flightParams: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
    
    const allResults = await Promise.all(promises);
    
    allResults.forEach(result => {
      results.set(result.query, result);
    });
    
    return results;
  }

  /**
   * Get airports by country
   */
  async getAirportsByCountry(country: string): Promise<{
    airports: AirportSearchResult[];
    cities: AirportSearchResult[];
    majorHubs: AirportSearchResult[];
    statistics: ReturnType<typeof AirportSearchProcessor.getStatistics>;
  }> {
    // Search for the country name to get airports
    const results = await this.searchAirports(country);
    
    // Filter results by country
    const filtered = AirportSearchProcessor.filterByCountry(results, country);
    const grouped = AirportSearchProcessor.groupByType(filtered);
    
    return {
      airports: grouped.airports,
      cities: grouped.cities,
      majorHubs: filtered.filter(r => AirportSearchProcessor.isMajorHub(r)),
      statistics: AirportSearchProcessor.getStatistics(filtered),
    };
  }

  /**
   * Find route between locations
   */
  async findRouteBetweenLocations(
    origin: string,
    destination: string
  ): Promise<{
    origin: {
      query: string;
      bestMatch: AirportSearchResult | null;
      alternatives: AirportSearchResult[];
    };
    destination: {
      query: string;
      bestMatch: AirportSearchResult | null;
      alternatives: AirportSearchResult[];
    };
    routeParams: {
      origin: ReturnType<typeof AirportSearchProcessor.getFlightSearchParams> | null;
      destination: ReturnType<typeof AirportSearchProcessor.getFlightSearchParams> | null;
      canSearchFlights: boolean;
    };
  }> {
    // Search both locations in parallel
    const [originResults, destResults] = await Promise.all([
      this.searchAirports(origin),
      this.searchAirports(destination)
    ]);
    
    // Rank and find best matches
    const originRanked = AirportSearchProcessor.rankResults(originResults);
    const destRanked = AirportSearchProcessor.rankResults(destResults);
    
    const originBest = originRanked.length > 0 ? originRanked[0] : null;
    const destBest = destRanked.length > 0 ? destRanked[0] : null;
    
    return {
      origin: {
        query: origin,
        bestMatch: originBest,
        alternatives: originRanked.slice(1, 6), // Top 5 alternatives
      },
      destination: {
        query: destination,
        bestMatch: destBest,
        alternatives: destRanked.slice(1, 6), // Top 5 alternatives
      },
      routeParams: {
        origin: originBest ? AirportSearchProcessor.getFlightSearchParams(originBest) : null,
        destination: destBest ? AirportSearchProcessor.getFlightSearchParams(destBest) : null,
        canSearchFlights: !!(originBest && destBest),
      },
    };
  }

  /**
   * Compare airport search results
   */
  async compareAirportSearches(
    queries: string[]
  ): Promise<{
    searches: Map<string, AirportSearchResult[]>;
    comparison: {
      totalResults: Map<string, number>;
      commonCountries: string[];
      uniqueCountries: Map<string, string[]>;
      allMajorHubs: AirportSearchResult[];
    };
    formatted: string;
  }> {
    const searches = new Map<string, AirportSearchResult[]>();
    const countries = new Map<string, Set<string>>();
    const allHubs = new Set<AirportSearchResult>();
    
    // Perform all searches
    for (const query of queries) {
      const results = await this.searchAirports(query);
      searches.set(query, results);
      
      // Collect countries
      const queryCountries = new Set<string>();
      results.forEach(r => {
        queryCountries.add(r.presentation.subtitle);
        if (AirportSearchProcessor.isMajorHub(r)) {
          allHubs.add(r);
        }
      });
      countries.set(query, queryCountries);
    }
    
    // Find common countries
    const countrySets = Array.from(countries.values());
    const commonCountries = countrySets.length > 0 ? 
      Array.from(countrySets[0]).filter(country => 
        countrySets.every(set => set.has(country))
      ) : [];
    
    // Find unique countries per query
    const uniqueCountries = new Map<string, string[]>();
    countries.forEach((countrySet, query) => {
      const unique = Array.from(countrySet).filter(country => {
        return !Array.from(countries.entries()).some(([q, set]) => 
          q !== query && set.has(country)
        );
      });
      uniqueCountries.set(query, unique);
    });
    
    // Format comparison
    const lines = ['Airport Search Comparison:'];
    queries.forEach(query => {
      const results = searches.get(query) || [];
      const stats = AirportSearchProcessor.getStatistics(results);
      lines.push(`\n"${query}": ${stats.total} results (${stats.cities} cities, ${stats.airports} airports)`);
    });
    
    if (commonCountries.length > 0) {
      lines.push(`\nCommon countries: ${commonCountries.join(', ')}`);
    }
    
    return {
      searches,
      comparison: {
        totalResults: new Map(Array.from(searches.entries()).map(([q, r]) => [q, r.length])),
        commonCountries,
        uniqueCountries,
        allMajorHubs: Array.from(allHubs),
      },
      formatted: lines.join('\n'),
    };
  }

  /**
   * Filter airports by various criteria with caching
   */
  async filterAirports(filters: Omit<AirportsByFilterQueryParams, 'access_key'>): Promise<AirportFilterData[]> {
    // Check cache first
    if (this.cache) {
      const cacheKey = { ...filters, endpoint: 'airports-filter' };
      const cachedData = this.cache.get(cacheKey as any);
      if (cachedData) {
        return cachedData as any as AirportFilterData[];
      }
    }

    // Fetch from API
    const data = await this.client.filterAirports(filters);

    // Store in cache
    if (this.cache && data.length > 0) {
      const cacheKey = { ...filters, endpoint: 'airports-filter' };
      this.cache.set(cacheKey as any, data as any);
    }

    return data;
  }

  /**
   * Get detailed airport information by IATA code
   */
  async getAirportDetailsByIata(iataCode: string): Promise<AirportFilterData | null> {
    return this.client.getAirportDetailsByIata(iataCode);
  }

  /**
   * Get airports by city with analysis
   */
  async getAirportsByCityAnalysis(cityCode: string): Promise<{
    airports: AirportFilterData[];
    processor: AirportFilterProcessor;
    statistics: AirportFilterStatistics;
    major: AirportFilterData[];
    international: AirportFilterData[];
    bySize: Map<string, AirportFilterData[]>;
    formatted: string[];
  }> {
    const airports = await this.client.getAirportsByCity(cityCode);
    const processor = new AirportFilterProcessor(airports);
    
    return {
      airports,
      processor,
      statistics: processor.getStatistics(),
      major: processor.getMajorAirports(),
      international: processor.getInternationalAirports(),
      bySize: processor.groupAirports().bySize,
      formatted: airports.map(a => processor.formatAirport(a)),
    };
  }

  /**
   * Get airports by country with comprehensive analysis
   */
  async getAirportsByCountryDetailed(countryCode: string): Promise<{
    airports: AirportFilterData[];
    processor: AirportFilterProcessor;
    statistics: AirportFilterStatistics;
    groupedByCities: Map<string, AirportFilterData[]>;
    majorHubs: AirportFilterData[];
    largeAirports: AirportFilterData[];
    topByDepartures: AirportFilterData[];
    topByConnections: AirportFilterData[];
    withSchedules: AirportFilterData[];
    csv: string;
  }> {
    const airports = await this.client.getAirportsByCountry(countryCode);
    const processor = new AirportFilterProcessor(airports);
    
    const grouped = processor.groupAirports();
    const topByDepartures = processor.sortByDepartures().slice(0, 10);
    const topByConnections = processor.sortByConnections().slice(0, 10);
    
    return {
      airports,
      processor,
      statistics: processor.getStatistics(),
      groupedByCities: grouped.byCity,
      majorHubs: processor.getMajorAirports(),
      largeAirports: processor.filterBySize('large'),
      topByDepartures,
      topByConnections,
      withSchedules: processor.getAirportsWithSchedules(),
      csv: processor.exportToCSV(),
    };
  }

  /**
   * Compare airports between multiple countries
   */
  async compareAirportsByCountries(countryCodes: string[]): Promise<{
    byCountry: Map<string, AirportFilterData[]>;
    statistics: Map<string, AirportFilterStatistics>;
    comparison: {
      totalAirports: Map<string, number>;
      majorAirports: Map<string, number>;
      internationalAirports: Map<string, number>;
      averageRunways: Map<string, number>;
      averageDepartures: Map<string, number>;
    };
    topAirportsByCountry: Map<string, AirportFilterData[]>;
  }> {
    const byCountry = new Map<string, AirportFilterData[]>();
    const statistics = new Map<string, AirportFilterStatistics>();
    const comparison: any = {
      totalAirports: new Map(),
      majorAirports: new Map(),
      internationalAirports: new Map(),
      averageRunways: new Map(),
      averageDepartures: new Map(),
    };
    const topAirportsByCountry = new Map<string, AirportFilterData[]>();

    // Fetch data for all countries in parallel
    const promises = countryCodes.map(async countryCode => {
      const airports = await this.filterAirports({ country_code: countryCode });
      const processor = new AirportFilterProcessor(airports);
      const stats = processor.getStatistics();
      
      byCountry.set(countryCode, airports);
      statistics.set(countryCode, stats);
      
      comparison.totalAirports.set(countryCode, stats.totalAirports);
      comparison.majorAirports.set(countryCode, stats.majorAirports);
      comparison.internationalAirports.set(countryCode, stats.internationalAirports);
      comparison.averageRunways.set(countryCode, Math.round(stats.averageRunways * 10) / 10);
      comparison.averageDepartures.set(countryCode, Math.round(stats.averageDepartures));
      
      // Get top 5 airports by popularity
      const topAirports = processor.sortByPopularity().slice(0, 5);
      topAirportsByCountry.set(countryCode, topAirports);
    });

    await Promise.all(promises);

    return {
      byCountry,
      statistics,
      comparison,
      topAirportsByCountry,
    };
  }

  /**
   * Find airports near coordinates
   */
  async findNearbyAirports(
    lat: number,
    lng: number,
    radiusKm: number,
    filters?: {
      requireMajor?: boolean;
      requireInternational?: boolean;
      requireSchedules?: boolean;
      minRunways?: number;
    }
  ): Promise<{
    nearbyAirports: Array<AirportFilterData & { distance: number }>;
    byDistance: Map<string, Array<AirportFilterData & { distance: number }>>;
    closest: AirportFilterData & { distance: number } | null;
    statistics: {
      total: number;
      major: number;
      international: number;
      countries: Set<string>;
    };
  }> {
    // Get a reasonable bounding box (rough approximation)
    const latDegreeKm = 111; // ~111km per degree latitude
    const lngDegreeKm = 111 * Math.cos(lat * Math.PI / 180); // varies by latitude
    
    const latDelta = radiusKm / latDegreeKm;
    const lngDelta = radiusKm / lngDegreeKm;
    
    // Search in multiple countries if needed (this is a simplified approach)
    // In reality, you might need to search multiple countries near borders
    const bounds = {
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
      minLng: lng - lngDelta,
      maxLng: lng + lngDelta,
    };

    // For now, we'll need to know which countries to search
    // This would require reverse geocoding or a more sophisticated approach
    throw new Error('Finding nearby airports requires country code. Use searchAirportsByMultipleCriteria with country code instead.');
  }

  /**
   * Get major international hubs by region
   */
  async getMajorInternationalHubs(countryCodes: string[]): Promise<{
    hubs: AirportFilterData[];
    byCountry: Map<string, AirportFilterData[]>;
    statistics: {
      totalHubs: number;
      averageDepartures: number;
      averageConnections: number;
      topHubsByDepartures: AirportFilterData[];
      topHubsByConnections: AirportFilterData[];
    };
    formatted: string[];
  }> {
    const allHubs: AirportFilterData[] = [];
    const byCountry = new Map<string, AirportFilterData[]>();

    // Fetch major international airports for each country
    const promises = countryCodes.map(async countryCode => {
      const airports = await this.client.searchAirportsByMultipleCriteria({
        country: countryCode,
        requireMajor: true,
        requireInternational: true,
        minDepartures: 10000, // Only significant airports
      });
      
      allHubs.push(...airports);
      byCountry.set(countryCode, airports);
    });

    await Promise.all(promises);

    const processor = new AirportFilterProcessor(allHubs);
    const topByDepartures = processor.sortByDepartures().slice(0, 10);
    const topByConnections = processor.sortByConnections().slice(0, 10);

    const totalDepartures = allHubs.reduce((sum, hub) => sum + hub.departures, 0);
    const totalConnections = allHubs.reduce((sum, hub) => sum + hub.connections, 0);

    return {
      hubs: allHubs,
      byCountry,
      statistics: {
        totalHubs: allHubs.length,
        averageDepartures: allHubs.length > 0 ? Math.round(totalDepartures / allHubs.length) : 0,
        averageConnections: allHubs.length > 0 ? Math.round(totalConnections / allHubs.length) : 0,
        topHubsByDepartures: topByDepartures,
        topHubsByConnections: topByConnections,
      },
      formatted: allHubs.map(hub => processor.formatAirport(hub)),
    };
  }

  /**
   * Search airports by name across multiple countries
   */
  async searchAirportsByName(
    searchTerm: string,
    countryCodes: string[]
  ): Promise<{
    results: AirportFilterData[];
    byCountry: Map<string, AirportFilterData[]>;
    exactMatches: AirportFilterData[];
    partialMatches: AirportFilterData[];
    statistics: AirportFilterStatistics;
  }> {
    const allResults: AirportFilterData[] = [];
    const byCountry = new Map<string, AirportFilterData[]>();

    // Search in all countries
    const promises = countryCodes.map(async countryCode => {
      const airports = await this.filterAirports({ country_code: countryCode });
      const processor = new AirportFilterProcessor(airports);
      const matches = processor.searchByName(searchTerm);
      
      allResults.push(...matches);
      if (matches.length > 0) {
        byCountry.set(countryCode, matches);
      }
    });

    await Promise.all(promises);

    // Categorize matches
    const searchLower = searchTerm.toLowerCase();
    const exactMatches = allResults.filter(airport => 
      airport.name.toLowerCase() === searchLower ||
      airport.iata_code.toLowerCase() === searchLower ||
      airport.icao_code.toLowerCase() === searchLower
    );
    
    const partialMatches = allResults.filter(airport => 
      !exactMatches.includes(airport)
    );

    const processor = new AirportFilterProcessor(allResults);

    return {
      results: allResults,
      byCountry,
      exactMatches,
      partialMatches,
      statistics: processor.getStatistics(),
    };
  }

  /**
   * Get airport network analysis for a city
   */
  async getCityAirportNetwork(cityCode: string): Promise<{
    airports: AirportFilterData[];
    network: {
      totalConnections: number;
      totalDepartures: number;
      internationalCapacity: number;
      domesticCapacity: number;
      majorHubCount: number;
    };
    primary: AirportFilterData | null;
    secondary: AirportFilterData[];
    connectivity: {
      airport: AirportFilterData;
      connections: number;
      departures: number;
      type: string;
    }[];
  }> {
    const airports = await this.filterAirports({ city_code: cityCode });
    
    if (airports.length === 0) {
      return {
        airports: [],
        network: {
          totalConnections: 0,
          totalDepartures: 0,
          internationalCapacity: 0,
          domesticCapacity: 0,
          majorHubCount: 0,
        },
        primary: null,
        secondary: [],
        connectivity: [],
      };
    }

    const processor = new AirportFilterProcessor(airports);
    
    // Calculate network statistics
    const totalConnections = airports.reduce((sum, a) => sum + a.connections, 0);
    const totalDepartures = airports.reduce((sum, a) => sum + a.departures, 0);
    const internationalCapacity = airports.reduce((sum, a) => sum + a.departures_intl, 0);
    const domesticCapacity = airports.reduce((sum, a) => sum + a.departures_dom, 0);
    const majorHubCount = airports.filter(a => isMajorAirport(a)).length;

    // Find primary airport (major with most departures)
    const sortedByDepartures = processor.sortByDepartures();
    const primary = sortedByDepartures.find(a => isMajorAirport(a)) || sortedByDepartures[0] || null;
    const secondary = sortedByDepartures.filter(a => a !== primary);

    // Create connectivity analysis
    const connectivity = airports.map(airport => ({
      airport,
      connections: airport.connections,
      departures: airport.departures,
      type: isMajorAirport(airport) ? 'Major Hub' : 
            isInternationalAirport(airport) ? 'International' : 
            'Domestic',
    })).sort((a, b) => b.connections - a.connections);

    return {
      airports,
      network: {
        totalConnections,
        totalDepartures,
        internationalCapacity,
        domesticCapacity,
        majorHubCount,
      },
      primary,
      secondary,
      connectivity,
    };
  }

  /**
   * Get all supported countries with caching
   */
  async getCountries(): Promise<CountryData[]> {
    // Check cache first
    if (this.cache) {
      const cacheKey = { endpoint: 'countries' };
      const cachedData = this.cache.get(cacheKey as any);
      if (cachedData) {
        return cachedData as any as CountryData[];
      }
    }

    // Fetch from API
    const data = await this.client.getCountries();

    // Store in cache
    if (this.cache && data.length > 0) {
      const cacheKey = { endpoint: 'countries' };
      this.cache.set(cacheKey as any, data as any);
    }

    return data;
  }

  /**
   * Get countries with comprehensive analysis
   */
  async getCountriesWithAnalysis(): Promise<{
    countries: CountryData[];
    processor: CountryDataProcessor;
    statistics: CountryStatistics;
    grouped: GroupedCountries;
    currencies: Array<{ currency: string; currencyTitle: string; symbol: string; count: number }>;
    markets: Array<{ market: string; language: string; count: number; countries: string[] }>;
    byRegion: Map<string, CountryData[]>;
    formatted: string[];
  }> {
    const countries = await this.getCountries();
    const processor = new CountryDataProcessor(countries);
    const grouped = processor.groupCountries();

    return {
      countries,
      processor,
      statistics: processor.getStatistics(),
      grouped,
      currencies: processor.getUniqueCurrencies(),
      markets: processor.getUniqueMarkets(),
      byRegion: grouped.byRegion,
      formatted: countries.map(c => processor.formatCountry(c)),
    };
  }

  /**
   * Get country by country code
   */
  async getCountryByCode(countryCode: string): Promise<CountryData | null> {
    return this.client.getCountryByCode(countryCode);
  }

  /**
   * Get countries by currency
   */
  async getCountriesByCurrency(currencyCode: string): Promise<{
    countries: CountryData[];
    currency: string;
    currencyTitle: string;
    currencySymbol: string;
    count: number;
    formatted: string[];
  }> {
    const countries = await this.client.getCountriesByCurrency(currencyCode);
    
    if (countries.length === 0) {
      return {
        countries: [],
        currency: currencyCode,
        currencyTitle: '',
        currencySymbol: '',
        count: 0,
        formatted: [],
      };
    }

    const processor = new CountryDataProcessor(countries);
    const firstCountry = countries[0];

    return {
      countries,
      currency: firstCountry.currency,
      currencyTitle: firstCountry.currencyTitle,
      currencySymbol: firstCountry.currencySymbol,
      count: countries.length,
      formatted: countries.map(c => processor.formatCountry(c)),
    };
  }

  /**
   * Get countries by market locale
   */
  async getCountriesByMarket(market: string): Promise<{
    countries: CountryData[];
    market: string;
    language: string;
    count: number;
    byRegion: Map<string, CountryData[]>;
  }> {
    const countries = await this.client.getCountriesByMarket(market);
    const processor = new CountryDataProcessor(countries);
    const grouped = processor.groupCountries();

    return {
      countries,
      market,
      language: market.split('-')[0],
      count: countries.length,
      byRegion: grouped.byRegion,
    };
  }

  /**
   * Search countries by name
   */
  async searchCountriesByName(searchTerm: string): Promise<{
    results: CountryData[];
    exactMatch: CountryData | null;
    partialMatches: CountryData[];
    formatted: string[];
  }> {
    const results = await this.client.searchCountriesByName(searchTerm);
    const processor = new CountryDataProcessor(results);
    
    const searchLower = searchTerm.toLowerCase();
    const exactMatch = results.find(country => 
      country.country.toLowerCase() === searchLower ||
      country.countryCode.toLowerCase() === searchLower
    ) || null;

    const partialMatches = results.filter(country => country !== exactMatch);

    return {
      results,
      exactMatch,
      partialMatches,
      formatted: results.map(c => processor.formatCountry(c)),
    };
  }

  /**
   * Get currency zones analysis
   */
  async getCurrencyZonesAnalysis(): Promise<{
    zones: Map<string, {
      currency: string;
      currencyTitle: string;
      symbol: string;
      countries: CountryData[];
      regionDistribution: Map<string, number>;
    }>;
    majorZones: Array<{
      currency: string;
      title: string;
      symbol: string;
      countryCount: number;
      regions: string[];
    }>;
    singleCountryCurrencies: CountryData[];
  }> {
    const countries = await this.getCountries();
    const processor = new CountryDataProcessor(countries);
    const grouped = processor.groupCountries();
    
    const zones = new Map<string, any>();
    
    // Build currency zones
    grouped.byCurrency.forEach((countryList, currency) => {
      const firstCountry = countryList[0];
      const regionDist = new Map<string, number>();
      
      countryList.forEach(country => {
        const region = processor.getRegionFromCountryCode(country.countryCode);
        regionDist.set(region, (regionDist.get(region) || 0) + 1);
      });
      
      zones.set(currency, {
        currency,
        currencyTitle: firstCountry.currencyTitle,
        symbol: firstCountry.currencySymbol,
        countries: countryList,
        regionDistribution: regionDist,
      });
    });
    
    // Identify major currency zones (used by 5+ countries)
    const majorZones = Array.from(zones.entries())
      .filter(([_, zone]) => zone.countries.length >= 5)
      .map(([currency, zone]) => ({
        currency,
        title: zone.currencyTitle as string,
        symbol: zone.symbol as string,
        countryCount: zone.countries.length as number,
        regions: Array.from(zone.regionDistribution.keys()) as string[],
      }))
      .sort((a, b) => b.countryCount - a.countryCount);
    
    // Find single-country currencies
    const singleCountryCurrencies = Array.from(zones.values())
      .filter(zone => zone.countries.length === 1)
      .map(zone => zone.countries[0]);
    
    return {
      zones,
      majorZones,
      singleCountryCurrencies,
    };
  }

  /**
   * Get regional market preferences
   */
  async getRegionalMarketAnalysis(): Promise<{
    byRegion: Map<string, {
      region: string;
      countries: CountryData[];
      primaryMarket: string;
      marketDistribution: Map<string, number>;
      currencies: Set<string>;
    }>;
    marketDominance: Array<{
      market: string;
      regions: string[];
      countryCount: number;
      percentage: number;
    }>;
  }> {
    const countries = await this.getCountries();
    const processor = new CountryDataProcessor(countries);
    const grouped = processor.groupCountries();
    
    const byRegion = new Map<string, any>();
    
    // Analyze each region
    grouped.byRegion.forEach((countryList, region) => {
      const marketDist = new Map<string, number>();
      const currencies = new Set<string>();
      
      countryList.forEach(country => {
        marketDist.set(country.market, (marketDist.get(country.market) || 0) + 1);
        currencies.add(country.currency);
      });
      
      // Find primary market
      const sortedMarkets = Array.from(marketDist.entries()).sort((a, b) => b[1] - a[1]);
      const primaryMarket = sortedMarkets[0]?.[0] || '';
      
      byRegion.set(region, {
        region,
        countries: countryList,
        primaryMarket,
        marketDistribution: marketDist,
        currencies,
      });
    });
    
    // Calculate market dominance across regions
    const marketRegions = new Map<string, Set<string>>();
    const marketCounts = new Map<string, number>();
    
    grouped.byMarket.forEach((countryList, market) => {
      countryList.forEach(country => {
        const region = processor.getRegionFromCountryCode(country.countryCode);
        if (!marketRegions.has(market)) {
          marketRegions.set(market, new Set());
        }
        marketRegions.get(market)!.add(region);
      });
      marketCounts.set(market, countryList.length);
    });
    
    const totalCountries = countries.length;
    const marketDominance = Array.from(marketCounts.entries())
      .map(([market, count]) => ({
        market,
        regions: Array.from(marketRegions.get(market) || []),
        countryCount: count,
        percentage: Math.round((count / totalCountries) * 100),
      }))
      .sort((a, b) => b.countryCount - a.countryCount);
    
    return {
      byRegion,
      marketDominance,
    };
  }

  /**
   * Compare countries
   */
  async compareCountries(countryCodes: string[]): Promise<{
    countries: Map<string, CountryData | null>;
    comparison: {
      sameCurrency: boolean;
      sameMarket: boolean;
      sameLanguage: boolean;
      sameRegion: boolean;
      currencies: string[];
      markets: string[];
      languages: string[];
      regions: string[];
    };
    formatted: string[];
  }> {
    const countries = new Map<string, CountryData | null>();
    
    // Fetch all countries
    const promises = countryCodes.map(async code => {
      const country = await this.getCountryByCode(code);
      countries.set(code, country);
    });
    
    await Promise.all(promises);
    
    // Get valid countries
    const validCountries = Array.from(countries.values()).filter(c => c !== null) as CountryData[];
    
    if (validCountries.length === 0) {
      return {
        countries,
        comparison: {
          sameCurrency: false,
          sameMarket: false,
          sameLanguage: false,
          sameRegion: false,
          currencies: [],
          markets: [],
          languages: [],
          regions: [],
        },
        formatted: [],
      };
    }
    
    const processor = new CountryDataProcessor(validCountries);
    
    // Extract unique values
    const currencies = [...new Set(validCountries.map(c => c.currency))];
    const markets = [...new Set(validCountries.map(c => c.market))];
    const languages = [...new Set(validCountries.map(c => c.market.split('-')[0]))];
    const regions = [...new Set(validCountries.map(c => 
      processor.getRegionFromCountryCode(c.countryCode)
    ))];
    
    const comparison = {
      sameCurrency: currencies.length === 1,
      sameMarket: markets.length === 1,
      sameLanguage: languages.length === 1,
      sameRegion: regions.length === 1,
      currencies,
      markets,
      languages,
      regions,
    };
    
    const formatted = validCountries.map(c => processor.formatCountry(c));
    
    return {
      countries,
      comparison,
      formatted,
    };
  }

  /**
   * Export countries data to CSV
   */
  async exportCountriesToCSV(): Promise<string> {
    const countries = await this.getCountries();
    const processor = new CountryDataProcessor(countries);
    return processor.exportToCSV();
  }

  /**
   * Clear cache for specific parameters or all
   */
  clearCache(params?: Partial<FlightQueryParams>): void {
    if (!this.cache) return;

    if (params) {
      this.cache.invalidate(params);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache?.getStats() || null;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache?.clear();
  }

  /**
   * Get detailed country information by ISO 2 code
   * @param countryCode ISO 2 country code (e.g., "US", "SG", "FR")
   * @returns Promise with detailed country information and analysis
   */
  async getCountryDetailsByCode(countryCode: string): Promise<{
    country: CountryDetailedData | null;
    languages: { language: string; name: string }[];
    continentName: string;
    currencyInfo: {
      code: string;
      countries: string[];
    };
    populationFormatted: string;
    nameTranslations: { language: string; name: string }[];
  }> {
    const countries = await this.client.getCountryDetailsByCode(countryCode);
    
    if (countries.length === 0) {
      return {
        country: null,
        languages: [],
        continentName: '',
        currencyInfo: { code: '', countries: [] },
        populationFormatted: '',
        nameTranslations: [],
      };
    }

    const country = countries[0]; // API returns array, but should have single result for specific code
    
    // Extract available language translations
    const nameTranslations: { language: string; name: string }[] = [];
    const languageNames: { [key: string]: string } = {
      en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
      pt: 'Portuguese', ru: 'Russian', zh: 'Chinese', ja: 'Japanese', ko: 'Korean',
      ar: 'Arabic', hi: 'Hindi', nl: 'Dutch', sv: 'Swedish', pl: 'Polish',
      tr: 'Turkish', he: 'Hebrew', th: 'Thai', vi: 'Vietnamese', id: 'Indonesian',
      // Add more as needed
    };

    Object.entries(country.names).forEach(([code, name]) => {
      if (name) {
        nameTranslations.push({
          language: languageNames[code] || code.toUpperCase(),
          name,
        });
      }
    });

    // Map continent codes to names
    const continentNames: { [key: string]: string } = {
      'AF': 'Africa',
      'AN': 'Antarctica',
      'AS': 'Asia',
      'EU': 'Europe',
      'NA': 'North America',
      'OC': 'Oceania',
      'SA': 'South America',
    };

    // Get other countries using the same currency
    const allCountries = await this.getCountries();
    const countriesWithSameCurrency = allCountries
      .filter(c => c.currency === country.currency)
      .map(c => c.country);

    return {
      country,
      languages: nameTranslations.slice(0, 10), // Return top 10 translations
      continentName: continentNames[country.continent] || country.continent,
      currencyInfo: {
        code: country.currency,
        countries: countriesWithSameCurrency,
      },
      populationFormatted: country.population.toLocaleString(),
      nameTranslations: nameTranslations.sort((a, b) => a.language.localeCompare(b.language)),
    };
  }

  /**
   * Get country summary with airports and regional information
   * @param countryCode ISO 2 country code
   * @returns Promise with comprehensive country summary
   */
  async getCountrySummary(countryCode: string): Promise<{
    basicInfo: CountryData | null;
    detailedInfo: CountryDetailedData | null;
    airports: {
      total: number;
      major: number;
      international: number;
      topAirports: AirportFilterData[];
    };
    languages: string[];
    neighboringMarkets: CountryData[];
  }> {
    // Get basic and detailed country info in parallel
    const [basicInfo, detailedResult, airports] = await Promise.all([
      this.getCountryByCode(countryCode),
      this.getCountryDetailsByCode(countryCode),
      this.client.getAirportsByCountry(countryCode),
    ]);

    const detailedInfo = detailedResult.country;

    // Get top airports by popularity/size
    const topAirports = airports
      .filter(a => a.is_major === 1 && a.status === 'active')
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 5);

    // Extract primary languages from name translations
    const languages = detailedInfo 
      ? Object.keys(detailedInfo.names).filter(code => detailedInfo.names[code as keyof CountryNames])
      : [];

    // Find countries with similar markets
    const allCountries = await this.getCountries();
    const marketLanguage = basicInfo?.market.split('-')[0];
    const neighboringMarkets = marketLanguage
      ? allCountries.filter(c => 
          c.market.startsWith(marketLanguage) && 
          c.countryCode !== countryCode
        ).slice(0, 5)
      : [];

    return {
      basicInfo,
      detailedInfo,
      airports: {
        total: airports.length,
        major: airports.filter(a => a.is_major === 1).length,
        international: airports.filter(a => a.is_international === 1).length,
        topAirports,
      },
      languages,
      neighboringMarkets,
    };
  }

  /**
   * Get airlines with caching
   */
  async getAirlines(params: Omit<AirlineQueryParams, 'access_key'> = {}): Promise<AirlineData[]> {
    // Check cache first
    if (this.cache) {
      const cacheKey = { ...params, endpoint: 'airlines' };
      const cachedData = this.cache.get(cacheKey as any);
      if (cachedData) {
        return cachedData as any as AirlineData[];
      }
    }

    // Fetch from API
    const data = await this.client.getAirlines(params);

    // Store in cache
    if (this.cache && data.length > 0) {
      const cacheKey = { ...params, endpoint: 'airlines' };
      this.cache.set(cacheKey as any, data as any);
    }

    return data;
  }

  /**
   * Get airline by IATA code
   */
  async getAirlineByIataCode(iataCode: string): Promise<AirlineData | null> {
    return this.client.getAirlineByIataCode(iataCode);
  }

  /**
   * Get airlines by country
   */
  async getAirlinesByCountry(countryCode: string): Promise<{
    airlines: AirlineData[];
    statistics: AirlineStatistics;
    grouped: GroupedAirlines;
    topByFleet: AirlineData[];
    safestAirlines: AirlineData[];
    formatted: string[];
  }> {
    const airlines = await this.client.getAirlinesByCountry(countryCode);
    const statistics = AirlineDataProcessor.getStatistics(airlines);
    const grouped = AirlineDataProcessor.groupAirlines(airlines);
    const topByFleet = AirlineDataProcessor.getTopAirlines(airlines, 'fleet', 5);
    const safestAirlines = AirlineDataProcessor.getTopAirlines(airlines, 'safety', 5);
    const formatted = airlines.map(a => AirlineDataProcessor.formatAirline(a));

    return {
      airlines,
      statistics,
      grouped,
      topByFleet,
      safestAirlines,
      formatted,
    };
  }

  /**
   * Get all airlines with analysis
   */
  async getAllAirlinesWithAnalysis(): Promise<{
    airlines: AirlineData[];
    statistics: AirlineStatistics;
    grouped: GroupedAirlines;
    topGlobal: {
      byFleet: AirlineData[];
      bySafety: AirlineData[];
      byAge: AirlineData[];
    };
    iosaExpiringSoon: AirlineData[];
    csv: string;
  }> {
    const airlines = await this.getAirlines();
    const statistics = AirlineDataProcessor.getStatistics(airlines);
    const grouped = AirlineDataProcessor.groupAirlines(airlines);
    
    const iosaExpiringSoon = airlines.filter(a => 
      AirlineDataProcessor.isIosaExpiringSoon(a, 90)
    );

    return {
      airlines,
      statistics,
      grouped,
      topGlobal: {
        byFleet: AirlineDataProcessor.getTopAirlines(airlines, 'fleet', 10),
        bySafety: AirlineDataProcessor.getTopAirlines(airlines, 'safety', 10),
        byAge: AirlineDataProcessor.getTopAirlines(airlines, 'age', 10),
      },
      iosaExpiringSoon,
      csv: AirlineDataProcessor.exportToCSV(airlines),
    };
  }

  /**
   * Search airlines
   */
  async searchAirlines(searchTerm: string): Promise<{
    results: AirlineData[];
    exactMatch: AirlineData | null;
    partialMatches: AirlineData[];
    formatted: string[];
  }> {
    const airlines = await this.getAirlines();
    const results = AirlineDataProcessor.searchByName(airlines, searchTerm);
    
    const searchLower = searchTerm.toLowerCase();
    const exactMatch = results.find(airline => 
      (airline.name && airline.name.toLowerCase() === searchLower) ||
      (airline.iata_code && airline.iata_code.toLowerCase() === searchLower) ||
      (airline.icao_code && airline.icao_code.toLowerCase() === searchLower)
    ) || null;

    const partialMatches = results.filter(airline => airline !== exactMatch);

    return {
      results,
      exactMatch,
      partialMatches,
      formatted: results.map(a => AirlineDataProcessor.formatAirline(a)),
    };
  }

  /**
   * Compare airlines
   */
  async compareAirlines(iataCodes: string[]): Promise<{
    airlines: Map<string, AirlineData | null>;
    comparison: Array<{
      airline: AirlineData;
      fleetRank: number;
      safetyRank: number;
      ageRank: number;
      overallScore: number;
    }>;
    statistics: {
      avgFleetSize: number;
      avgFleetAge: number;
      totalAccidents: number;
      totalCrashes: number;
      safetyComparison: Map<string, { rating: string; score: number }>;
    };
    formatted: string[];
  }> {
    const airlines = new Map<string, AirlineData | null>();
    
    // Fetch all airlines
    const promises = iataCodes.map(async code => {
      const airline = await this.getAirlineByIataCode(code);
      airlines.set(code, airline);
    });
    
    await Promise.all(promises);
    
    // Get valid airlines
    const validAirlines = Array.from(airlines.values()).filter(a => a !== null) as AirlineData[];
    
    if (validAirlines.length === 0) {
      return {
        airlines,
        comparison: [],
        statistics: {
          avgFleetSize: 0,
          avgFleetAge: 0,
          totalAccidents: 0,
          totalCrashes: 0,
          safetyComparison: new Map(),
        },
        formatted: [],
      };
    }
    
    const comparison = AirlineDataProcessor.compareAirlines(validAirlines);
    const stats = AirlineDataProcessor.getStatistics(validAirlines);
    
    // Calculate safety ratings
    const safetyComparison = new Map<string, { rating: string; score: number }>();
    validAirlines.forEach(airline => {
      const safety = AirlineDataProcessor.getSafetyRating(airline);
      safetyComparison.set(airline.iata_code, { rating: safety.rating, score: safety.score });
    });
    
    return {
      airlines,
      comparison,
      statistics: {
        avgFleetSize: stats.avgFleetSize,
        avgFleetAge: stats.avgFleetAge,
        totalAccidents: stats.totalAccidents,
        totalCrashes: stats.totalCrashes,
        safetyComparison,
      },
      formatted: validAirlines.map(a => AirlineDataProcessor.formatAirline(a)),
    };
  }

  /**
   * Get airline safety analysis
   */
  async getAirlineSafetyAnalysis(): Promise<{
    totalAirlines: number;
    bySafety: GroupedAirlines['bySafety'];
    statistics: {
      safe: number;
      caution: number;
      risk: number;
      percentageSafe: number;
      totalAccidents: number;
      totalCrashes: number;
    };
    worstAirlines: Array<{
      airline: AirlineData;
      safetyRating: ReturnType<typeof AirlineDataProcessor.getSafetyRating>;
    }>;
    bestAirlines: Array<{
      airline: AirlineData;
      safetyRating: ReturnType<typeof AirlineDataProcessor.getSafetyRating>;
    }>;
  }> {
    const airlines = await this.getAirlines();
    const grouped = AirlineDataProcessor.groupAirlines(airlines);
    const stats = AirlineDataProcessor.getStatistics(airlines);
    
    // Get worst airlines by safety
    const sortedBySafety = AirlineDataProcessor.sortBySafety(airlines, false); // worst first
    const worstAirlines = sortedBySafety.slice(0, 10).map(airline => ({
      airline,
      safetyRating: AirlineDataProcessor.getSafetyRating(airline),
    }));
    
    // Get best airlines by safety
    const bestBySafety = AirlineDataProcessor.sortBySafety(airlines, true); // best first
    const bestAirlines = bestBySafety
      .filter(a => a.total_aircrafts >= 20) // Only consider airlines with decent fleet size
      .slice(0, 10)
      .map(airline => ({
        airline,
        safetyRating: AirlineDataProcessor.getSafetyRating(airline),
      }));
    
    return {
      totalAirlines: airlines.length,
      bySafety: grouped.bySafety,
      statistics: {
        safe: grouped.bySafety.safe.length,
        caution: grouped.bySafety.caution.length,
        risk: grouped.bySafety.risk.length,
        percentageSafe: Math.round((grouped.bySafety.safe.length / airlines.length) * 100),
        totalAccidents: stats.totalAccidents,
        totalCrashes: stats.totalCrashes,
      },
      worstAirlines,
      bestAirlines,
    };
  }

  /**
   * Get airlines by type
   */
  async getAirlinesByType(type: 'passenger' | 'cargo' | 'international' | 'domestic'): Promise<{
    airlines: AirlineData[];
    statistics: AirlineStatistics;
    topByFleet: AirlineData[];
    byCountry: Map<string, AirlineData[]>;
    formatted: string[];
  }> {
    const allAirlines = await this.getAirlines();
    
    let airlines: AirlineData[];
    switch (type) {
      case 'passenger':
        airlines = AirlineDataProcessor.filterPassenger(allAirlines);
        break;
      case 'cargo':
        airlines = AirlineDataProcessor.filterCargo(allAirlines);
        break;
      case 'international':
        airlines = AirlineDataProcessor.filterInternational(allAirlines);
        break;
      case 'domestic':
        airlines = AirlineDataProcessor.filterDomestic(allAirlines);
        break;
    }
    
    const statistics = AirlineDataProcessor.getStatistics(airlines);
    const grouped = AirlineDataProcessor.groupAirlines(airlines);
    const topByFleet = AirlineDataProcessor.getTopAirlines(airlines, 'fleet', 10);
    
    return {
      airlines,
      statistics,
      topByFleet,
      byCountry: grouped.byCountry,
      formatted: airlines.slice(0, 20).map(a => AirlineDataProcessor.formatAirline(a)),
    };
  }

  /**
   * Get major carriers analysis
   */
  async getMajorCarriersAnalysis(minFleetSize = 100): Promise<{
    carriers: AirlineData[];
    statistics: AirlineStatistics;
    byRegion: Map<string, AirlineData[]>;
    globalAlliances: {
      starAlliance: AirlineData[];
      oneworld: AirlineData[];
      skyteam: AirlineData[];
      unaffiliated: AirlineData[];
    };
    marketShare: Array<{
      airline: AirlineData;
      fleetPercentage: number;
      rank: number;
    }>;
  }> {
    const airlines = await this.getAirlines();
    const majorCarriers = AirlineDataProcessor.filterByMinFleetSize(airlines, minFleetSize);
    const statistics = AirlineDataProcessor.getStatistics(majorCarriers);
    
    // Group by region (simplified - would need alliance data for accurate grouping)
    const byRegion = new Map<string, AirlineData[]>();
    const regions: { [key: string]: string[] } = {
      'North America': ['US', 'CA', 'MX'],
      'Europe': ['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'CH', 'AT', 'BE', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'GR', 'PL', 'CZ', 'HU', 'RO', 'BG'],
      'Asia Pacific': ['CN', 'JP', 'KR', 'SG', 'HK', 'TW', 'TH', 'MY', 'ID', 'PH', 'VN', 'IN', 'AU', 'NZ'],
      'Middle East': ['AE', 'QA', 'SA', 'KW', 'BH', 'OM', 'JO', 'IL', 'TR'],
      'Latin America': ['BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY'],
      'Africa': ['ZA', 'EG', 'MA', 'KE', 'ET', 'NG', 'TN', 'DZ'],
    };
    
    Object.entries(regions).forEach(([region, countries]) => {
      const regionalCarriers = majorCarriers.filter(a => countries.includes(a.country_code));
      if (regionalCarriers.length > 0) {
        byRegion.set(region, regionalCarriers);
      }
    });
    
    // Calculate market share
    const totalFleet = statistics.totalAircraft;
    const marketShare = AirlineDataProcessor.sortByFleetSize(majorCarriers, false)
      .map((airline, index) => ({
        airline,
        fleetPercentage: Math.round((airline.total_aircrafts / totalFleet) * 1000) / 10,
        rank: index + 1,
      }));
    
    // Note: Alliance grouping would require additional data not in the API
    // This is a placeholder structure
    const globalAlliances = {
      starAlliance: [] as AirlineData[],
      oneworld: [] as AirlineData[],
      skyteam: [] as AirlineData[],
      unaffiliated: majorCarriers,
    };
    
    return {
      carriers: majorCarriers,
      statistics,
      byRegion,
      globalAlliances,
      marketShare: marketShare.slice(0, 20), // Top 20
    };
  }

  /**
   * Check airline operational status
   */
  async checkAirlineOperationalStatus(iataCode: string): Promise<{
    airline: AirlineData | null;
    isOperational: boolean;
    operationalDetails: {
      hasPassengerService: boolean;
      hasCargoService: boolean;
      hasScheduledService: boolean;
      isInternational: boolean;
      fleetStatus: string;
      safetyStatus: ReturnType<typeof AirlineDataProcessor.getSafetyRating>;
      iosaStatus: {
        registered: boolean;
        expiringSoon: boolean;
        expiryDate: string | null;
      };
    };
    realtimeFlights: {
      total: number;
      enRoute: number;
      scheduled: number;
      landed: number;
    };
  }> {
    const [airline, flights] = await Promise.all([
      this.getAirlineByIataCode(iataCode),
      this.getFlights({ airlineIata: iataCode }).catch(() => [] as FlightData[]),
    ]);
    
    if (!airline) {
      return {
        airline: null,
        isOperational: false,
        operationalDetails: {
          hasPassengerService: false,
          hasCargoService: false,
          hasScheduledService: false,
          isInternational: false,
          fleetStatus: 'Unknown',
          safetyStatus: { rating: 'Fair', score: 0, description: 'No data available' },
          iosaStatus: {
            registered: false,
            expiringSoon: false,
            expiryDate: null,
          },
        },
        realtimeFlights: {
          total: 0,
          enRoute: 0,
          scheduled: 0,
          landed: 0,
        },
      };
    }
    
    const fleetStatus = AirlineDataProcessor.getFleetSizeCategory(airline.total_aircrafts);
    const safetyStatus = AirlineDataProcessor.getSafetyRating(airline);
    const iosaExpiring = AirlineDataProcessor.isIosaExpiringSoon(airline);
    
    // Count flight statuses
    const flightCounts = {
      total: flights.length,
      enRoute: flights.filter(f => f.status === FlightStatus.EN_ROUTE).length,
      scheduled: flights.filter(f => f.status === FlightStatus.SCHEDULED).length,
      landed: flights.filter(f => f.status === FlightStatus.LANDED).length,
    };
    
    return {
      airline,
      isOperational: airline.total_aircrafts > 0 && (isPassengerAirline(airline) || isCargoAirline(airline)),
      operationalDetails: {
        hasPassengerService: isPassengerAirline(airline),
        hasCargoService: isCargoAirline(airline),
        hasScheduledService: isScheduledAirline(airline),
        isInternational: isInternationalAirlineType(airline),
        fleetStatus,
        safetyStatus,
        iosaStatus: {
          registered: isIosaRegistered(airline),
          expiringSoon: iosaExpiring,
          expiryDate: airline.iosa_expiry,
        },
      },
      realtimeFlights: flightCounts,
    };
  }

  /**
   * Get routes with caching
   */
  async getRoutes(params: Omit<RouteQueryParams, 'access_key'>): Promise<RouteData[]> {
    // Check cache first
    if (this.cache) {
      const cacheKey = { ...params, endpoint: 'routes' };
      const cachedData = this.cache.get(cacheKey as any);
      if (cachedData) {
        return cachedData as any as RouteData[];
      }
    }

    // Fetch from API
    const response = await this.client.getRoutes(params);

    // Store in cache
    if (this.cache && response.data.length > 0) {
      const cacheKey = { ...params, endpoint: 'routes' };
      this.cache.set(cacheKey as any, response.data as any);
    }

    return response.data;
  }

  /**
   * Get routes between airports with analysis
   */
  async getRoutesBetweenAirportsAnalysis(
    depIata: string,
    arrIata: string,
    additionalParams: Omit<RouteQueryParams, 'access_key' | 'dep_iata' | 'arr_iata'> = {}
  ): Promise<{
    routes: RouteData[];
    statistics: RouteStatistics;
    competition: ReturnType<typeof RouteDataProcessor.getRouteCompetition>;
    byAirline: Map<string, RouteData[]>;
    byDuration: Map<string, RouteData[]>;
    directOnly: RouteData[];
    codeshareOnly: RouteData[];
    formatted: string[];
  }> {
    const routes = await this.client.getRoutesBetweenAirports(depIata, arrIata, additionalParams);
    const statistics = RouteDataProcessor.getStatistics(routes);
    const grouped = RouteDataProcessor.groupRoutes(routes);
    const competition = RouteDataProcessor.getRouteCompetition(routes, depIata, arrIata);
    
    return {
      routes,
      statistics,
      competition,
      byAirline: grouped.byAirline,
      byDuration: grouped.byDuration,
      directOnly: RouteDataProcessor.filterDirectRoutes(routes),
      codeshareOnly: RouteDataProcessor.filterCodeshareRoutes(routes),
      formatted: routes.slice(0, 5).map(r => RouteDataProcessor.formatRoute(r)),
    };
  }

  /**
   * Get routes from airport with analysis
   */
  async getRoutesFromAirportAnalysis(
    depIata: string,
    additionalParams: Omit<RouteQueryParams, 'access_key' | 'dep_iata'> = {}
  ): Promise<{
    routes: RouteData[];
    statistics: RouteStatistics;
    destinations: Array<{
      airport: string;
      routes: RouteData[];
      airlines: string[];
      frequency: number;
    }>;
    byAirline: Map<string, RouteData[]>;
    uniqueRoutePairs: ReturnType<typeof RouteDataProcessor.getUniqueRoutePairs>;
    shortHaul: RouteData[];
    mediumHaul: RouteData[];
    longHaul: RouteData[];
  }> {
    const routes = await this.client.getRoutesFromAirport(depIata, additionalParams);
    const statistics = RouteDataProcessor.getStatistics(routes);
    const grouped = RouteDataProcessor.groupRoutes(routes);
    
    // Group by destination
    const destinationMap = new Map<string, RouteData[]>();
    routes.forEach(route => {
      if (!destinationMap.has(route.arr_iata)) {
        destinationMap.set(route.arr_iata, []);
      }
      destinationMap.get(route.arr_iata)!.push(route);
    });
    
    const destinations = Array.from(destinationMap.entries()).map(([airport, routes]) => ({
      airport,
      routes,
      airlines: Array.from(new Set(routes.map(r => r.airline_iata))),
      frequency: routes.reduce((sum, r) => sum + r.counter, 0),
    })).sort((a, b) => b.frequency - a.frequency);
    
    return {
      routes,
      statistics,
      destinations,
      byAirline: grouped.byAirline,
      uniqueRoutePairs: RouteDataProcessor.getUniqueRoutePairs(routes),
      shortHaul: RouteDataProcessor.filterShortHaul(routes),
      mediumHaul: RouteDataProcessor.filterMediumHaul(routes),
      longHaul: RouteDataProcessor.filterLongHaul(routes),
    };
  }

  /**
   * Get routes to airport with analysis
   */
  async getRoutesToAirportAnalysis(
    arrIata: string,
    additionalParams: Omit<RouteQueryParams, 'access_key' | 'arr_iata'> = {}
  ): Promise<{
    routes: RouteData[];
    statistics: RouteStatistics;
    origins: Array<{
      airport: string;
      routes: RouteData[];
      airlines: string[];
      frequency: number;
    }>;
    byAirline: Map<string, RouteData[]>;
    terminalAnalysis: ReturnType<typeof RouteDataProcessor.getTerminalAnalysis>;
  }> {
    const routes = await this.client.getRoutesToAirport(arrIata, additionalParams);
    const statistics = RouteDataProcessor.getStatistics(routes);
    const grouped = RouteDataProcessor.groupRoutes(routes);
    const terminalAnalysis = RouteDataProcessor.getTerminalAnalysis(routes);
    
    // Group by origin
    const originMap = new Map<string, RouteData[]>();
    routes.forEach(route => {
      if (!originMap.has(route.dep_iata)) {
        originMap.set(route.dep_iata, []);
      }
      originMap.get(route.dep_iata)!.push(route);
    });
    
    const origins = Array.from(originMap.entries()).map(([airport, routes]) => ({
      airport,
      routes,
      airlines: Array.from(new Set(routes.map(r => r.airline_iata))),
      frequency: routes.reduce((sum, r) => sum + r.counter, 0),
    })).sort((a, b) => b.frequency - a.frequency);
    
    return {
      routes,
      statistics,
      origins,
      byAirline: grouped.byAirline,
      terminalAnalysis,
    };
  }

  /**
   * Get routes by airline with comprehensive analysis
   */
  async getRoutesByAirlineAnalysis(
    airlineIata: string,
    additionalParams: Omit<RouteQueryParams, 'access_key' | 'airline_iata'> = {}
  ): Promise<{
    routes: RouteData[];
    statistics: RouteStatistics;
    grouped: GroupedRoutes;
    networkMap: Map<string, string[]>;
    hubAnalysis: Array<{
      airport: string;
      type: 'hub' | 'focus' | 'destination';
      connections: number;
      routes: RouteData[];
    }>;
    routePairs: ReturnType<typeof RouteDataProcessor.getUniqueRoutePairs>;
    dailySchedules: Map<string, RouteData[]>;
    csv: string;
  }> {
    const routes = await this.client.getRoutesByAirline(airlineIata, additionalParams);
    const statistics = RouteDataProcessor.getStatistics(routes);
    const grouped = RouteDataProcessor.groupRoutes(routes);
    const routePairs = RouteDataProcessor.getUniqueRoutePairs(routes);
    
    // Build network map
    const networkMap = new Map<string, string[]>();
    routes.forEach(route => {
      if (!networkMap.has(route.dep_iata)) {
        networkMap.set(route.dep_iata, []);
      }
      if (!networkMap.get(route.dep_iata)!.includes(route.arr_iata)) {
        networkMap.get(route.dep_iata)!.push(route.arr_iata);
      }
    });
    
    // Analyze hubs
    const airportConnections = new Map<string, Set<string>>();
    routes.forEach(route => {
      if (!airportConnections.has(route.dep_iata)) {
        airportConnections.set(route.dep_iata, new Set());
      }
      if (!airportConnections.has(route.arr_iata)) {
        airportConnections.set(route.arr_iata, new Set());
      }
      airportConnections.get(route.dep_iata)!.add(route.arr_iata);
      airportConnections.get(route.arr_iata)!.add(route.dep_iata);
    });
    
    const hubAnalysis = Array.from(airportConnections.entries())
      .map(([airport, connections]) => {
        const airportRoutes = routes.filter(r => 
          r.dep_iata === airport || r.arr_iata === airport
        );
        
        let type: 'hub' | 'focus' | 'destination';
        if (connections.size >= 10) {
          type = 'hub';
        } else if (connections.size >= 5) {
          type = 'focus';
        } else {
          type = 'destination';
        }
        
        return {
          airport,
          type,
          connections: connections.size,
          routes: airportRoutes,
        };
      })
      .sort((a, b) => b.connections - a.connections);
    
    // Build daily schedules
    const dailySchedules = new Map<string, RouteData[]>();
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    days.forEach(day => {
      dailySchedules.set(day, RouteDataProcessor.getDailySchedule(routes, day));
    });
    
    return {
      routes,
      statistics,
      grouped,
      networkMap,
      hubAnalysis,
      routePairs,
      dailySchedules,
      csv: RouteDataProcessor.exportToCSV(routes),
    };
  }

  /**
   * Get routes by flight number
   */
  async getRoutesByFlightNumber(
    flightNumber: string,
    airlineIata?: string,
    additionalParams: Omit<RouteQueryParams, 'access_key' | 'flight_number' | 'airline_iata'> = {}
  ): Promise<{
    routes: RouteData[];
    byDayOfWeek: Map<string, RouteData[]>;
    operatingDays: string[];
    variants: Array<{
      route: string;
      days: string[];
      duration: string;
      aircraft: string | null;
      terminals: { departure: string[]; arrival: string[] };
    }>;
  }> {
    const routes = await this.client.getRoutesByFlightNumber(flightNumber, airlineIata, additionalParams);
    
    // Group by day of week
    const byDayOfWeek = new Map<string, RouteData[]>();
    const allDays = new Set<string>();
    
    routes.forEach(route => {
      route.days.forEach(day => {
        allDays.add(day);
        if (!byDayOfWeek.has(day)) {
          byDayOfWeek.set(day, []);
        }
        byDayOfWeek.get(day)!.push(route);
      });
    });
    
    // Get route variants
    const variantMap = new Map<string, RouteData>();
    routes.forEach(route => {
      const key = `${route.dep_iata}-${route.arr_iata}`;
      variantMap.set(key, route);
    });
    
    const variants = Array.from(variantMap.values()).map(route => ({
      route: `${route.dep_iata}-${route.arr_iata}`,
      days: getDayNames(route.days),
      duration: RouteDataProcessor.formatDuration(route.duration),
      aircraft: route.aircraft_icao,
      terminals: {
        departure: route.dep_terminals || [],
        arrival: route.arr_terminals || [],
      },
    }));
    
    return {
      routes,
      byDayOfWeek,
      operatingDays: getDayNames(Array.from(allDays).sort()),
      variants,
    };
  }

  /**
   * Find connecting routes
   */
  async findConnectingRoutes(
    origin: string,
    destination: string,
    options: {
      maxLayoverMinutes?: number;
      preferredAirlines?: string[];
      filters?: Omit<RouteQueryParams, 'access_key'>;
    } = {}
  ): Promise<{
    directRoutes: RouteData[];
    connections: ReturnType<typeof RouteDataProcessor.findConnectingRoutes>;
    analysis: {
      directAvailable: boolean;
      connectionPoints: Array<{
        airport: string;
        options: number;
        airlines: string[];
      }>;
      bestConnection: any;
    };
  }> {
    // First, check for direct routes
    const directRoutes = await this.client.getRoutesBetweenAirports(origin, destination, options.filters);
    
    // If no direct routes, find connections
    const connections: ReturnType<typeof RouteDataProcessor.findConnectingRoutes> = [];
    if (directRoutes.length === 0 || options.maxLayoverMinutes) {
      // Get all routes from origin and to destination
      const [fromOrigin, toDestination] = await Promise.all([
        this.client.getRoutesFromAirport(origin, options.filters),
        this.client.getRoutesToAirport(destination, options.filters),
      ]);
      
      const allRoutes = [...fromOrigin, ...toDestination];
      const foundConnections = RouteDataProcessor.findConnectingRoutes(
        allRoutes,
        origin,
        destination,
        options.maxLayoverMinutes || 240
      );
      
      // Filter by preferred airlines if specified
      if (options.preferredAirlines && options.preferredAirlines.length > 0) {
        connections.push(...foundConnections.filter(conn => 
          options.preferredAirlines!.includes(conn.outbound.airline_iata) ||
          options.preferredAirlines!.includes(conn.inbound.airline_iata)
        ));
      } else {
        connections.push(...foundConnections);
      }
    }
    
    // Analyze connection points
    const connectionPointMap = new Map<string, Set<string>>();
    connections.forEach(conn => {
      if (!connectionPointMap.has(conn.connection)) {
        connectionPointMap.set(conn.connection, new Set());
      }
      connectionPointMap.get(conn.connection)!.add(conn.outbound.airline_iata);
      connectionPointMap.get(conn.connection)!.add(conn.inbound.airline_iata);
    });
    
    const connectionPoints = Array.from(connectionPointMap.entries())
      .map(([airport, airlines]) => ({
        airport,
        options: connections.filter(c => c.connection === airport).length,
        airlines: Array.from(airlines),
      }))
      .sort((a, b) => b.options - a.options);
    
    return {
      directRoutes,
      connections,
      analysis: {
        directAvailable: directRoutes.length > 0,
        connectionPoints,
        bestConnection: connections[0] || null,
      },
    };
  }

  /**
   * Get route schedule for a week
   */
  async getWeeklyRouteSchedule(
    depIata: string,
    arrIata: string
  ): Promise<{
    routes: RouteData[];
    weekSchedule: Map<string, Array<{
      flight: string;
      airline: string;
      departure: string;
      arrival: string;
      duration: string;
      aircraft: string | null;
    }>>;
    statistics: {
      flightsPerDay: Map<string, number>;
      totalWeeklyFlights: number;
      airlines: string[];
      averageFlightsPerDay: number;
    };
  }> {
    const routes = await this.client.getRoutesBetweenAirports(depIata, arrIata);
    const weekSchedule = new Map<string, any[]>();
    const flightsPerDay = new Map<string, number>();
    
    // Days of the week
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayAbbrev = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    
    days.forEach((day, index) => {
      const dayRoutes = RouteDataProcessor.getDailySchedule(routes, dayAbbrev[index]);
      weekSchedule.set(day, dayRoutes.map(route => ({
        flight: route.flight_iata,
        airline: route.airline_iata,
        departure: route.dep_time,
        arrival: route.arr_time,
        duration: RouteDataProcessor.formatDuration(route.duration),
        aircraft: route.aircraft_icao,
      })));
      flightsPerDay.set(day, dayRoutes.length);
    });
    
    const totalWeeklyFlights = Array.from(flightsPerDay.values()).reduce((a, b) => a + b, 0);
    const airlines = Array.from(new Set(routes.map(r => r.airline_iata)));
    
    return {
      routes,
      weekSchedule,
      statistics: {
        flightsPerDay,
        totalWeeklyFlights,
        airlines,
        averageFlightsPerDay: Math.round(totalWeeklyFlights / 7 * 10) / 10,
      },
    };
  }

  /**
   * Search routes with comprehensive criteria
   */
  async searchRoutesComprehensive(criteria: {
    departure?: { iata?: string; icao?: string };
    arrival?: { iata?: string; icao?: string };
    airline?: { iata?: string; icao?: string };
    flight?: { iata?: string; icao?: string; number?: string };
    operatingDays?: string[];
    minDuration?: number;
    maxDuration?: number;
    directOnly?: boolean;
    fields?: string[];
    limit?: number;
  }): Promise<{
    routes: RouteData[];
    statistics: RouteStatistics;
    grouped: GroupedRoutes;
    filtered: {
      byDays: RouteData[];
      byDuration: RouteData[];
      direct: RouteData[];
    };
  }> {
    const routes = await this.client.searchRoutes(criteria);
    
    // Apply additional filters
    let filtered = routes;
    
    // Filter by operating days
    if (criteria.operatingDays && criteria.operatingDays.length > 0) {
      filtered = filtered.filter(route => 
        criteria.operatingDays!.some(day => operatesOnDay(route, day))
      );
    }
    
    // Filter by duration
    if (criteria.minDuration !== undefined || criteria.maxDuration !== undefined) {
      filtered = RouteDataProcessor.filterByDuration(
        filtered,
        criteria.minDuration || 0,
        criteria.maxDuration || Infinity
      );
    }
    
    // Filter direct only
    if (criteria.directOnly) {
      filtered = RouteDataProcessor.filterDirectRoutes(filtered);
    }
    
    const statistics = RouteDataProcessor.getStatistics(filtered);
    const grouped = RouteDataProcessor.groupRoutes(filtered);
    
    return {
      routes: filtered,
      statistics,
      grouped,
      filtered: {
        byDays: criteria.operatingDays ? filtered : [],
        byDuration: (criteria.minDuration !== undefined || criteria.maxDuration !== undefined) ? filtered : [],
        direct: criteria.directOnly ? filtered : RouteDataProcessor.filterDirectRoutes(filtered),
      },
    };
  }

  /**
   * Get all routes with pagination (async generator)
   */
  async *getAllRoutesPaginated(
    filters: Omit<RouteQueryParams, 'access_key' | 'limit' | 'offset'>,
    pageSize: number = 500
  ): AsyncGenerator<RouteData[], void, unknown> {
    yield* this.client.getRoutesPaginated(filters, pageSize);
  }

  /**
   * Analyze airline route network
   */
  async analyzeAirlineNetwork(airlineIata: string): Promise<{
    totalRoutes: number;
    uniqueAirports: number;
    hubs: string[];
    internationalRoutes: number;
    domesticRoutes: Map<string, number>;
    coverage: {
      continents: string[];
      countries: string[];
      majorMarkets: Array<{ country: string; routes: number }>;
    };
    connectivity: Map<string, number>;
  }> {
    const routes = await this.client.getRoutesByAirline(airlineIata);
    
    // Get all unique airports
    const airports = new Set<string>();
    const airportConnections = new Map<string, Set<string>>();
    
    routes.forEach(route => {
      airports.add(route.dep_iata);
      airports.add(route.arr_iata);
      
      // Track connections
      if (!airportConnections.has(route.dep_iata)) {
        airportConnections.set(route.dep_iata, new Set());
      }
      airportConnections.get(route.dep_iata)!.add(route.arr_iata);
    });
    
    // Identify hubs (airports with 10+ connections)
    const hubs = Array.from(airportConnections.entries())
      .filter(([_, connections]) => connections.size >= 10)
      .map(([airport]) => airport)
      .sort((a, b) => airportConnections.get(b)!.size - airportConnections.get(a)!.size);
    
    // This is a simplified analysis - in reality would need airport data to determine countries
    // For now, we'll return placeholder data
    return {
      totalRoutes: routes.length,
      uniqueAirports: airports.size,
      hubs,
      internationalRoutes: 0, // Would need airport country data
      domesticRoutes: new Map(),
      coverage: {
        continents: [],
        countries: [],
        majorMarkets: [],
      },
      connectivity: new Map(
        Array.from(airportConnections.entries())
          .map(([airport, connections]) => [airport, connections.size])
      ),
    };
  }

  /**
   * Get city information by IATA city code
   * @param iataCode IATA city code (e.g., "SIN" for Singapore)
   * @returns Promise with city data and formatted information
   */
  async getCityByIataCode(iataCode: string): Promise<{
    city: CityData | null;
    timezone: string | null;
    country: CountryData | null;
    airports: AirportFilterData[];
    location: {
      lat: number;
      lng: number;
      alt: number;
    } | null;
    population: {
      count: number;
      formatted: string;
    } | null;
    languages: Array<{
      code: string;
      name: string;
    }>;
    formatted: string;
  }> {
    // Check cache first
    if (this.cache) {
      const cacheKey = { iataCode, endpoint: 'city' };
      const cachedData = this.cache.get(cacheKey as any);
      if (cachedData) {
        const city = cachedData as any as CityData;
        return this.formatCityData(city);
      }
    }

    // Fetch from API
    const city = await this.client.getCityByIataCode(iataCode);
    
    if (!city) {
      return {
        city: null,
        timezone: null,
        country: null,
        airports: [],
        location: null,
        population: null,
        languages: [],
        formatted: `No city found with IATA code: ${iataCode}`,
      };
    }

    // Store in cache
    if (this.cache) {
      const cacheKey = { iataCode, endpoint: 'city' };
      this.cache.set(cacheKey as any, city as any);
    }

    return this.formatCityData(city);
  }

  /**
   * Format city data with additional information
   * @param city City data
   * @returns Formatted city information
   */
  private async formatCityData(city: CityData): Promise<{
    city: CityData;
    timezone: string;
    country: CountryData | null;
    airports: AirportFilterData[];
    location: {
      lat: number;
      lng: number;
      alt: number;
    };
    population: {
      count: number;
      formatted: string;
    };
    languages: Array<{
      code: string;
      name: string;
    }>;
    formatted: string;
  }> {
    // Get country information
    const country = await this.getCountryByCode(city.country_code);
    
    // Get airports in the city
    const airports = await this.filterAirports({ city_code: city.iata_city_code });
    
    // Format population
    const populationFormatted = city.population.toLocaleString();
    
    // Get language names
    const languages = Object.entries(city.names)
      .filter(([code, name]) => code !== 'en' && name) // Exclude English and empty values
      .map(([code, name]) => ({
        code,
        name: name || '',
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
    
    // Format output
    const formatted = [
      `City: ${city.name} (${city.iata_city_code})`,
      `Country: ${country?.country || city.country_code}`,
      `Population: ${populationFormatted}`,
      `Timezone: ${city.timezone}`,
      `Location: ${city.lat}°N, ${city.lng}°E, ${city.alt}m elevation`,
      `UN/LOCODE: ${city.un_locode}`,
      `Airports: ${airports.length}`,
      airports.length > 0 ? `  - ${airports.map((a: AirportFilterData) => `${a.name} (${a.iata_code})`).join('\n  - ')}` : '',
      `Available in ${languages.length + 1} languages`,
      city.wikipedia ? `Wikipedia: ${city.wikipedia}` : '',
    ].filter(Boolean).join('\n');
    
    return {
      city,
      timezone: city.timezone,
      country,
      airports,
      location: {
        lat: city.lat,
        lng: city.lng,
        alt: city.alt,
      },
      population: {
        count: city.population,
        formatted: populationFormatted,
      },
      languages,
      formatted,
    };
  }
} 