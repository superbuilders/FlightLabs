import { FutureFlightData } from '../../types/flightlabs.types';

/**
 * Utility class for processing future flight data
 */
export class FutureFlightDataProcessor {
  /**
   * Parse ISO time to Date object
   */
  static parseSortTime(sortTime: string): Date {
    return new Date(sortTime);
  }

  /**
   * Parse 24-hour time string to today's date with that time
   */
  static parseTime24(time24: string, baseDate?: Date): Date {
    const [hours, minutes] = time24.split(':').map(Number);
    const date = baseDate ? new Date(baseDate) : new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Format future flight data for display
   */
  static formatFutureFlight(flight: FutureFlightData): {
    carrier: {
      code: string;
      name: string;
      flightNumber: string;
      fullFlightNumber: string;
    };
    schedule: {
      sortTime: Date;
      departure: {
        time12: string;
        time24: string;
        date: Date;
      };
      arrival: {
        time12: string;
        time24: string;
        date: Date;
      };
      duration: number | null; // in minutes
    };
    route: {
      airport: {
        code: string;
        city: string;
      };
    };
    operator: string;
  } {
    const sortTime = this.parseSortTime(flight.sortTime);
    const depTime = this.parseTime24(flight.departureTime.time24, sortTime);
    const arrTime = this.parseTime24(flight.arrivalTime.time24, sortTime);
    
    // Calculate duration
    let duration: number | null = null;
    if (arrTime > depTime) {
      duration = Math.round((arrTime.getTime() - depTime.getTime()) / 60000);
    }

    return {
      carrier: {
        code: flight.carrier.fs,
        name: flight.carrier.name,
        flightNumber: flight.carrier.flightNumber,
        fullFlightNumber: `${flight.carrier.fs}${flight.carrier.flightNumber}`,
      },
      schedule: {
        sortTime,
        departure: {
          time12: flight.departureTime.timeAMPM,
          time24: flight.departureTime.time24,
          date: depTime,
        },
        arrival: {
          time12: flight.arrivalTime.timeAMPM,
          time24: flight.arrivalTime.time24,
          date: arrTime,
        },
        duration,
      },
      route: {
        airport: {
          code: flight.airport.fs,
          city: flight.airport.city,
        },
      },
      operator: flight.operatedBy,
    };
  }

  /**
   * Sort flights by departure time
   */
  static sortByDepartureTime(
    flights: FutureFlightData[],
    order: 'asc' | 'desc' = 'asc'
  ): FutureFlightData[] {
    return [...flights].sort((a, b) => {
      const timeA = this.parseTime24(a.departureTime.time24).getTime();
      const timeB = this.parseTime24(b.departureTime.time24).getTime();
      return order === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }

  /**
   * Sort flights by arrival time
   */
  static sortByArrivalTime(
    flights: FutureFlightData[],
    order: 'asc' | 'desc' = 'asc'
  ): FutureFlightData[] {
    return [...flights].sort((a, b) => {
      const timeA = this.parseTime24(a.arrivalTime.time24).getTime();
      const timeB = this.parseTime24(b.arrivalTime.time24).getTime();
      return order === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }

  /**
   * Group flights by carrier
   */
  static groupByCarrier(flights: FutureFlightData[]): Map<string, FutureFlightData[]> {
    const grouped = new Map<string, FutureFlightData[]>();
    
    flights.forEach(flight => {
      const carrier = flight.carrier.fs;
      if (!grouped.has(carrier)) {
        grouped.set(carrier, []);
      }
      grouped.get(carrier)!.push(flight);
    });
    
    return grouped;
  }

  /**
   * Group flights by destination city
   */
  static groupByCity(flights: FutureFlightData[]): Map<string, FutureFlightData[]> {
    const grouped = new Map<string, FutureFlightData[]>();
    
    flights.forEach(flight => {
      const city = flight.airport.city;
      if (!grouped.has(city)) {
        grouped.set(city, []);
      }
      grouped.get(city)!.push(flight);
    });
    
    return grouped;
  }

  /**
   * Filter flights by time range
   */
  static filterByTimeRange(
    flights: FutureFlightData[],
    startTime: string,
    endTime: string,
    type: 'departure' | 'arrival' = 'departure'
  ): FutureFlightData[] {
    return flights.filter(flight => {
      const time = type === 'departure' 
        ? flight.departureTime.time24 
        : flight.arrivalTime.time24;
      return time >= startTime && time <= endTime;
    });
  }

  /**
   * Get morning flights (before 12:00)
   */
  static getMorningFlights(
    flights: FutureFlightData[],
    type: 'departure' | 'arrival' = 'departure'
  ): FutureFlightData[] {
    return this.filterByTimeRange(flights, '00:00', '11:59', type);
  }

  /**
   * Get afternoon flights (12:00-17:59)
   */
  static getAfternoonFlights(
    flights: FutureFlightData[],
    type: 'departure' | 'arrival' = 'departure'
  ): FutureFlightData[] {
    return this.filterByTimeRange(flights, '12:00', '17:59', type);
  }

  /**
   * Get evening flights (18:00-23:59)
   */
  static getEveningFlights(
    flights: FutureFlightData[],
    type: 'departure' | 'arrival' = 'departure'
  ): FutureFlightData[] {
    return this.filterByTimeRange(flights, '18:00', '23:59', type);
  }

  /**
   * Get codeshare flights
   */
  static getCodeshareFlights(flights: FutureFlightData[]): FutureFlightData[] {
    return flights.filter(flight => 
      flight.operatedBy && 
      flight.operatedBy.toLowerCase().includes('behalf of')
    );
  }

  /**
   * Calculate hourly distribution
   */
  static getHourlyDistribution(
    flights: FutureFlightData[],
    type: 'departure' | 'arrival' = 'departure'
  ): Map<number, number> {
    const distribution = new Map<number, number>();
    
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      distribution.set(i, 0);
    }
    
    flights.forEach(flight => {
      const time = type === 'departure' 
        ? flight.departureTime.time24 
        : flight.arrivalTime.time24;
      const hour = parseInt(time.split(':')[0]);
      distribution.set(hour, (distribution.get(hour) || 0) + 1);
    });
    
    return distribution;
  }

  /**
   * Get carrier statistics
   */
  static getCarrierStatistics(flights: FutureFlightData[]): Map<string, {
    carrier: string;
    count: number;
    percentage: number;
    destinations: Set<string>;
  }> {
    const carrierGroups = this.groupByCarrier(flights);
    const total = flights.length;
    const stats = new Map<string, any>();

    carrierGroups.forEach((carrierFlights, code) => {
      const destinations = new Set<string>();
      carrierFlights.forEach(f => destinations.add(f.airport.city));
      
      stats.set(code, {
        carrier: carrierFlights[0].carrier.name,
        count: carrierFlights.length,
        percentage: (carrierFlights.length / total) * 100,
        destinations,
      });
    });

    return stats;
  }

  /**
   * Get popular routes (by frequency)
   */
  static getPopularRoutes(
    flights: FutureFlightData[],
    minFrequency: number = 2
  ): Array<{
    destination: string;
    count: number;
    carriers: Set<string>;
    flights: FutureFlightData[];
  }> {
    const cityGroups = this.groupByCity(flights);
    const routes: Array<any> = [];

    cityGroups.forEach((cityFlights, city) => {
      if (cityFlights.length >= minFrequency) {
        const carriers = new Set<string>();
        cityFlights.forEach(f => carriers.add(f.carrier.fs));
        
        routes.push({
          destination: city,
          count: cityFlights.length,
          carriers,
          flights: cityFlights,
        });
      }
    });

    return routes.sort((a, b) => b.count - a.count);
  }
} 