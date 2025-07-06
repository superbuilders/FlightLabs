import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  FlightQueryParams,
  FlightLabsResponse,
  FlightLabsError,
  FlightData,
  isFlightLabsError,
  CallSignQueryParams,
  CallSignFlightResponse,
  CallSignFlightData,
  FlightsByAirlineQueryParams,
  FlightsByAirlineResponse,
  HistoricalFlightQueryParams,
  HistoricalFlightResponse,
  HistoricalFlightData,
  isHistoricalFlightResponse,
  FlightScheduleQueryParams,
  FlightScheduleResponse,
  FlightScheduleData,
  FutureFlightQueryParams,
  FutureFlightResponse,
  FutureFlightData,
  FlightDelayQueryParams,
  FlightDelayResponse,
  FlightDelayData,
  FlightByNumberQueryParams,
  FlightByNumberResponse,
  FlightByNumberData,
  FlightPriceQueryParams,
  FlightPriceResponse,
  FlightItinerary,
  AirportSearchQueryParams,
  AirportSearchResponse,
  AirportSearchResult,
  AirportsByFilterQueryParams,
  AirportsByFilterResponse,
  AirportFilterData,
  CountryData,
  CountriesResponse,
  CountryDetailedData,
  CountryByCodeQueryParams,
  CountryByCodeResponse,
  AirlineData,
  AirlineQueryParams,
  AirlineResponse,
  RouteData,
  RouteQueryParams,
  RouteResponse,
  CityData,
  CityQueryParams,
  CityResponse
} from '../../types/flightlabs.types';

/**
 * Configuration options for FlightLabsClient
 */
export interface FlightLabsClientConfig {
  accessKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Custom error class for FlightLabs API errors
 */
export class FlightLabsApiError extends Error {
  constructor(
    message: string,
    public code?: number,
    public type?: string,
    public info?: string
  ) {
    super(message);
    this.name = 'FlightLabsApiError';
  }
}

/**
 * FlightLabs API Client
 * Provides methods to interact with the FlightLabs real-time flights API
 */
export class FlightLabsClient {
  private client: AxiosInstance;
  private accessKey: string;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: FlightLabsClientConfig) {
    this.accessKey = config.accessKey;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;

    this.client = axios.create({
      baseURL: config.baseURL || 'https://app.goflightlabs.com',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      this.handleAxiosError.bind(this)
    );
  }

  /**
   * Handle Axios errors and convert to FlightLabsApiError
   */
  private async handleAxiosError(error: AxiosError): Promise<never> {
    if (error.response) {
      const data = error.response.data as any;
      if (isFlightLabsError(data)) {
        throw new FlightLabsApiError(
          data.error.info,
          data.error.code,
          data.error.type,
          data.error.info
        );
      }
      throw new FlightLabsApiError(
        `API request failed with status ${error.response.status}`,
        error.response.status
      );
    } else if (error.request) {
      throw new FlightLabsApiError('No response received from API');
    } else {
      throw new FlightLabsApiError(`Request failed: ${error.message}`);
    }
  }

  /**
   * Execute API request with retry logic
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    retries = this.maxRetries
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.executeWithRetry(requestFn, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof FlightLabsApiError) {
      // Don't retry client errors (4xx)
      if (error.code && error.code >= 400 && error.code < 500) {
        return false;
      }
    }
    return true;
  }

  /**
   * Build query parameters with access key
   */
  private buildParams(params: Partial<FlightQueryParams> = {}): FlightQueryParams {
    return {
      access_key: this.accessKey,
      ...params,
    };
  }

  /**
   * Get real-time flight data
   * @param params Query parameters for filtering flights
   * @returns Promise with flight data array
   */
  async getFlights(params: Partial<FlightQueryParams> = {}): Promise<FlightData[]> {
    const queryParams = this.buildParams(params);
    
    const response = await this.executeWithRetry(async () => {
      const { data } = await this.client.get<FlightLabsResponse>('/flights', {
        params: queryParams,
      });
      return data;
    });

    if (!response.success) {
      throw new FlightLabsApiError('API returned unsuccessful response');
    }

    return response.data;
  }

  /**
   * Get flights by airline IATA code
   * @param airlineIata Airline IATA code (e.g., 'AA' for American Airlines)
   * @param additionalParams Additional query parameters
   */
  async getFlightsByAirline(
    airlineIata: string,
    additionalParams: Partial<FlightQueryParams> = {}
  ): Promise<FlightData[]> {
    return this.getFlights({ airlineIata, ...additionalParams });
  }

  /**
   * Get flights by flight IATA code
   * @param flightIata Flight IATA code (e.g., 'AA719')
   */
  async getFlightByIata(flightIata: string): Promise<FlightData[]> {
    return this.getFlights({ flightIata });
  }

  /**
   * Get flights between airports
   * @param depIata Departure airport IATA code
   * @param arrIata Arrival airport IATA code
   */
  async getFlightsBetweenAirports(
    depIata: string,
    arrIata: string,
    additionalParams: Partial<FlightQueryParams> = {}
  ): Promise<FlightData[]> {
    return this.getFlights({ depIata, arrIata, ...additionalParams });
  }

  /**
   * Get flights departing from an airport
   * @param depIata Departure airport IATA code
   */
  async getDepartingFlights(
    depIata: string,
    additionalParams: Partial<FlightQueryParams> = {}
  ): Promise<FlightData[]> {
    return this.getFlights({ depIata, ...additionalParams });
  }

  /**
   * Get flights arriving at an airport
   * @param arrIata Arrival airport IATA code
   */
  async getArrivingFlights(
    arrIata: string,
    additionalParams: Partial<FlightQueryParams> = {}
  ): Promise<FlightData[]> {
    return this.getFlights({ arrIata, ...additionalParams });
  }

  /**
   * Get flight by registration number
   * @param regNum Aircraft registration number
   */
  async getFlightByRegistration(regNum: string): Promise<FlightData[]> {
    return this.getFlights({ regNum });
  }

  /**
   * Get flight by hex code
   * @param hex Aircraft ICAO24 hex code
   */
  async getFlightByHex(hex: string): Promise<FlightData[]> {
    return this.getFlights({ hex });
  }

  /**
   * Search flights with multiple criteria
   * @param criteria Multiple search criteria
   */
  async searchFlights(criteria: {
    airline?: { iata?: string; icao?: string };
    flight?: { iata?: string; icao?: string; number?: string };
    departure?: { iata?: string; icao?: string };
    arrival?: { iata?: string; icao?: string };
    aircraft?: { regNum?: string; hex?: string };
    limit?: number;
  }): Promise<FlightData[]> {
    const params: Partial<FlightQueryParams> = {};

    if (criteria.airline?.iata) params.airlineIata = criteria.airline.iata;
    if (criteria.airline?.icao) params.airlineIcao = criteria.airline.icao;
    if (criteria.flight?.iata) params.flightIata = criteria.flight.iata;
    if (criteria.flight?.icao) params.flightIcao = criteria.flight.icao;
    if (criteria.flight?.number) params.flightNum = criteria.flight.number;
    if (criteria.departure?.iata) params.depIata = criteria.departure.iata;
    if (criteria.departure?.icao) params.depIcao = criteria.departure.icao;
    if (criteria.arrival?.iata) params.arrIata = criteria.arrival.iata;
    if (criteria.arrival?.icao) params.arrIcao = criteria.arrival.icao;
    if (criteria.aircraft?.regNum) params.regNum = criteria.aircraft.regNum;
    if (criteria.aircraft?.hex) params.hex = criteria.aircraft.hex;
    if (criteria.limit) params.limit = criteria.limit;

    return this.getFlights(params);
  }

  /**
   * Get flights by call sign
   * @param params Query parameters for call sign search
   * @returns Promise with call sign flight data array
   */
  async getFlightsByCallSign(params: Partial<CallSignQueryParams> = {}): Promise<CallSignFlightData[]> {
    const queryParams = this.buildCallSignParams(params);
    
    const response = await this.executeWithRetry(async () => {
      const { data } = await this.client.get<CallSignFlightResponse>('/flights-with-call-sign', {
        params: queryParams,
      });
      return data;
    });

    if (!response.success) {
      throw new FlightLabsApiError('API returned unsuccessful response');
    }

    return response.data;
  }

  /**
   * Get flight by specific call sign
   * @param callsign The callsign to search for (e.g., 'AAL100')
   * @param additionalParams Additional query parameters
   */
  async getFlightByCallSign(
    callsign: string,
    additionalParams: Partial<CallSignQueryParams> = {}
  ): Promise<CallSignFlightData[]> {
    return this.getFlightsByCallSign({ callsign, ...additionalParams });
  }

  /**
   * Get flights by airline ICAO code using call sign endpoint
   * @param airlineIcao Airline ICAO code
   */
  async getFlightsByAirlineIcao(airlineIcao: string): Promise<CallSignFlightData[]> {
    const queryParams: FlightsByAirlineQueryParams = {
      access_key: this.accessKey,
      airline_icao: airlineIcao,
    };
    
    const response = await this.executeWithRetry(async () => {
      const { data } = await this.client.get<FlightsByAirlineResponse>('/flights-by-airline', {
        params: queryParams,
        baseURL: 'https://www.goflightlabs.com'
      });
      return data;
    });

    if (!response.success) {
      throw new FlightLabsApiError('API returned unsuccessful response');
    }

    return response.data;
  }

  /**
   * Get flights by airline with limit
   * @param airlineIcao Airline ICAO code
   * @param limit Maximum number of results
   * @returns Promise with flight data array
   */
  async getFlightsByAirlineWithLimit(airlineIcao: string, limit: number): Promise<CallSignFlightData[]> {
    const queryParams: FlightsByAirlineQueryParams = {
      access_key: this.accessKey,
      airline_icao: airlineIcao,
      limit,
    };
    
    const response = await this.executeWithRetry(async () => {
      const { data } = await this.client.get<FlightsByAirlineResponse>('/flights-by-airline', {
        params: queryParams,
        baseURL: 'https://www.goflightlabs.com'
      });
      return data;
    });

    if (!response.success) {
      throw new FlightLabsApiError('API returned unsuccessful response');
    }

    return response.data;
  }

  /**
   * Build query parameters for call sign endpoint
   */
  private buildCallSignParams(params: Partial<CallSignQueryParams> = {}): CallSignQueryParams {
    return {
      access_key: this.accessKey,
      ...params,
    };
  }

  /**
   * Get historical flight data
   * @param params Query parameters for historical flights (code and type are required)
   * @returns Promise with historical flight data array
   */
  async getHistoricalFlights(params: HistoricalFlightQueryParams): Promise<HistoricalFlightData[]> {
    const queryParams = {
      ...params,
      access_key: this.accessKey,
    };
    
    const response = await this.executeWithRetry(async () => {
      const { data } = await this.client.get<HistoricalFlightResponse>('/historical', {
        params: queryParams,
      });
      return data;
    });

    if (!response.success) {
      throw new FlightLabsApiError('API returned unsuccessful response');
    }

    return response.data;
  }

  /**
   * Get historical departures from an airport
   * @param airportCode Airport IATA code
   * @param dateFrom Start date/time (YYYY-MM-DDTHH:MM)
   * @param dateTo End date/time (YYYY-MM-DDTHH:MM)
   * @param filters Additional filters
   */
  async getHistoricalDepartures(
    airportCode: string,
    dateFrom: string,
    dateTo: string,
    filters: Partial<HistoricalFlightQueryParams> = {}
  ): Promise<HistoricalFlightData[]> {
    return this.getHistoricalFlights({
      code: airportCode,
      type: 'departure',
      date_from: dateFrom,
      date_to: dateTo,
      ...filters,
    } as HistoricalFlightQueryParams);
  }

  /**
   * Get historical arrivals to an airport
   * @param airportCode Airport IATA code
   * @param dateFrom Start date/time (YYYY-MM-DDTHH:MM)
   * @param dateTo End date/time (YYYY-MM-DDTHH:MM)
   * @param filters Additional filters
   */
  async getHistoricalArrivals(
    airportCode: string,
    dateFrom: string,
    dateTo: string,
    filters: Partial<HistoricalFlightQueryParams> = {}
  ): Promise<HistoricalFlightData[]> {
    return this.getHistoricalFlights({
      code: airportCode,
      type: 'arrival',
      date_from: dateFrom,
      date_to: dateTo,
      ...filters,
    } as HistoricalFlightQueryParams);
  }

  /**
   * Get historical flights for a specific date
   * @param airportCode Airport IATA code
   * @param type 'departure' or 'arrival'
   * @param date Date in YYYY-MM-DD format
   * @param filters Additional filters
   */
  async getHistoricalFlightsByDate(
    airportCode: string,
    type: 'departure' | 'arrival',
    date: string,
    filters: Partial<HistoricalFlightQueryParams> = {}
  ): Promise<HistoricalFlightData[]> {
    return this.getHistoricalFlights({
      code: airportCode,
      type,
      date,
      ...filters,
    } as HistoricalFlightQueryParams);
  }

  /**
   * Get historical flights between two airports
   * @param departureCode Departure airport IATA code
   * @param arrivalCode Arrival airport IATA code
   * @param dateFrom Start date/time
   * @param dateTo End date/time
   */
  async getHistoricalFlightsBetweenAirports(
    departureCode: string,
    arrivalCode: string,
    dateFrom: string,
    dateTo: string
  ): Promise<HistoricalFlightData[]> {
    return this.getHistoricalFlights({
      code: departureCode,
      type: 'departure',
      date_from: dateFrom,
      date_to: dateTo,
      arr_iataCode: arrivalCode,
    } as HistoricalFlightQueryParams);
  }

  /**
   * Get flight schedules
   * @param params Query parameters for flight schedules (iataCode is required)
   * @returns Promise with flight schedule data array
   */
  async getFlightSchedules(params: FlightScheduleQueryParams): Promise<FlightScheduleResponse> {
    const queryParams = {
      ...params,
      access_key: this.accessKey,
    };
    
    const response = await this.executeWithRetry(async () => {
      const { data } = await this.client.get<FlightScheduleResponse>('/advanced-flights-schedules', {
        params: queryParams,
        baseURL: 'https://www.goflightlabs.com'
      });
      return data;
    });

    if (!response.success) {
      throw new FlightLabsApiError('API returned unsuccessful response');
    }

    return response;
  }

  /**
   * Get departure schedules from an airport
   * @param airportCode Airport IATA code
   * @param options Additional query options
   */
  async getDepartureSchedules(
    airportCode: string,
    options: Omit<FlightScheduleQueryParams, 'iataCode' | 'type' | 'access_key'> = {}
  ): Promise<FlightScheduleResponse> {
    return this.getFlightSchedules({
      iataCode: airportCode,
      type: 'departure',
      ...options,
    } as FlightScheduleQueryParams);
  }

  /**
   * Get arrival schedules to an airport
   * @param airportCode Airport IATA code
   * @param options Additional query options
   */
  async getArrivalSchedules(
    airportCode: string,
    options: Omit<FlightScheduleQueryParams, 'iataCode' | 'type' | 'access_key'> = {}
  ): Promise<FlightScheduleResponse> {
    return this.getFlightSchedules({
      iataCode: airportCode,
      type: 'arrival',
      ...options,
    } as FlightScheduleQueryParams);
  }

  /**
   * Get all flight schedules with pagination
   * @param airportCode Airport IATA code
   * @param type 'departure' or 'arrival'
   * @param pageSize Number of results per page
   */
  async *getFlightSchedulesPaginated(
    airportCode: string,
    type: 'departure' | 'arrival' = 'arrival',
    pageSize: number = 100,
    filters: Omit<FlightScheduleQueryParams, 'iataCode' | 'type' | 'limit' | 'skip' | 'access_key'> = {}
  ): AsyncGenerator<FlightScheduleData[], void, unknown> {
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getFlightSchedules({
        iataCode: airportCode,
        type,
        limit: pageSize,
        skip,
        ...filters,
      } as FlightScheduleQueryParams);

      yield response.data;

      if (response.has_more !== undefined) {
        hasMore = response.has_more;
      } else {
        // If has_more is not present, assume no more data if we got less than pageSize
        hasMore = response.data.length === pageSize;
      }

      skip += 1; // API uses skip as page number, not record count
    }
  }

  /**
   * Get schedule for a specific flight
   * @param flightIata Flight IATA code
   * @param airportCode Airport IATA code
   * @param type 'departure' or 'arrival'
   */
  async getFlightSchedule(
    flightIata: string,
    airportCode: string,
    type: 'departure' | 'arrival' = 'departure'
  ): Promise<FlightScheduleData[]> {
    const response = await this.getFlightSchedules({
      iataCode: airportCode,
      type,
      flight_iata: flightIata,
    } as FlightScheduleQueryParams);

    return response.data;
  }

  /**
   * Get future flight predictions
   * @param params Query parameters for future flights (all fields required)
   * @returns Promise with future flight data array
   */
  async getFutureFlights(params: FutureFlightQueryParams): Promise<FutureFlightData[]> {
    const queryParams = {
      ...params,
      access_key: this.accessKey,
    };
    
    const response = await this.executeWithRetry(async () => {
      const { data } = await this.client.get<FutureFlightResponse>('/advanced-future-flights', {
        params: queryParams,
        baseURL: 'https://www.goflightlabs.com'
      });
      return data;
    });

    if (!response.success) {
      throw new FlightLabsApiError('API returned unsuccessful response');
    }

    return response.data;
  }

  /**
   * Get future departures from an airport
   * @param airportCode Airport IATA code
   * @param date Future date in YYYY-MM-DD format
   */
  async getFutureDepartures(
    airportCode: string,
    date: string
  ): Promise<FutureFlightData[]> {
    return this.getFutureFlights({
      iataCode: airportCode,
      type: 'departure',
      date,
    } as FutureFlightQueryParams);
  }

  /**
   * Get future arrivals to an airport
   * @param airportCode Airport IATA code
   * @param date Future date in YYYY-MM-DD format
   */
  async getFutureArrivals(
    airportCode: string,
    date: string
  ): Promise<FutureFlightData[]> {
    return this.getFutureFlights({
      iataCode: airportCode,
      type: 'arrival',
      date,
    } as FutureFlightQueryParams);
  }

  /**
   * Get future flights for date range
   * @param airportCode Airport IATA code
   * @param type 'departure' or 'arrival'
   * @param startDate Start date in YYYY-MM-DD format
   * @param endDate End date in YYYY-MM-DD format
   */
  async getFutureFlightsRange(
    airportCode: string,
    type: 'departure' | 'arrival',
    startDate: string,
    endDate: string
  ): Promise<Map<string, FutureFlightData[]>> {
    const flightsByDate = new Map<string, FutureFlightData[]>();
    
    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    
    // Iterate through dates
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      try {
        const flights = await this.getFutureFlights({
          iataCode: airportCode,
          type,
          date: dateStr,
        } as FutureFlightQueryParams);
        
        flightsByDate.set(dateStr, flights);
      } catch (error) {
        console.error(`Error fetching flights for ${dateStr}:`, error);
        flightsByDate.set(dateStr, []);
      }
      
      // Move to next day
      current.setDate(current.getDate() + 1);
    }
    
    return flightsByDate;
  }

  /**
   * Get delayed flights
   * @param params Query parameters for flight delays (delay and type are required)
   * @returns Promise with delayed flight data array
   */
  async getDelayedFlights(params: FlightDelayQueryParams): Promise<FlightDelayData[]> {
    const queryParams = {
      ...params,
      access_key: this.accessKey,
    };
    
    const response = await this.executeWithRetry(async () => {
      const { data } = await this.client.get<FlightDelayResponse>('/flight_delays', {
        params: queryParams,
        baseURL: 'https://www.goflightlabs.com'
      });
      return data;
    });

    if (!response.success) {
      throw new FlightLabsApiError('API returned unsuccessful response');
    }

    return response.data;
  }

  /**
   * Get delayed departures from an airport
   * @param airportCode Airport IATA code
   * @param minimumDelay Minimum delay in minutes
   * @param filters Additional filters
   */
  async getDelayedDepartures(
    airportCode: string,
    minimumDelay: number,
    filters: Omit<FlightDelayQueryParams, 'delay' | 'type' | 'dep_iata' | 'access_key'> = {}
  ): Promise<FlightDelayData[]> {
    return this.getDelayedFlights({
      delay: minimumDelay,
      type: 'departures',
      dep_iata: airportCode,
      ...filters,
    } as FlightDelayQueryParams);
  }

  /**
   * Get delayed arrivals to an airport
   * @param airportCode Airport IATA code
   * @param minimumDelay Minimum delay in minutes
   * @param filters Additional filters
   */
  async getDelayedArrivals(
    airportCode: string,
    minimumDelay: number,
    filters: Omit<FlightDelayQueryParams, 'delay' | 'type' | 'arr_iata' | 'access_key'> = {}
  ): Promise<FlightDelayData[]> {
    return this.getDelayedFlights({
      delay: minimumDelay,
      type: 'arrivals',
      arr_iata: airportCode,
      ...filters,
    } as FlightDelayQueryParams);
  }

  /**
   * Get delayed flights by airline
   * @param airlineIata Airline IATA code
   * @param minimumDelay Minimum delay in minutes
   * @param type Type of flights (departures or arrivals)
   * @param filters Additional filters
   */
  async getDelayedFlightsByAirline(
    airlineIata: string,
    minimumDelay: number,
    type: 'departures' | 'arrivals',
    filters: Omit<FlightDelayQueryParams, 'delay' | 'type' | 'airline_iata' | 'access_key'> = {}
  ): Promise<FlightDelayData[]> {
    return this.getDelayedFlights({
      delay: minimumDelay,
      type,
      airline_iata: airlineIata,
      ...filters,
    } as FlightDelayQueryParams);
  }

  /**
   * Get delayed flights on a route
   * @param depIata Departure airport IATA
   * @param arrIata Arrival airport IATA
   * @param minimumDelay Minimum delay in minutes
   * @param type Type of flights (departures or arrivals)
   */
  async getDelayedFlightsOnRoute(
    depIata: string,
    arrIata: string,
    minimumDelay: number,
    type: 'departures' | 'arrivals' = 'departures'
  ): Promise<FlightDelayData[]> {
    return this.getDelayedFlights({
      delay: minimumDelay,
      type,
      dep_iata: depIata,
      arr_iata: arrIata,
    } as FlightDelayQueryParams);
  }

  /**
   * Get specific delayed flight
   * @param flightIata Flight IATA code
   * @param minimumDelay Minimum delay in minutes
   * @param type Type of flights (departures or arrivals)
   */
  async getDelayedFlight(
    flightIata: string,
    minimumDelay: number,
    type: 'departures' | 'arrivals' = 'departures'
  ): Promise<FlightDelayData[]> {
    return this.getDelayedFlights({
      delay: minimumDelay,
      type,
      flight_iata: flightIata,
    } as FlightDelayQueryParams);
  }

  /**
   * Get flight information by flight number
   * @param flightNumber Flight number (e.g., '3o375')
   * @param date Optional date in YYYY-MM-DD format
   * @returns Promise with flight schedule data array
   */
  async getFlightByNumber(
    flightNumber: string,
    date?: string
  ): Promise<FlightByNumberData[]> {
    const queryParams: FlightByNumberQueryParams = {
      access_key: this.accessKey,
      flight_number: flightNumber,
    };

    if (date) {
      queryParams.date = date;
    }
    
    const response = await this.executeWithRetry(async () => {
      const { data } = await this.client.get<FlightByNumberResponse>('/flight', {
        params: queryParams,
        baseURL: 'https://www.goflightlabs.com'
      });
      return data;
    });

    if (!response.success) {
      throw new FlightLabsApiError('API returned unsuccessful response');
    }

    return response.data;
  }

  /**
   * Get flight schedules for a specific date
   * @param flightNumber Flight number
   * @param date Date in YYYY-MM-DD format
   */
  async getFlightByNumberOnDate(
    flightNumber: string,
    date: string
  ): Promise<FlightByNumberData[]> {
    return this.getFlightByNumber(flightNumber, date);
  }

  /**
   * Get all scheduled flights for a flight number
   * @param flightNumber Flight number
   */
  async getAllFlightSchedules(flightNumber: string): Promise<FlightByNumberData[]> {
    return this.getFlightByNumber(flightNumber);
  }

  /**
   * Search for flights by number with date range
   * @param flightNumber Flight number
   * @param startDate Start date in YYYY-MM-DD format
   * @param endDate End date in YYYY-MM-DD format
   */
  async getFlightByNumberDateRange(
    flightNumber: string,
    startDate: string,
    endDate: string
  ): Promise<Map<string, FlightByNumberData[]>> {
    const flightsByDate = new Map<string, FlightByNumberData[]>();
    
    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    
    // Iterate through dates
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      try {
        const flights = await this.getFlightByNumber(flightNumber, dateStr);
        
        // Filter to only include flights on the requested date
        const flightsOnDate = flights.filter(flight => {
          // Parse the date from "DD Mon YYYY" format
          const flightDate = this.parseDateString(flight.DATE);
          return flightDate && flightDate.toISOString().split('T')[0] === dateStr;
        });
        
        if (flightsOnDate.length > 0) {
          flightsByDate.set(dateStr, flightsOnDate);
        }
      } catch (error) {
        console.error(`Error fetching flights for ${dateStr}:`, error);
      }
      
      // Move to next day
      current.setDate(current.getDate() + 1);
    }
    
    return flightsByDate;
  }

  /**
   * Parse date string from "DD Mon YYYY" format to Date object
   */
  private parseDateString(dateStr: string): Date | null {
    try {
      const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const parts = dateStr.split(' ');
      if (parts.length !== 3) return null;
      
      const day = parseInt(parts[0]);
      const month = monthMap[parts[1]];
      const year = parseInt(parts[2]);
      
      if (isNaN(day) || month === undefined || isNaN(year)) return null;
      
      return new Date(year, month, day);
    } catch {
      return null;
    }
  }

  /**
   * Search flights by flight number
   * @param flightNumber Flight number to search for (e.g., "AA100", "3o375")
   * @returns Promise with all matching flights or empty array if none found
   */
  async searchFlightByNumber(flightNumber: string): Promise<FlightByNumberData[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      // Search without date to get all occurrences
      const flights = await this.getFlightByNumber(flightNumber);
      
      // If no results, try with today's date
      if (flights.length === 0) {
        return await this.getFlightByNumber(flightNumber, today);
      }
      
      return flights;
    } catch (error) {
      throw new FlightLabsApiError(
        `Failed to search for flight ${flightNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get flight prices/itineraries
   * @param params Query parameters for flight prices (all required fields must be provided)
   * @returns Promise with flight price response containing itineraries
   */
  async getFlightPrices(params: FlightPriceQueryParams): Promise<FlightPriceResponse> {
    const queryParams = {
      ...params,
      access_key: this.accessKey,
    };
    
    const response = await this.executeWithRetry(async () => {
      const { data } = await this.client.get<FlightPriceResponse>('/retrieveFlights', {
        params: queryParams,
        baseURL: 'https://www.goflightlabs.com'
      });
      return data;
    });

    if (!response.context || !response.itineraries) {
      throw new FlightLabsApiError('API returned invalid response structure');
    }

    return response;
  }

  /**
   * Get one-way flight prices
   * @param origin Origin location IDs
   * @param destination Destination location IDs
   * @param date Departure date in YYYY-MM-DD format
   * @param options Additional search options
   */
  async getOneWayFlightPrices(
    origin: { skyId: string; entityId: string },
    destination: { skyId: string; entityId: string },
    date: string,
    options: Omit<FlightPriceQueryParams, 'access_key' | 'originSkyId' | 'destinationSkyId' | 
                 'originEntityId' | 'destinationEntityId' | 'date'> = {}
  ): Promise<FlightPriceResponse> {
    return this.getFlightPrices({
      originSkyId: origin.skyId,
      originEntityId: origin.entityId,
      destinationSkyId: destination.skyId,
      destinationEntityId: destination.entityId,
      date,
      ...options,
    } as FlightPriceQueryParams);
  }

  /**
   * Get round-trip flight prices
   * @param origin Origin location IDs
   * @param destination Destination location IDs
   * @param departureDate Departure date in YYYY-MM-DD format
   * @param returnDate Return date in YYYY-MM-DD format
   * @param options Additional search options
   */
  async getRoundTripFlightPrices(
    origin: { skyId: string; entityId: string },
    destination: { skyId: string; entityId: string },
    departureDate: string,
    returnDate: string,
    options: Omit<FlightPriceQueryParams, 'access_key' | 'originSkyId' | 'destinationSkyId' | 
                 'originEntityId' | 'destinationEntityId' | 'date' | 'returnDate'> = {}
  ): Promise<FlightPriceResponse> {
    return this.getFlightPrices({
      originSkyId: origin.skyId,
      originEntityId: origin.entityId,
      destinationSkyId: destination.skyId,
      destinationEntityId: destination.entityId,
      date: departureDate,
      returnDate,
      ...options,
    } as FlightPriceQueryParams);
  }

  /**
   * Get cheapest flight from search results
   * @param origin Origin location IDs
   * @param destination Destination location IDs
   * @param date Departure date in YYYY-MM-DD format
   * @param options Additional search options
   */
  async getCheapestFlight(
    origin: { skyId: string; entityId: string },
    destination: { skyId: string; entityId: string },
    date: string,
    options: Omit<FlightPriceQueryParams, 'access_key' | 'originSkyId' | 'destinationSkyId' | 
                 'originEntityId' | 'destinationEntityId' | 'date' | 'sortBy'> = {}
  ): Promise<FlightItinerary | null> {
    const response = await this.getFlightPrices({
      originSkyId: origin.skyId,
      originEntityId: origin.entityId,
      destinationSkyId: destination.skyId,
      destinationEntityId: destination.entityId,
      date,
      sortBy: 'best',  // Usually includes cheapest options
      ...options,
    } as FlightPriceQueryParams);

    // Find the cheapest itinerary
    if (response.itineraries.length === 0) {
      return null;
    }

    return response.itineraries.reduce((cheapest, current) => 
      current.price.raw < cheapest.price.raw ? current : cheapest
    );
  }

  /**
   * Get fastest flight from search results
   * @param origin Origin location IDs
   * @param destination Destination location IDs
   * @param date Departure date in YYYY-MM-DD format
   * @param options Additional search options
   */
  async getFastestFlight(
    origin: { skyId: string; entityId: string },
    destination: { skyId: string; entityId: string },
    date: string,
    options: Omit<FlightPriceQueryParams, 'access_key' | 'originSkyId' | 'destinationSkyId' | 
                 'originEntityId' | 'destinationEntityId' | 'date' | 'sortBy'> = {}
  ): Promise<FlightItinerary | null> {
    const response = await this.getFlightPrices({
      originSkyId: origin.skyId,
      originEntityId: origin.entityId,
      destinationSkyId: destination.skyId,
      destinationEntityId: destination.entityId,
      date,
      sortBy: 'fastest',
      ...options,
    } as FlightPriceQueryParams);

    // Return first result when sorted by fastest
    return response.itineraries.length > 0 ? response.itineraries[0] : null;
  }

  /**
   * Get direct flights only
   * @param origin Origin location IDs
   * @param destination Destination location IDs
   * @param date Departure date in YYYY-MM-DD format
   * @param options Additional search options
   */
  async getDirectFlights(
    origin: { skyId: string; entityId: string },
    destination: { skyId: string; entityId: string },
    date: string,
    options: Omit<FlightPriceQueryParams, 'access_key' | 'originSkyId' | 'destinationSkyId' | 
                 'originEntityId' | 'destinationEntityId' | 'date'> = {}
  ): Promise<FlightItinerary[]> {
    const response = await this.getFlightPrices({
      originSkyId: origin.skyId,
      originEntityId: origin.entityId,
      destinationSkyId: destination.skyId,
      destinationEntityId: destination.entityId,
      date,
      ...options,
    } as FlightPriceQueryParams);

    // Filter for direct flights (no stops)
    return response.itineraries.filter(itinerary => 
      itinerary.legs.every(leg => leg.stopCount === 0)
    );
  }

  /**
   * Get flights by specific cabin class
   * @param origin Origin location IDs
   * @param destination Destination location IDs
   * @param date Departure date in YYYY-MM-DD format
   * @param cabinClass Cabin class preference
   * @param options Additional search options
   */
  async getFlightsByCabinClass(
    origin: { skyId: string; entityId: string },
    destination: { skyId: string; entityId: string },
    date: string,
    cabinClass: 'economy' | 'premium_economy' | 'business' | 'first',
    options: Omit<FlightPriceQueryParams, 'access_key' | 'originSkyId' | 'destinationSkyId' | 
                 'originEntityId' | 'destinationEntityId' | 'date' | 'cabinClass'> = {}
  ): Promise<FlightPriceResponse> {
    return this.getFlightPrices({
      originSkyId: origin.skyId,
      originEntityId: origin.entityId,
      destinationSkyId: destination.skyId,
      destinationEntityId: destination.entityId,
      date,
      cabinClass,
      ...options,
    } as FlightPriceQueryParams);
  }

  /**
   * Search for airports by location name
   * @param query Location name to search for (e.g., "New York", "London", "LAX")
   * @returns Promise with array of airport/city search results
   */
  async searchAirports(query: string): Promise<AirportSearchResult[]> {
    const queryParams: AirportSearchQueryParams = {
      access_key: this.accessKey,
      query,
    };
    
    const response = await this.executeWithRetry(async () => {
      const { data } = await this.client.get<AirportSearchResponse | AirportSearchResult[]>('/retrieveAirport', {
        params: queryParams,
        baseURL: 'https://www.goflightlabs.com'
      });
      return data;
    });

    // The API might return the array directly or wrapped in a response object
    if (Array.isArray(response)) {
      return response;
    } else if (response && 'data' in response && response.success) {
      return response.data;
    } else {
      throw new FlightLabsApiError('Invalid response format from airport search API');
    }
  }

  /**
   * Search for a specific airport by IATA code
   * @param iataCode Airport IATA code (e.g., "JFK", "LAX", "LHR")
   * @returns Promise with matching airport result or null if not found
   */
  async getAirportByIata(iataCode: string): Promise<AirportSearchResult | null> {
    const results = await this.searchAirports(iataCode);
    
    // Find exact match for IATA code
    const exactMatch = results.find(result => {
      // Check if it's an airport and the title or skyId matches the IATA code
      return result.navigation.entityType === 'AIRPORT' && 
             (result.skyId === iataCode.toUpperCase() || 
              result.presentation.title.includes(iataCode.toUpperCase()));
    });
    
    return exactMatch || null;
  }

  /**
   * Search for a city and get all associated airports
   * @param cityName City name to search for
   * @returns Promise with city and its airports
   */
  async searchCityAndAirports(cityName: string): Promise<{
    city: AirportSearchResult | null;
    airports: AirportSearchResult[];
  }> {
    const results = await this.searchAirports(cityName);
    
    // Separate city and airport results
    const city = results.find(r => r.navigation.entityType === 'CITY') || null;
    const airports = results.filter(r => r.navigation.entityType === 'AIRPORT');
    
    return { city, airports };
  }

  /**
   * Filter airports by various criteria
   * @param filters Filter criteria (at least one filter is required)
   * @returns Promise with array of matching airports
   */
  async filterAirports(filters: Omit<AirportsByFilterQueryParams, 'access_key'>): Promise<AirportFilterData[]> {
    // Validate that at least one filter is provided
    if (!filters.iata_code && !filters.icao_code && !filters.city_code && !filters.country_code) {
      throw new FlightLabsApiError('At least one filter parameter is required');
    }

    const queryParams: AirportsByFilterQueryParams = {
      access_key: this.accessKey,
      ...filters,
    };
    
    const response = await this.executeWithRetry(async () => {
      const { data } = await this.client.get<AirportsByFilterResponse>('/airports-by-filter', {
        params: queryParams,
        baseURL: 'https://www.goflightlabs.com'
      });
      return data;
    });

    if (!response.success) {
      throw new FlightLabsApiError('API returned unsuccessful response');
    }

    return response.data;
  }

  /**
   * Get detailed airport information by IATA code
   * @param iataCode Airport IATA code
   * @returns Promise with detailed airport data or null if not found
   */
  async getAirportDetailsByIata(iataCode: string): Promise<AirportFilterData | null> {
    const airports = await this.filterAirports({ iata_code: iataCode });
    return airports.length > 0 ? airports[0] : null;
  }

  /**
   * Get detailed airport information by ICAO code
   * @param icaoCode Airport ICAO code
   * @returns Promise with detailed airport data or null if not found
   */
  async getAirportDetailsByIcao(icaoCode: string): Promise<AirportFilterData | null> {
    const airports = await this.filterAirports({ icao_code: icaoCode });
    return airports.length > 0 ? airports[0] : null;
  }

  /**
   * Get all airports in a city
   * @param cityCode IATA city code
   * @returns Promise with array of airports in the city
   */
  async getAirportsByCity(cityCode: string): Promise<AirportFilterData[]> {
    return this.filterAirports({ city_code: cityCode });
  }

  /**
   * Get all airports in a country
   * @param countryCode ISO 2 country code
   * @returns Promise with array of airports in the country
   */
  async getAirportsByCountry(countryCode: string): Promise<AirportFilterData[]> {
    return this.filterAirports({ country_code: countryCode });
  }

  /**
   * Get major airports in a country
   * @param countryCode ISO 2 country code
   * @returns Promise with array of major airports
   */
  async getMajorAirportsByCountry(countryCode: string): Promise<AirportFilterData[]> {
    const airports = await this.filterAirports({ country_code: countryCode });
    return airports.filter(airport => airport.is_major === 1);
  }

  /**
   * Get international airports in a country
   * @param countryCode ISO 2 country code
   * @returns Promise with array of international airports
   */
  async getInternationalAirportsByCountry(countryCode: string): Promise<AirportFilterData[]> {
    const airports = await this.filterAirports({ country_code: countryCode });
    return airports.filter(airport => airport.is_international === 1);
  }

  /**
   * Get active large airports in a country
   * @param countryCode ISO 2 country code
   * @returns Promise with array of active large airports
   */
  async getLargeAirportsByCountry(countryCode: string): Promise<AirportFilterData[]> {
    const airports = await this.filterAirports({ country_code: countryCode });
    return airports.filter(airport => 
      airport.status === 'active' && 
      airport.size === 'large' &&
      airport.type === 'airport'
    );
  }

  /**
   * Get airports by multiple criteria
   * @param criteria Multiple filter criteria
   * @returns Promise with array of matching airports
   */
  async searchAirportsByMultipleCriteria(criteria: {
    city?: string;
    country?: string;
    requireMajor?: boolean;
    requireInternational?: boolean;
    requireSchedules?: boolean;
    minRunways?: number;
    minDepartures?: number;
  }): Promise<AirportFilterData[]> {
    // Start with country or city filter
    let airports: AirportFilterData[] = [];
    
    if (criteria.country) {
      airports = await this.getAirportsByCountry(criteria.country);
    } else if (criteria.city) {
      airports = await this.getAirportsByCity(criteria.city);
    } else {
      throw new FlightLabsApiError('Either city or country must be specified');
    }
    
    // Apply additional filters
    if (criteria.requireMajor) {
      airports = airports.filter(a => a.is_major === 1);
    }
    
    if (criteria.requireInternational) {
      airports = airports.filter(a => a.is_international === 1);
    }
    
    if (criteria.requireSchedules) {
      airports = airports.filter(a => a.with_schedules === 1);
    }
    
    if (criteria.minRunways !== undefined) {
      const minRunways = criteria.minRunways;
      airports = airports.filter(a => a.runways >= minRunways);
    }
    
    if (criteria.minDepartures !== undefined) {
      const minDepartures = criteria.minDepartures;
      airports = airports.filter(a => a.departures >= minDepartures);
    }
    
    return airports;
  }

  /**
   * Get all supported countries with currency and market information
   * @returns Promise with array of country data
   */
  async getCountries(): Promise<CountryData[]> {
    const queryParams = {
      access_key: this.accessKey,
    };
    
    const response = await this.executeWithRetry(async () => {
      const { data } = await this.client.get<CountriesResponse | CountryData[]>('/retrieveCountries', {
        params: queryParams,
        baseURL: 'https://www.goflightlabs.com'
      });
      return data;
    });

    // The API might return the array directly or wrapped in a response object
    if (Array.isArray(response)) {
      return response;
    } else if (response && 'data' in response && response.success) {
      return response.data;
    } else {
      throw new FlightLabsApiError('Invalid response format from countries API');
    }
  }

  /**
   * Get country by country code
   * @param countryCode ISO 2 country code (e.g., "US", "UK", "FR")
   * @returns Promise with country data or null if not found
   */
  async getCountryByCode(countryCode: string): Promise<CountryData | null> {
    const countries = await this.getCountries();
    return countries.find(country => 
      country.countryCode === countryCode.toUpperCase()
    ) || null;
  }

  /**
   * Get countries by currency code
   * @param currencyCode Currency code (e.g., "USD", "EUR", "GBP")
   * @returns Promise with array of countries using that currency
   */
  async getCountriesByCurrency(currencyCode: string): Promise<CountryData[]> {
    const countries = await this.getCountries();
    return countries.filter(country => 
      country.currency === currencyCode.toUpperCase()
    );
  }

  /**
   * Get countries by market locale
   * @param market Market locale (e.g., "en-US", "es-ES", "fr-FR")
   * @returns Promise with array of countries using that market
   */
  async getCountriesByMarket(market: string): Promise<CountryData[]> {
    const countries = await this.getCountries();
    return countries.filter(country => 
      country.market === market
    );
  }

  /**
   * Search countries by name
   * @param searchTerm Search term to match against country names
   * @returns Promise with array of matching countries
   */
  async searchCountriesByName(searchTerm: string): Promise<CountryData[]> {
    const countries = await this.getCountries();
    const term = searchTerm.toLowerCase();
    return countries.filter(country => 
      country.country.toLowerCase().includes(term)
    );
  }

  /**
   * Get detailed country information by ISO 2 code
   * @param countryCode ISO 2 country code (e.g., "US", "SG", "FR")
   * @returns Promise with detailed country data array
   */
  async getCountryDetailsByCode(countryCode: string): Promise<CountryDetailedData[]> {
    const queryParams: CountryByCodeQueryParams = {
      access_key: this.accessKey,
      codeIso2Country: countryCode.toUpperCase(),
    };
    
    const response = await this.executeWithRetry(async () => {
      const { data } = await this.client.get<CountryDetailedData[] | CountryByCodeResponse>('/countries', {
        params: queryParams,
        baseURL: 'https://www.goflightlabs.com'
      });
      return data;
    });

    // The API might return the array directly or wrapped in a response object
    if (Array.isArray(response)) {
      return response;
    } else if (response && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    } else {
      throw new FlightLabsApiError('Invalid response format from countries by code API');
    }
  }

  /**
   * Get airline information
   * @param params Query parameters for airline search
   * @returns Promise with array of airline data
   */
  async getAirlines(params: Omit<AirlineQueryParams, 'access_key'> = {}): Promise<AirlineData[]> {
    const queryParams: AirlineQueryParams = {
      access_key: this.accessKey,
      ...params,
    };
    
    const response = await this.executeWithRetry(async () => {
      const { data } = await this.client.get<AirlineResponse>('/airlines', {
        params: queryParams,
        baseURL: 'https://www.goflightlabs.com'
      });
      return data;
    });

    if (!response.success) {
      throw new FlightLabsApiError('API returned unsuccessful response');
    }

    return response.data;
  }

  /**
   * Get airline by IATA code
   * @param iataCode Airline IATA code (e.g., "AA", "DL", "UA")
   * @returns Promise with airline data or null if not found
   */
  async getAirlineByIataCode(iataCode: string): Promise<AirlineData | null> {
    const airlines = await this.getAirlines({ codeIataAirline: iataCode });
    return airlines.length > 0 ? airlines[0] : null;
  }

  /**
   * Get airlines by country
   * @param countryCode ISO 2 country code (e.g., "US", "GB", "FR")
   * @returns Promise with array of airlines from that country
   */
  async getAirlinesByCountry(countryCode: string): Promise<AirlineData[]> {
    return this.getAirlines({ codeIso2Country: countryCode.toUpperCase() });
  }

  /**
   * Get all airlines
   * @returns Promise with array of all airlines
   */
  async getAllAirlines(): Promise<AirlineData[]> {
    return this.getAirlines();
  }

  /**
   * Search airlines by multiple criteria
   * @param criteria Search criteria
   * @returns Promise with filtered airlines
   */
  async searchAirlines(criteria: {
    country?: string;
    isInternational?: boolean;
    isPassenger?: boolean;
    isCargo?: boolean;
    isScheduled?: boolean;
    minFleetSize?: number;
    maxFleetAge?: number;
    iosaRegistered?: boolean;
  }): Promise<AirlineData[]> {
    // First get airlines, potentially filtered by country
    const airlines = criteria.country 
      ? await this.getAirlinesByCountry(criteria.country)
      : await this.getAllAirlines();
    
    // Apply additional filters
    return airlines.filter(airline => {
      if (criteria.isInternational !== undefined && 
          (airline.is_international === 1) !== criteria.isInternational) {
        return false;
      }
      
      if (criteria.isPassenger !== undefined && 
          (airline.is_passenger === 1) !== criteria.isPassenger) {
        return false;
      }
      
      if (criteria.isCargo !== undefined && 
          (airline.is_cargo === 1) !== criteria.isCargo) {
        return false;
      }
      
      if (criteria.isScheduled !== undefined && 
          (airline.is_scheduled === 1) !== criteria.isScheduled) {
        return false;
      }
      
      if (criteria.minFleetSize !== undefined && 
          airline.total_aircrafts < criteria.minFleetSize) {
        return false;
      }
      
      if (criteria.maxFleetAge !== undefined && 
          airline.average_fleet_age > criteria.maxFleetAge) {
        return false;
      }
      
      if (criteria.iosaRegistered !== undefined && 
          (airline.iosa_registered === 1) !== criteria.iosaRegistered) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Get airline routes
   * @param params Query parameters for route search (at least one filter required)
   * @returns Promise with route data array
   */
  async getRoutes(params: Omit<RouteQueryParams, 'access_key'>): Promise<RouteResponse> {
    // Validate that at least one filter is provided
    if (!params.dep_iata && !params.dep_icao && !params.arr_iata && 
        !params.arr_icao && !params.airline_icao && !params.airline_iata) {
      throw new FlightLabsApiError('At least one filter parameter is required for routes endpoint');
    }

    const queryParams: RouteQueryParams = {
      access_key: this.accessKey,
      ...params,
    };
    
    const response = await this.executeWithRetry(async () => {
      const { data } = await this.client.get<RouteResponse>('/routes', {
        params: queryParams,
        baseURL: 'https://www.goflightlabs.com'
      });
      return data;
    });

    if (!response.success) {
      throw new FlightLabsApiError('API returned unsuccessful response');
    }

    return response;
  }

  /**
   * Get routes between airports
   * @param depIata Departure airport IATA code
   * @param arrIata Arrival airport IATA code
   * @param additionalParams Additional query parameters
   */
  async getRoutesBetweenAirports(
    depIata: string,
    arrIata: string,
    additionalParams: Omit<RouteQueryParams, 'access_key' | 'dep_iata' | 'arr_iata'> = {}
  ): Promise<RouteData[]> {
    const response = await this.getRoutes({
      dep_iata: depIata,
      arr_iata: arrIata,
      ...additionalParams,
    });
    return response.data;
  }

  /**
   * Get routes from a specific airport
   * @param depIata Departure airport IATA code
   * @param additionalParams Additional query parameters
   */
  async getRoutesFromAirport(
    depIata: string,
    additionalParams: Omit<RouteQueryParams, 'access_key' | 'dep_iata'> = {}
  ): Promise<RouteData[]> {
    const response = await this.getRoutes({
      dep_iata: depIata,
      ...additionalParams,
    });
    return response.data;
  }

  /**
   * Get routes to a specific airport
   * @param arrIata Arrival airport IATA code
   * @param additionalParams Additional query parameters
   */
  async getRoutesToAirport(
    arrIata: string,
    additionalParams: Omit<RouteQueryParams, 'access_key' | 'arr_iata'> = {}
  ): Promise<RouteData[]> {
    const response = await this.getRoutes({
      arr_iata: arrIata,
      ...additionalParams,
    });
    return response.data;
  }

  /**
   * Get routes operated by a specific airline
   * @param airlineIata Airline IATA code
   * @param additionalParams Additional query parameters
   */
  async getRoutesByAirline(
    airlineIata: string,
    additionalParams: Omit<RouteQueryParams, 'access_key' | 'airline_iata'> = {}
  ): Promise<RouteData[]> {
    const response = await this.getRoutes({
      airline_iata: airlineIata,
      ...additionalParams,
    });
    return response.data;
  }

  /**
   * Get routes for a specific flight number
   * @param flightNumber Flight number
   * @param airlineIata Optional airline IATA code for disambiguation
   * @param additionalParams Additional query parameters
   */
  async getRoutesByFlightNumber(
    flightNumber: string,
    airlineIata?: string,
    additionalParams: Omit<RouteQueryParams, 'access_key' | 'flight_number' | 'airline_iata'> = {}
  ): Promise<RouteData[]> {
    const response = await this.getRoutes({
      flight_number: flightNumber,
      ...(airlineIata && { airline_iata: airlineIata }),
      ...additionalParams,
    });
    return response.data;
  }

  /**
   * Get all routes with pagination
   * @param filters Required filter parameters
   * @param pageSize Number of results per page (max 500)
   */
  async *getRoutesPaginated(
    filters: Omit<RouteQueryParams, 'access_key' | 'limit' | 'offset'>,
    pageSize: number = 500
  ): AsyncGenerator<RouteData[], void, unknown> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getRoutes({
        ...filters,
        limit: pageSize,
        offset,
      });

      yield response.data;

      // Check if there are more results
      hasMore = response.has_more === true || response.data.length === pageSize;
      offset += response.data.length;
    }
  }

  /**
   * Get routes between airports operated by specific airline
   * @param depIata Departure airport IATA
   * @param arrIata Arrival airport IATA
   * @param airlineIata Airline IATA code
   */
  async getAirlineRoutesBetweenAirports(
    depIata: string,
    arrIata: string,
    airlineIata: string
  ): Promise<RouteData[]> {
    const response = await this.getRoutes({
      dep_iata: depIata,
      arr_iata: arrIata,
      airline_iata: airlineIata,
    });
    return response.data;
  }

  /**
   * Search routes by multiple criteria
   * @param criteria Search criteria
   */
  async searchRoutes(criteria: {
    departure?: { iata?: string; icao?: string };
    arrival?: { iata?: string; icao?: string };
    airline?: { iata?: string; icao?: string };
    flight?: { iata?: string; icao?: string; number?: string };
    fields?: string[];
    limit?: number;
  }): Promise<RouteData[]> {
    const params: Omit<RouteQueryParams, 'access_key'> = {};

    if (criteria.departure?.iata) params.dep_iata = criteria.departure.iata;
    if (criteria.departure?.icao) params.dep_icao = criteria.departure.icao;
    if (criteria.arrival?.iata) params.arr_iata = criteria.arrival.iata;
    if (criteria.arrival?.icao) params.arr_icao = criteria.arrival.icao;
    if (criteria.airline?.iata) params.airline_iata = criteria.airline.iata;
    if (criteria.airline?.icao) params.airline_icao = criteria.airline.icao;
    if (criteria.flight?.iata) params.flight_iata = criteria.flight.iata;
    if (criteria.flight?.icao) params.flight_icao = criteria.flight.icao;
    if (criteria.flight?.number) params.flight_number = criteria.flight.number;
    if (criteria.fields) params._fields = criteria.fields.join(',');
    if (criteria.limit) params.limit = criteria.limit;

    const response = await this.getRoutes(params);
    return response.data;
  }

  /**
   * Get city information by IATA city code
   * @param iataCode IATA city code (e.g., "SIN" for Singapore)
   * @returns Promise with city data or null if not found
   */
  async getCityByIataCode(iataCode: string): Promise<CityData | null> {
    const queryParams: CityQueryParams = {
      access_key: this.accessKey,
      codeIataCity: iataCode.toUpperCase(),
    };
    
    const response = await this.executeWithRetry(async () => {
      const { data } = await this.client.get<CityData[] | CityResponse>('/cities', {
        params: queryParams,
        baseURL: 'https://www.goflightlabs.com'
      });
      return data;
    });

    // The API might return the array directly or wrapped in a response object
    let cityData: CityData[] = [];
    
    if (Array.isArray(response)) {
      cityData = response;
    } else if (response && 'data' in response && Array.isArray(response.data)) {
      cityData = response.data;
    } else {
      throw new FlightLabsApiError('Invalid response format from cities API');
    }

    // Return the first city if found, null otherwise
    return cityData.length > 0 ? cityData[0] : null;
  }
} 