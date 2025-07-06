import { FlightScheduleData } from '../../types/flightlabs.types';

/**
 * Utility class for processing flight schedule data
 */
export class ScheduleDataProcessor {
  /**
   * Parse time string to Date object
   * @param timeStr Time string in format "YYYY-MM-DD HH:mm"
   */
  static parseLocalTime(timeStr: string | null): Date | null {
    if (!timeStr) return null;
    return new Date(timeStr.replace(' ', 'T'));
  }

  /**
   * Parse UTC time string to Date object
   */
  static parseUTCTime(timeStr: string | null): Date | null {
    if (!timeStr) return null;
    return new Date(timeStr.replace(' ', 'T') + 'Z');
  }

  /**
   * Convert timestamp to Date
   */
  static timestampToDate(timestamp: number | null): Date | null {
    if (!timestamp) return null;
    return new Date(timestamp * 1000);
  }

  /**
   * Calculate actual delay in minutes
   */
  static calculateDelay(scheduled: Date | null, actual: Date | null): number | null {
    if (!scheduled || !actual) return null;
    return Math.round((actual.getTime() - scheduled.getTime()) / 60000);
  }

  /**
   * Format flight schedule data for display
   */
  static formatScheduledFlight(flight: FlightScheduleData): {
    flightIdentifier: {
      iata: string;
      icao: string;
      number: string;
      airline: {
        iata: string;
        icao: string;
      };
    };
    departure: {
      airport: {
        iata: string;
        icao: string;
      };
      terminal: string | null;
      gate: string | null;
      scheduled: {
        local: Date | null;
        utc: Date | null;
        timestamp: Date | null;
      };
      estimated: {
        local: Date | null;
        utc: Date | null;
        timestamp: Date | null;
      };
      actual: {
        local: Date | null;
        utc: Date | null;
        timestamp: Date | null;
      };
      delay: number | null;
    };
    arrival: {
      airport: {
        iata: string;
        icao: string;
      };
      terminal: string | null;
      gate: string | null;
      baggage: string | null;
      scheduled: {
        local: Date | null;
        utc: Date | null;
        timestamp: Date | null;
      };
      estimated: {
        local: Date | null;
        utc: Date | null;
        timestamp: Date | null;
      };
      actual: {
        local: Date | null;
        utc: Date | null;
        timestamp: Date | null;
      };
      delay: number | null;
    };
    status: string;
    duration: number;
    aircraft: string | null;
    codeshare: {
      airline: string | null;
      flightNumber: string | null;
      flightIata: string | null;
    };
  } {
    const depScheduledLocal = this.parseLocalTime(flight.dep_time);
    const depActualLocal = this.parseLocalTime(flight.dep_actual);
    const arrScheduledLocal = this.parseLocalTime(flight.arr_time);
    const arrActualLocal = this.parseLocalTime(flight.arr_actual);

    return {
      flightIdentifier: {
        iata: flight.flight_iata,
        icao: flight.flight_icao,
        number: flight.flight_number,
        airline: {
          iata: flight.airline_iata,
          icao: flight.airline_icao,
        },
      },
      departure: {
        airport: {
          iata: flight.dep_iata,
          icao: flight.dep_icao,
        },
        terminal: flight.dep_terminal,
        gate: flight.dep_gate,
        scheduled: {
          local: depScheduledLocal,
          utc: this.parseUTCTime(flight.dep_time_utc),
          timestamp: this.timestampToDate(flight.dep_time_ts),
        },
        estimated: {
          local: this.parseLocalTime(flight.dep_estimated),
          utc: this.parseUTCTime(flight.dep_estimated_utc),
          timestamp: this.timestampToDate(flight.dep_estimated_ts),
        },
        actual: {
          local: depActualLocal,
          utc: this.parseUTCTime(flight.dep_actual_utc),
          timestamp: this.timestampToDate(flight.dep_actual_ts),
        },
        delay: flight.dep_delayed || this.calculateDelay(depScheduledLocal, depActualLocal),
      },
      arrival: {
        airport: {
          iata: flight.arr_iata,
          icao: flight.arr_icao,
        },
        terminal: flight.arr_terminal,
        gate: flight.arr_gate,
        baggage: flight.arr_baggage,
        scheduled: {
          local: arrScheduledLocal,
          utc: this.parseUTCTime(flight.arr_time_utc),
          timestamp: this.timestampToDate(flight.arr_time_ts),
        },
        estimated: {
          local: this.parseLocalTime(flight.arr_estimated),
          utc: this.parseUTCTime(flight.arr_estimated_utc),
          timestamp: this.timestampToDate(flight.arr_estimated_ts),
        },
        actual: {
          local: arrActualLocal,
          utc: this.parseUTCTime(flight.arr_actual_utc),
          timestamp: this.timestampToDate(flight.arr_actual_ts),
        },
        delay: flight.arr_delayed || this.calculateDelay(arrScheduledLocal, arrActualLocal),
      },
      status: flight.status,
      duration: flight.duration,
      aircraft: flight.aircraft_icao,
      codeshare: {
        airline: flight.cs_airline_iata,
        flightNumber: flight.cs_flight_number,
        flightIata: flight.cs_flight_iata,
      },
    };
  }

  /**
   * Filter flights by status
   */
  static filterByStatus(
    flights: FlightScheduleData[],
    status: 'scheduled' | 'cancelled' | 'active' | 'landed'
  ): FlightScheduleData[] {
    return flights.filter(flight => flight.status === status);
  }

  /**
   * Filter delayed flights
   */
  static filterDelayedFlights(
    flights: FlightScheduleData[],
    minDelayMinutes: number = 15
  ): FlightScheduleData[] {
    return flights.filter(flight => {
      const depDelay = flight.dep_delayed || 0;
      const arrDelay = flight.arr_delayed || 0;
      return depDelay >= minDelayMinutes || arrDelay >= minDelayMinutes;
    });
  }

  /**
   * Sort flights by departure time
   */
  static sortByDepartureTime(
    flights: FlightScheduleData[],
    order: 'asc' | 'desc' = 'asc'
  ): FlightScheduleData[] {
    return [...flights].sort((a, b) => {
      const timeA = a.dep_time_ts;
      const timeB = b.dep_time_ts;
      return order === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }

  /**
   * Sort flights by arrival time
   */
  static sortByArrivalTime(
    flights: FlightScheduleData[],
    order: 'asc' | 'desc' = 'asc'
  ): FlightScheduleData[] {
    return [...flights].sort((a, b) => {
      const timeA = a.arr_time_ts;
      const timeB = b.arr_time_ts;
      return order === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }

  /**
   * Group flights by airline
   */
  static groupByAirline(flights: FlightScheduleData[]): Map<string, FlightScheduleData[]> {
    const grouped = new Map<string, FlightScheduleData[]>();
    
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
   * Group flights by terminal
   */
  static groupByTerminal(
    flights: FlightScheduleData[],
    type: 'departure' | 'arrival' = 'departure'
  ): Map<string, FlightScheduleData[]> {
    const grouped = new Map<string, FlightScheduleData[]>();
    
    flights.forEach(flight => {
      const terminal = type === 'departure' ? 
        (flight.dep_terminal || 'Unknown') : 
        (flight.arr_terminal || 'Unknown');
      
      if (!grouped.has(terminal)) {
        grouped.set(terminal, []);
      }
      grouped.get(terminal)!.push(flight);
    });
    
    return grouped;
  }

  /**
   * Get flights within time range
   */
  static filterByTimeRange(
    flights: FlightScheduleData[],
    startTime: Date,
    endTime: Date,
    type: 'departure' | 'arrival' = 'departure'
  ): FlightScheduleData[] {
    return flights.filter(flight => {
      const timestamp = type === 'departure' ? flight.dep_time_ts : flight.arr_time_ts;
      const time = timestamp * 1000;
      return time >= startTime.getTime() && time <= endTime.getTime();
    });
  }

  /**
   * Get codeshare flights
   */
  static getCodeshareFlights(flights: FlightScheduleData[]): FlightScheduleData[] {
    return flights.filter(flight => flight.cs_flight_iata !== null);
  }

  /**
   * Calculate on-time performance
   */
  static calculateOnTimePerformance(flights: FlightScheduleData[]): {
    total: number;
    onTime: number;
    delayed: number;
    cancelled: number;
    onTimePercentage: number;
  } {
    const stats = {
      total: flights.length,
      onTime: 0,
      delayed: 0,
      cancelled: 0,
    };

    flights.forEach(flight => {
      if (flight.status === 'cancelled') {
        stats.cancelled++;
      } else if ((flight.dep_delayed || 0) < 15 && (flight.arr_delayed || 0) < 15) {
        stats.onTime++;
      } else {
        stats.delayed++;
      }
    });

    return {
      ...stats,
      onTimePercentage: stats.total > 0 ? (stats.onTime / stats.total) * 100 : 0,
    };
  }

  /**
   * Get upcoming departures
   */
  static getUpcomingDepartures(
    flights: FlightScheduleData[],
    fromTime: Date = new Date(),
    hours: number = 24
  ): FlightScheduleData[] {
    const endTime = new Date(fromTime.getTime() + hours * 60 * 60 * 1000);
    return this.filterByTimeRange(flights, fromTime, endTime, 'departure');
  }

  /**
   * Get gate assignments
   */
  static getGateAssignments(
    flights: FlightScheduleData[],
    type: 'departure' | 'arrival' = 'departure'
  ): Map<string, FlightScheduleData[]> {
    const gateMap = new Map<string, FlightScheduleData[]>();
    
    flights.forEach(flight => {
      const gate = type === 'departure' ? flight.dep_gate : flight.arr_gate;
      if (gate) {
        if (!gateMap.has(gate)) {
          gateMap.set(gate, []);
        }
        gateMap.get(gate)!.push(flight);
      }
    });
    
    return gateMap;
  }
} 