import { FlightDelayData } from '../../types/flightlabs.types';

/**
 * Utility class for processing flight delay data
 */
export class DelayDataProcessor {
  /**
   * Parse local time string to Date
   */
  static parseLocalTime(timeStr: string | null): Date | null {
    if (!timeStr) return null;
    return new Date(timeStr.replace(' ', 'T') + ':00');
  }

  /**
   * Parse UTC time string to Date
   */
  static parseUTCTime(timeStr: string | null): Date | null {
    if (!timeStr) return null;
    return new Date(timeStr.replace(' ', 'T') + ':00Z');
  }

  /**
   * Convert Unix timestamp to Date
   */
  static timestampToDate(timestamp: number | null): Date | null {
    if (!timestamp) return null;
    return new Date(timestamp * 1000);
  }

  /**
   * Categorize delay severity
   */
  static categorizeDelay(delayMinutes: number): {
    category: 'minor' | 'moderate' | 'major' | 'severe';
    color: string;
    description: string;
  } {
    if (delayMinutes < 15) {
      return {
        category: 'minor',
        color: 'yellow',
        description: 'Minor delay'
      };
    } else if (delayMinutes < 45) {
      return {
        category: 'moderate',
        color: 'orange',
        description: 'Moderate delay'
      };
    } else if (delayMinutes < 120) {
      return {
        category: 'major',
        color: 'red',
        description: 'Major delay'
      };
    } else {
      return {
        category: 'severe',
        color: 'darkred',
        description: 'Severe delay'
      };
    }
  }

  /**
   * Format delayed flight data for display
   */
  static formatDelayedFlight(flight: FlightDelayData): {
    flightIdentifier: {
      iata: string;
      icao: string;
      number: string;
      full: string;
    };
    airline: {
      iata: string;
      icao: string;
    };
    route: {
      departure: {
        airport: string;
        terminal: string | null;
        gate: string | null;
      };
      arrival: {
        airport: string;
        terminal: string | null;
        gate: string | null;
        baggage: string | null;
      };
    };
    schedule: {
      departure: {
        scheduled: {
          local: Date | null;
          utc: Date | null;
        };
        estimated: {
          local: Date | null;
          utc: Date | null;
        };
        actual: {
          local: Date | null;
          utc: Date | null;
        };
      };
      arrival: {
        scheduled: {
          local: Date | null;
          utc: Date | null;
        };
        estimated: {
          local: Date | null;
          utc: Date | null;
        };
      };
    };
    delay: {
      total: number;
      departure: number | null;
      arrival: number | null;
      category: ReturnType<typeof DelayDataProcessor.categorizeDelay>;
    };
    status: string;
    duration: number;
    aircraft: string | null;
    codeshare: {
      airline: string | null;
      flightNumber: string | null;
      flightIata: string | null;
    } | null;
  } {
    const delayCat = this.categorizeDelay(flight.delayed);
    
    return {
      flightIdentifier: {
        iata: flight.flight_iata,
        icao: flight.flight_icao,
        number: flight.flight_number,
        full: flight.flight_iata,
      },
      airline: {
        iata: flight.airline_iata,
        icao: flight.airline_icao,
      },
      route: {
        departure: {
          airport: flight.dep_iata,
          terminal: flight.dep_terminal,
          gate: flight.dep_gate,
        },
        arrival: {
          airport: flight.arr_iata,
          terminal: flight.arr_terminal,
          gate: flight.arr_gate,
          baggage: flight.arr_baggage,
        },
      },
      schedule: {
        departure: {
          scheduled: {
            local: this.parseLocalTime(flight.dep_time),
            utc: this.parseUTCTime(flight.dep_time_utc),
          },
          estimated: {
            local: this.parseLocalTime(flight.dep_estimated),
            utc: this.parseUTCTime(flight.dep_estimated_utc),
          },
          actual: {
            local: this.parseLocalTime(flight.dep_actual),
            utc: this.parseUTCTime(flight.dep_actual_utc),
          },
        },
        arrival: {
          scheduled: {
            local: this.parseLocalTime(flight.arr_time),
            utc: this.parseUTCTime(flight.arr_time_utc),
          },
          estimated: {
            local: this.parseLocalTime(flight.arr_estimated),
            utc: this.parseUTCTime(flight.arr_estimated_utc),
          },
        },
      },
      delay: {
        total: flight.delayed,
        departure: flight.dep_delayed,
        arrival: flight.arr_delayed,
        category: delayCat,
      },
      status: flight.status,
      duration: flight.duration,
      aircraft: flight.aircraft_icao,
      codeshare: flight.cs_airline_iata ? {
        airline: flight.cs_airline_iata,
        flightNumber: flight.cs_flight_number,
        flightIata: flight.cs_flight_iata,
      } : null,
    };
  }

  /**
   * Sort delayed flights by delay time
   */
  static sortByDelayTime(
    flights: FlightDelayData[],
    order: 'asc' | 'desc' = 'desc'
  ): FlightDelayData[] {
    return [...flights].sort((a, b) => {
      const comparison = a.delayed - b.delayed;
      return order === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Sort by departure delay
   */
  static sortByDepartureDelay(
    flights: FlightDelayData[],
    order: 'asc' | 'desc' = 'desc'
  ): FlightDelayData[] {
    return [...flights].sort((a, b) => {
      const delayA = a.dep_delayed || 0;
      const delayB = b.dep_delayed || 0;
      const comparison = delayA - delayB;
      return order === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Sort by arrival delay
   */
  static sortByArrivalDelay(
    flights: FlightDelayData[],
    order: 'asc' | 'desc' = 'desc'
  ): FlightDelayData[] {
    return [...flights].sort((a, b) => {
      const delayA = a.arr_delayed || 0;
      const delayB = b.arr_delayed || 0;
      const comparison = delayA - delayB;
      return order === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Group delayed flights by airline
   */
  static groupByAirline(flights: FlightDelayData[]): Map<string, FlightDelayData[]> {
    const grouped = new Map<string, FlightDelayData[]>();
    
    flights.forEach(flight => {
      const airline = flight.airline_iata;
      if (!grouped.has(airline)) {
        grouped.set(airline, []);
      }
      grouped.get(airline)!.push(flight);
    });
    
    return grouped;
  }

  /**
   * Group delayed flights by delay category
   */
  static groupByDelayCategory(flights: FlightDelayData[]): Map<string, FlightDelayData[]> {
    const grouped = new Map<string, FlightDelayData[]>();
    
    flights.forEach(flight => {
      const category = this.categorizeDelay(flight.delayed).category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(flight);
    });
    
    return grouped;
  }

  /**
   * Group by departure airport
   */
  static groupByDepartureAirport(flights: FlightDelayData[]): Map<string, FlightDelayData[]> {
    const grouped = new Map<string, FlightDelayData[]>();
    
    flights.forEach(flight => {
      const airport = flight.dep_iata;
      if (!grouped.has(airport)) {
        grouped.set(airport, []);
      }
      grouped.get(airport)!.push(flight);
    });
    
    return grouped;
  }

  /**
   * Group by arrival airport
   */
  static groupByArrivalAirport(flights: FlightDelayData[]): Map<string, FlightDelayData[]> {
    const grouped = new Map<string, FlightDelayData[]>();
    
    flights.forEach(flight => {
      const airport = flight.arr_iata;
      if (!grouped.has(airport)) {
        grouped.set(airport, []);
      }
      grouped.get(airport)!.push(flight);
    });
    
    return grouped;
  }

  /**
   * Filter by delay severity
   */
  static filterBySeverity(
    flights: FlightDelayData[],
    minDelay: number,
    maxDelay?: number
  ): FlightDelayData[] {
    return flights.filter(flight => {
      if (maxDelay !== undefined) {
        return flight.delayed >= minDelay && flight.delayed <= maxDelay;
      }
      return flight.delayed >= minDelay;
    });
  }

  /**
   * Filter by status
   */
  static filterByStatus(
    flights: FlightDelayData[],
    status: 'scheduled' | 'active' | 'landed' | 'cancelled'
  ): FlightDelayData[] {
    return flights.filter(flight => flight.status === status);
  }

  /**
   * Get active delayed flights
   */
  static getActiveDelays(flights: FlightDelayData[]): FlightDelayData[] {
    return this.filterByStatus(flights, 'active');
  }

  /**
   * Get codeshare flights
   */
  static getCodeshareFlights(flights: FlightDelayData[]): FlightDelayData[] {
    return flights.filter(flight => flight.cs_airline_iata !== null);
  }

  /**
   * Calculate delay statistics
   */
  static calculateDelayStatistics(flights: FlightDelayData[]): {
    totalFlights: number;
    averageDelay: number;
    maxDelay: number;
    minDelay: number;
    medianDelay: number;
    totalDelayMinutes: number;
    byCategory: Map<string, number>;
    averageDepartureDelay: number;
    averageArrivalDelay: number;
    flightsWithDepartureDelay: number;
    flightsWithArrivalDelay: number;
  } {
    if (flights.length === 0) {
      return {
        totalFlights: 0,
        averageDelay: 0,
        maxDelay: 0,
        minDelay: 0,
        medianDelay: 0,
        totalDelayMinutes: 0,
        byCategory: new Map(),
        averageDepartureDelay: 0,
        averageArrivalDelay: 0,
        flightsWithDepartureDelay: 0,
        flightsWithArrivalDelay: 0,
      };
    }

    const delays = flights.map(f => f.delayed);
    const sortedDelays = [...delays].sort((a, b) => a - b);
    const totalDelay = delays.reduce((sum, delay) => sum + delay, 0);
    
    // Calculate departure and arrival delay statistics
    const depDelays = flights
      .filter(f => f.dep_delayed !== null)
      .map(f => f.dep_delayed!);
    const arrDelays = flights
      .filter(f => f.arr_delayed !== null)
      .map(f => f.arr_delayed!);
    
    // Group by category
    const byCategory = new Map<string, number>();
    flights.forEach(flight => {
      const category = this.categorizeDelay(flight.delayed).category;
      byCategory.set(category, (byCategory.get(category) || 0) + 1);
    });

    return {
      totalFlights: flights.length,
      averageDelay: Math.round(totalDelay / flights.length),
      maxDelay: Math.max(...delays),
      minDelay: Math.min(...delays),
      medianDelay: sortedDelays[Math.floor(sortedDelays.length / 2)],
      totalDelayMinutes: totalDelay,
      byCategory,
      averageDepartureDelay: depDelays.length > 0 
        ? Math.round(depDelays.reduce((a, b) => a + b, 0) / depDelays.length)
        : 0,
      averageArrivalDelay: arrDelays.length > 0
        ? Math.round(arrDelays.reduce((a, b) => a + b, 0) / arrDelays.length)
        : 0,
      flightsWithDepartureDelay: depDelays.length,
      flightsWithArrivalDelay: arrDelays.length,
    };
  }

  /**
   * Calculate airline delay performance
   */
  static calculateAirlineDelayPerformance(flights: FlightDelayData[]): Map<string, {
    airline: string;
    totalFlights: number;
    averageDelay: number;
    maxDelay: number;
    delayCategories: Map<string, number>;
  }> {
    const airlineGroups = this.groupByAirline(flights);
    const performance = new Map<string, any>();

    airlineGroups.forEach((airlineFlights, iata) => {
      const stats = this.calculateDelayStatistics(airlineFlights);
      performance.set(iata, {
        airline: iata,
        totalFlights: airlineFlights.length,
        averageDelay: stats.averageDelay,
        maxDelay: stats.maxDelay,
        delayCategories: stats.byCategory,
      });
    });

    return performance;
  }

  /**
   * Get worst delays
   */
  static getWorstDelays(flights: FlightDelayData[], limit: number = 10): FlightDelayData[] {
    return this.sortByDelayTime(flights, 'desc').slice(0, limit);
  }

  /**
   * Calculate delay cost estimate (rough estimate based on industry averages)
   */
  static estimateDelayCost(
    delayMinutes: number,
    passengers: number = 150,
    costPerMinutePerPassenger: number = 1.5
  ): {
    passengerCost: number;
    airlineCost: number;
    totalCost: number;
  } {
    const passengerCost = delayMinutes * passengers * costPerMinutePerPassenger;
    const airlineCost = delayMinutes * 65; // Industry average per minute
    
    return {
      passengerCost: Math.round(passengerCost),
      airlineCost: Math.round(airlineCost),
      totalCost: Math.round(passengerCost + airlineCost),
    };
  }

  /**
   * Format delay duration
   */
  static formatDelayDuration(minutes: number): string {
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
   * Get delay trend (comparing departure vs arrival delay)
   */
  static getDelayTrend(flight: FlightDelayData): 'improving' | 'worsening' | 'stable' | 'unknown' {
    if (flight.dep_delayed === null || flight.arr_delayed === null) {
      return 'unknown';
    }
    
    const difference = flight.arr_delayed - flight.dep_delayed;
    if (difference > 5) {
      return 'worsening';
    } else if (difference < -5) {
      return 'improving';
    } else {
      return 'stable';
    }
  }
} 