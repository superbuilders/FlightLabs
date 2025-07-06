import { RouteData, isCodeshareRoute, hasTerminalInfo, hasAircraftInfo, operatesOnDay, getDayNames } from '../../types/flightlabs.types';

/**
 * Statistics for route data
 */
export interface RouteStatistics {
  totalRoutes: number;
  uniqueAirlines: number;
  uniqueAirports: number;
  codeshareRoutes: number;
  byAirline: Map<string, number>;
  byDayOfWeek: Map<string, number>;
  averageDuration: number;
  shortestRoute: RouteData | null;
  longestRoute: RouteData | null;
  mostFrequentRoute: RouteData | null;
  routesWithTerminals: number;
  routesWithAircraft: number;
}

/**
 * Grouped routes structure
 */
export interface GroupedRoutes {
  byAirline: Map<string, RouteData[]>;
  byDeparture: Map<string, RouteData[]>;
  byArrival: Map<string, RouteData[]>;
  byAircraft: Map<string, RouteData[]>;
  byDuration: Map<string, RouteData[]>;
  byDayPattern: Map<string, RouteData[]>;
  codeshares: {
    primary: RouteData[];
    codeshared: RouteData[];
  };
}

/**
 * Utility class for processing route data
 */
export class RouteDataProcessor {
  /**
   * Parse time string (HH:mm) to minutes since midnight
   */
  static parseTimeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Format duration in minutes to readable string
   */
  static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  }

  /**
   * Sort routes by departure time
   */
  static sortByDepartureTime(routes: RouteData[], ascending = true): RouteData[] {
    return [...routes].sort((a, b) => {
      const timeA = this.parseTimeToMinutes(a.dep_time);
      const timeB = this.parseTimeToMinutes(b.dep_time);
      return ascending ? timeA - timeB : timeB - timeA;
    });
  }

  /**
   * Sort routes by arrival time
   */
  static sortByArrivalTime(routes: RouteData[], ascending = true): RouteData[] {
    return [...routes].sort((a, b) => {
      const timeA = this.parseTimeToMinutes(a.arr_time);
      const timeB = this.parseTimeToMinutes(b.arr_time);
      return ascending ? timeA - timeB : timeB - timeA;
    });
  }

  /**
   * Sort routes by duration
   */
  static sortByDuration(routes: RouteData[], ascending = true): RouteData[] {
    return [...routes].sort((a, b) => {
      const comparison = a.duration - b.duration;
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Sort routes by frequency (counter)
   */
  static sortByFrequency(routes: RouteData[], ascending = false): RouteData[] {
    return [...routes].sort((a, b) => {
      const comparison = a.counter - b.counter;
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Filter routes by airline
   */
  static filterByAirline(routes: RouteData[], airlineIata: string): RouteData[] {
    return routes.filter(route => route.airline_iata === airlineIata);
  }

  /**
   * Filter routes by day of week
   */
  static filterByDayOfWeek(routes: RouteData[], day: string): RouteData[] {
    return routes.filter(route => operatesOnDay(route, day));
  }

  /**
   * Filter direct routes (no codeshare)
   */
  static filterDirectRoutes(routes: RouteData[]): RouteData[] {
    return routes.filter(route => !isCodeshareRoute(route));
  }

  /**
   * Filter codeshare routes only
   */
  static filterCodeshareRoutes(routes: RouteData[]): RouteData[] {
    return routes.filter(isCodeshareRoute);
  }

  /**
   * Filter routes by duration range
   */
  static filterByDuration(routes: RouteData[], minMinutes: number, maxMinutes: number): RouteData[] {
    return routes.filter(route => 
      route.duration >= minMinutes && route.duration <= maxMinutes
    );
  }

  /**
   * Filter short-haul flights (< 3 hours)
   */
  static filterShortHaul(routes: RouteData[]): RouteData[] {
    return this.filterByDuration(routes, 0, 180);
  }

  /**
   * Filter medium-haul flights (3-6 hours)
   */
  static filterMediumHaul(routes: RouteData[]): RouteData[] {
    return this.filterByDuration(routes, 180, 360);
  }

  /**
   * Filter long-haul flights (> 6 hours)
   */
  static filterLongHaul(routes: RouteData[]): RouteData[] {
    return this.filterByDuration(routes, 360, Infinity);
  }

  /**
   * Group routes by various criteria
   */
  static groupRoutes(routes: RouteData[]): GroupedRoutes {
    const byAirline = new Map<string, RouteData[]>();
    const byDeparture = new Map<string, RouteData[]>();
    const byArrival = new Map<string, RouteData[]>();
    const byAircraft = new Map<string, RouteData[]>();
    const byDuration = new Map<string, RouteData[]>();
    const byDayPattern = new Map<string, RouteData[]>();
    const codeshares = {
      primary: [] as RouteData[],
      codeshared: [] as RouteData[],
    };

    routes.forEach(route => {
      // Group by airline
      if (!byAirline.has(route.airline_iata)) {
        byAirline.set(route.airline_iata, []);
      }
      byAirline.get(route.airline_iata)!.push(route);

      // Group by departure airport
      if (!byDeparture.has(route.dep_iata)) {
        byDeparture.set(route.dep_iata, []);
      }
      byDeparture.get(route.dep_iata)!.push(route);

      // Group by arrival airport
      if (!byArrival.has(route.arr_iata)) {
        byArrival.set(route.arr_iata, []);
      }
      byArrival.get(route.arr_iata)!.push(route);

      // Group by aircraft
      if (route.aircraft_icao) {
        if (!byAircraft.has(route.aircraft_icao)) {
          byAircraft.set(route.aircraft_icao, []);
        }
        byAircraft.get(route.aircraft_icao)!.push(route);
      }

      // Group by duration category
      const durationCategory = this.getDurationCategory(route.duration);
      if (!byDuration.has(durationCategory)) {
        byDuration.set(durationCategory, []);
      }
      byDuration.get(durationCategory)!.push(route);

      // Group by day pattern
      const dayPattern = route.days.sort().join(',');
      if (!byDayPattern.has(dayPattern)) {
        byDayPattern.set(dayPattern, []);
      }
      byDayPattern.get(dayPattern)!.push(route);

      // Separate codeshares
      if (isCodeshareRoute(route)) {
        codeshares.codeshared.push(route);
      } else {
        codeshares.primary.push(route);
      }
    });

    return {
      byAirline,
      byDeparture,
      byArrival,
      byAircraft,
      byDuration,
      byDayPattern,
      codeshares,
    };
  }

  /**
   * Get duration category
   */
  static getDurationCategory(minutes: number): string {
    if (minutes < 60) return 'Under 1 hour';
    if (minutes < 120) return '1-2 hours';
    if (minutes < 180) return '2-3 hours';
    if (minutes < 360) return '3-6 hours';
    if (minutes < 720) return '6-12 hours';
    return 'Over 12 hours';
  }

  /**
   * Calculate route statistics
   */
  static getStatistics(routes: RouteData[]): RouteStatistics {
    const airlines = new Set<string>();
    const airports = new Set<string>();
    const byAirline = new Map<string, number>();
    const byDayOfWeek = new Map<string, number>();
    let totalDuration = 0;
    let codeshareCount = 0;
    let terminalCount = 0;
    let aircraftCount = 0;

    // Initialize day counters
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    days.forEach(day => byDayOfWeek.set(day, 0));

    routes.forEach(route => {
      // Count unique airlines and airports
      airlines.add(route.airline_iata);
      airports.add(route.dep_iata);
      airports.add(route.arr_iata);

      // Count by airline
      byAirline.set(route.airline_iata, (byAirline.get(route.airline_iata) || 0) + 1);

      // Count by day of week
      route.days.forEach(day => {
        byDayOfWeek.set(day, (byDayOfWeek.get(day) || 0) + 1);
      });

      // Sum duration
      totalDuration += route.duration;

      // Count features
      if (isCodeshareRoute(route)) codeshareCount++;
      if (hasTerminalInfo(route)) terminalCount++;
      if (hasAircraftInfo(route)) aircraftCount++;
    });

    // Find extremes
    const sortedByDuration = this.sortByDuration(routes);
    const sortedByFrequency = this.sortByFrequency(routes);

    return {
      totalRoutes: routes.length,
      uniqueAirlines: airlines.size,
      uniqueAirports: airports.size,
      codeshareRoutes: codeshareCount,
      byAirline,
      byDayOfWeek,
      averageDuration: routes.length > 0 ? Math.round(totalDuration / routes.length) : 0,
      shortestRoute: sortedByDuration[0] || null,
      longestRoute: sortedByDuration[sortedByDuration.length - 1] || null,
      mostFrequentRoute: sortedByFrequency[0] || null,
      routesWithTerminals: terminalCount,
      routesWithAircraft: aircraftCount,
    };
  }

  /**
   * Format route information for display
   */
  static formatRoute(route: RouteData): string {
    const lines = [
      `${route.flight_iata} - ${route.airline_iata}`,
      `Route: ${route.dep_iata} → ${route.arr_iata}`,
      `Time: ${route.dep_time} - ${route.arr_time} (${this.formatDuration(route.duration)})`,
      `Days: ${getDayNames(route.days).join(', ')}`,
    ];

    if (route.dep_terminals || route.arr_terminals) {
      const terminals = [];
      if (route.dep_terminals) terminals.push(`Dep: T${route.dep_terminals.join(',')}`);
      if (route.arr_terminals) terminals.push(`Arr: T${route.arr_terminals.join(',')}`);
      lines.push(`Terminals: ${terminals.join(', ')}`);
    }

    if (route.aircraft_icao) {
      lines.push(`Aircraft: ${route.aircraft_icao}`);
    }

    if (isCodeshareRoute(route)) {
      lines.push(`Codeshare: ${route.cs_airline_iata} ${route.cs_flight_iata}`);
    }

    lines.push(`Frequency: ${route.counter} operations`);

    return lines.join('\n');
  }

  /**
   * Get unique route pairs (departure-arrival combinations)
   */
  static getUniqueRoutePairs(routes: RouteData[]): Array<{
    route: string;
    airlines: string[];
    flights: number;
    minDuration: number;
    maxDuration: number;
    avgDuration: number;
  }> {
    const routePairs = new Map<string, RouteData[]>();

    routes.forEach(route => {
      const pair = `${route.dep_iata}-${route.arr_iata}`;
      if (!routePairs.has(pair)) {
        routePairs.set(pair, []);
      }
      routePairs.get(pair)!.push(route);
    });

    return Array.from(routePairs.entries()).map(([pair, routes]) => {
      const airlines = new Set(routes.map(r => r.airline_iata));
      const durations = routes.map(r => r.duration);
      
      return {
        route: pair,
        airlines: Array.from(airlines),
        flights: routes.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      };
    }).sort((a, b) => b.flights - a.flights);
  }

  /**
   * Get competition analysis for a route
   */
  static getRouteCompetition(routes: RouteData[], depIata: string, arrIata: string): {
    airlines: Array<{
      airline: string;
      flights: RouteData[];
      marketShare: number;
      avgDuration: number;
      hasCodeshare: boolean;
      daysOfOperation: string[];
    }>;
    totalFlights: number;
    competitionLevel: 'monopoly' | 'low' | 'medium' | 'high';
  } {
    const routeFlights = routes.filter(r => 
      r.dep_iata === depIata && r.arr_iata === arrIata
    );

    const byAirline = new Map<string, RouteData[]>();
    routeFlights.forEach(route => {
      if (!byAirline.has(route.airline_iata)) {
        byAirline.set(route.airline_iata, []);
      }
      byAirline.get(route.airline_iata)!.push(route);
    });

    const totalFlights = routeFlights.length;
    const airlines = Array.from(byAirline.entries()).map(([airline, flights]) => {
      const allDays = new Set<string>();
      flights.forEach(f => f.days.forEach(d => allDays.add(d)));
      
      const totalDuration = flights.reduce((sum, f) => sum + f.duration, 0);
      
      return {
        airline,
        flights,
        marketShare: Math.round((flights.length / totalFlights) * 100),
        avgDuration: Math.round(totalDuration / flights.length),
        hasCodeshare: flights.some(isCodeshareRoute),
        daysOfOperation: Array.from(allDays).sort(),
      };
    }).sort((a, b) => b.marketShare - a.marketShare);

    // Determine competition level
    let competitionLevel: 'monopoly' | 'low' | 'medium' | 'high';
    if (airlines.length === 1) {
      competitionLevel = 'monopoly';
    } else if (airlines.length <= 2) {
      competitionLevel = 'low';
    } else if (airlines.length <= 4) {
      competitionLevel = 'medium';
    } else {
      competitionLevel = 'high';
    }

    return {
      airlines,
      totalFlights,
      competitionLevel,
    };
  }

  /**
   * Get daily schedule for routes
   */
  static getDailySchedule(routes: RouteData[], day: string): RouteData[] {
    const dayRoutes = this.filterByDayOfWeek(routes, day);
    return this.sortByDepartureTime(dayRoutes);
  }

  /**
   * Analyze terminal usage
   */
  static getTerminalAnalysis(routes: RouteData[]): {
    departure: Map<string, { terminal: string; airlines: Set<string>; routes: number }>;
    arrival: Map<string, { terminal: string; airlines: Set<string>; routes: number }>;
  } {
    const departure = new Map<string, { terminal: string; airlines: Set<string>; routes: number }>();
    const arrival = new Map<string, { terminal: string; airlines: Set<string>; routes: number }>();

    routes.forEach(route => {
      // Analyze departure terminals
      if (route.dep_terminals) {
        route.dep_terminals.forEach(terminal => {
          const key = `${route.dep_iata}-T${terminal}`;
          if (!departure.has(key)) {
            departure.set(key, {
              terminal: `${route.dep_iata} Terminal ${terminal}`,
              airlines: new Set<string>(),
              routes: 0,
            });
          }
          const depData = departure.get(key)!;
          depData.airlines.add(route.airline_iata);
          depData.routes++;
        });
      }

      // Analyze arrival terminals
      if (route.arr_terminals) {
        route.arr_terminals.forEach(terminal => {
          const key = `${route.arr_iata}-T${terminal}`;
          if (!arrival.has(key)) {
            arrival.set(key, {
              terminal: `${route.arr_iata} Terminal ${terminal}`,
              airlines: new Set<string>(),
              routes: 0,
            });
          }
          const arrData = arrival.get(key)!;
          arrData.airlines.add(route.airline_iata);
          arrData.routes++;
        });
      }
    });

    return { departure, arrival };
  }

  /**
   * Find connecting routes
   */
  static findConnectingRoutes(
    routes: RouteData[],
    origin: string,
    destination: string,
    maxLayoverMinutes = 240
  ): Array<{
    outbound: RouteData;
    inbound: RouteData;
    connection: string;
    layoverTime: number;
    totalDuration: number;
    operatingDays: string[];
  }> {
    const connections: Array<any> = [];
    
    // Find all routes from origin
    const fromOrigin = routes.filter(r => r.dep_iata === origin);
    
    // Find all routes to destination
    const toDestination = routes.filter(r => r.arr_iata === destination);
    
    // Check for connections
    fromOrigin.forEach(outbound => {
      toDestination.forEach(inbound => {
        // Check if they connect at the same airport
        if (outbound.arr_iata === inbound.dep_iata) {
          // Calculate layover time
          const outboundArrival = this.parseTimeToMinutes(outbound.arr_time);
          const inboundDeparture = this.parseTimeToMinutes(inbound.dep_time);
          
          let layoverTime = inboundDeparture - outboundArrival;
          
          // Handle overnight connections
          if (layoverTime < 0) {
            layoverTime += 24 * 60; // Add 24 hours
          }
          
          // Check if layover is reasonable
          if (layoverTime >= 45 && layoverTime <= maxLayoverMinutes) {
            // Find common operating days
            const commonDays = outbound.days.filter(day => inbound.days.includes(day));
            
            if (commonDays.length > 0) {
              connections.push({
                outbound,
                inbound,
                connection: outbound.arr_iata,
                layoverTime,
                totalDuration: outbound.duration + layoverTime + inbound.duration,
                operatingDays: commonDays,
              });
            }
          }
        }
      });
    });
    
    // Sort by total duration
    return connections.sort((a, b) => a.totalDuration - b.totalDuration);
  }

  /**
   * Export routes to CSV format
   */
  static exportToCSV(routes: RouteData[]): string {
    const headers = [
      'Airline IATA',
      'Flight Number',
      'Departure',
      'Arrival',
      'Dep Time',
      'Arr Time',
      'Duration',
      'Days',
      'Aircraft',
      'Terminals',
      'Codeshare',
      'Frequency',
    ];

    const rows = routes.map(route => {
      const terminals = [];
      if (route.dep_terminals) terminals.push(`Dep: T${route.dep_terminals.join(',')}`);
      if (route.arr_terminals) terminals.push(`Arr: T${route.arr_terminals.join(',')}`);
      
      return [
        route.airline_iata,
        route.flight_number,
        route.dep_iata,
        route.arr_iata,
        route.dep_time,
        route.arr_time,
        this.formatDuration(route.duration),
        getDayNames(route.days).join('/'),
        route.aircraft_icao || '',
        terminals.join('; '),
        isCodeshareRoute(route) ? `${route.cs_airline_iata} ${route.cs_flight_iata}` : '',
        route.counter.toString(),
      ];
    });

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
  }
} 