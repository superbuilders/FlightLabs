import { FlightByNumberData, hasFlightTime, hasActualDepartureTime } from '../../types/flightlabs.types';

/**
 * Utility class for processing flight-by-number data
 */
export class FlightByNumberProcessor {
  /**
   * Parse date string from "DD Mon YYYY" format to Date
   */
  static parseDate(dateStr: string): Date | null {
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
   * Parse time string "HH:mm" to hours and minutes
   */
  static parseTime(timeStr: string): { hours: number; minutes: number } | null {
    if (timeStr === '—' || !timeStr) return null;
    
    const parts = timeStr.split(':');
    if (parts.length !== 2) return null;
    
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    
    if (isNaN(hours) || isNaN(minutes)) return null;
    
    return { hours, minutes };
  }

  /**
   * Extract airport code from location string
   */
  static extractAirportCode(location: string): string | null {
    const match = location.match(/\(([A-Z]{3})\)$/);
    return match ? match[1] : null;
  }

  /**
   * Extract airport name from location string
   */
  static extractAirportName(location: string): string {
    return location.replace(/\s*\([A-Z]{3}\)$/, '').trim();
  }

  /**
   * Parse flight time duration string
   */
  static parseFlightTime(flightTime: string): number | null {
    if (!hasFlightTime({ 'FLIGHT TIME': flightTime } as FlightByNumberData)) {
      return null;
    }
    
    // Parse various formats like "2h 30m", "1h", "45m"
    const hourMatch = flightTime.match(/(\d+)h/);
    const minuteMatch = flightTime.match(/(\d+)m/);
    
    const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
    const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
    
    return hours * 60 + minutes;
  }

  /**
   * Format flight information for display
   */
  static formatFlightInfo(flight: FlightByNumberData): {
    date: Date | null;
    from: {
      airport: string;
      code: string | null;
    };
    to: {
      airport: string;
      code: string | null;
    };
    aircraft: string;
    flightTime: {
      raw: string;
      minutes: number | null;
      formatted: string;
    };
    schedule: {
      departure: {
        scheduled: { hours: number; minutes: number } | null;
        actual: { hours: number; minutes: number } | null;
        hasActual: boolean;
      };
      arrival: {
        scheduled: { hours: number; minutes: number } | null;
      };
    };
    status: string;
    isScheduled: boolean;
    isLanded: boolean;
    isCancelled: boolean;
  } {
    const date = this.parseDate(flight.DATE);
    const hasActual = hasActualDepartureTime(flight);
    const flightMinutes = this.parseFlightTime(flight['FLIGHT TIME']);
    
    return {
      date,
      from: {
        airport: this.extractAirportName(flight.FROM),
        code: this.extractAirportCode(flight.FROM),
      },
      to: {
        airport: this.extractAirportName(flight.TO),
        code: this.extractAirportCode(flight.TO),
      },
      aircraft: flight.AIRCRAFT,
      flightTime: {
        raw: flight['FLIGHT TIME'],
        minutes: flightMinutes,
        formatted: flightMinutes ? this.formatDuration(flightMinutes) : '—',
      },
      schedule: {
        departure: {
          scheduled: this.parseTime(flight.STD),
          actual: this.parseTime(flight.ATD),
          hasActual,
        },
        arrival: {
          scheduled: this.parseTime(flight.STA),
        },
      },
      status: flight.STATUS,
      isScheduled: flight.STATUS.toLowerCase() === 'scheduled',
      isLanded: flight.STATUS.toLowerCase() === 'landed',
      isCancelled: flight.STATUS.toLowerCase() === 'cancelled',
    };
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
   * Sort flights by date
   */
  static sortByDate(
    flights: FlightByNumberData[],
    order: 'asc' | 'desc' = 'asc'
  ): FlightByNumberData[] {
    return [...flights].sort((a, b) => {
      const dateA = this.parseDate(a.DATE);
      const dateB = this.parseDate(b.DATE);
      
      if (!dateA || !dateB) return 0;
      
      const comparison = dateA.getTime() - dateB.getTime();
      return order === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Sort flights by scheduled departure time
   */
  static sortByDepartureTime(
    flights: FlightByNumberData[],
    order: 'asc' | 'desc' = 'asc'
  ): FlightByNumberData[] {
    return [...flights].sort((a, b) => {
      const timeA = this.parseTime(a.STD);
      const timeB = this.parseTime(b.STD);
      
      if (!timeA || !timeB) return 0;
      
      const minutesA = timeA.hours * 60 + timeA.minutes;
      const minutesB = timeB.hours * 60 + timeB.minutes;
      
      const comparison = minutesA - minutesB;
      return order === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Group flights by date
   */
  static groupByDate(flights: FlightByNumberData[]): Map<string, FlightByNumberData[]> {
    const grouped = new Map<string, FlightByNumberData[]>();
    
    flights.forEach(flight => {
      const date = this.parseDate(flight.DATE);
      if (!date) return;
      
      const dateKey = date.toISOString().split('T')[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(flight);
    });
    
    return grouped;
  }

  /**
   * Group flights by status
   */
  static groupByStatus(flights: FlightByNumberData[]): Map<string, FlightByNumberData[]> {
    const grouped = new Map<string, FlightByNumberData[]>();
    
    flights.forEach(flight => {
      const status = flight.STATUS.toLowerCase();
      if (!grouped.has(status)) {
        grouped.set(status, []);
      }
      grouped.get(status)!.push(flight);
    });
    
    return grouped;
  }

  /**
   * Group flights by aircraft type
   */
  static groupByAircraft(flights: FlightByNumberData[]): Map<string, FlightByNumberData[]> {
    const grouped = new Map<string, FlightByNumberData[]>();
    
    flights.forEach(flight => {
      const aircraft = flight.AIRCRAFT;
      if (!grouped.has(aircraft)) {
        grouped.set(aircraft, []);
      }
      grouped.get(aircraft)!.push(flight);
    });
    
    return grouped;
  }

  /**
   * Filter flights by status
   */
  static filterByStatus(
    flights: FlightByNumberData[],
    status: string
  ): FlightByNumberData[] {
    return flights.filter(flight => 
      flight.STATUS.toLowerCase() === status.toLowerCase()
    );
  }

  /**
   * Get scheduled flights only
   */
  static getScheduledFlights(flights: FlightByNumberData[]): FlightByNumberData[] {
    return this.filterByStatus(flights, 'scheduled');
  }

  /**
   * Get landed flights only
   */
  static getLandedFlights(flights: FlightByNumberData[]): FlightByNumberData[] {
    return this.filterByStatus(flights, 'landed');
  }

  /**
   * Get cancelled flights only
   */
  static getCancelledFlights(flights: FlightByNumberData[]): FlightByNumberData[] {
    return this.filterByStatus(flights, 'cancelled');
  }

  /**
   * Filter flights by date range
   */
  static filterByDateRange(
    flights: FlightByNumberData[],
    startDate: Date,
    endDate: Date
  ): FlightByNumberData[] {
    return flights.filter(flight => {
      const flightDate = this.parseDate(flight.DATE);
      if (!flightDate) return false;
      
      return flightDate >= startDate && flightDate <= endDate;
    });
  }

  /**
   * Get flights for a specific week day
   */
  static filterByWeekDay(
    flights: FlightByNumberData[],
    weekDay: number // 0 = Sunday, 6 = Saturday
  ): FlightByNumberData[] {
    return flights.filter(flight => {
      const date = this.parseDate(flight.DATE);
      return date && date.getDay() === weekDay;
    });
  }

  /**
   * Get unique routes
   */
  static getUniqueRoutes(flights: FlightByNumberData[]): Array<{
    from: string;
    to: string;
    count: number;
  }> {
    const routeMap = new Map<string, number>();
    
    flights.forEach(flight => {
      const routeKey = `${flight.FROM}-${flight.TO}`;
      routeMap.set(routeKey, (routeMap.get(routeKey) || 0) + 1);
    });
    
    return Array.from(routeMap.entries()).map(([route, count]) => {
      const [from, to] = route.split('-');
      return { from, to, count };
    });
  }

  /**
   * Calculate average flight time for a route
   */
  static calculateAverageFlightTime(flights: FlightByNumberData[]): number | null {
    const flightTimes = flights
      .map(f => this.parseFlightTime(f['FLIGHT TIME']))
      .filter(time => time !== null) as number[];
    
    if (flightTimes.length === 0) return null;
    
    const total = flightTimes.reduce((sum, time) => sum + time, 0);
    return Math.round(total / flightTimes.length);
  }

  /**
   * Get flight statistics
   */
  static getStatistics(flights: FlightByNumberData[]): {
    total: number;
    scheduled: number;
    landed: number;
    cancelled: number;
    uniqueRoutes: number;
    uniqueAircraft: number;
    averageFlightTime: number | null;
    statusBreakdown: Map<string, number>;
    aircraftTypes: Map<string, number>;
  } {
    const scheduled = this.getScheduledFlights(flights);
    const landed = this.getLandedFlights(flights);
    const cancelled = this.getCancelledFlights(flights);
    const routes = this.getUniqueRoutes(flights);
    const byAircraft = this.groupByAircraft(flights);
    const byStatus = this.groupByStatus(flights);
    
    return {
      total: flights.length,
      scheduled: scheduled.length,
      landed: landed.length,
      cancelled: cancelled.length,
      uniqueRoutes: routes.length,
      uniqueAircraft: byAircraft.size,
      averageFlightTime: this.calculateAverageFlightTime(flights),
      statusBreakdown: new Map(
        Array.from(byStatus.entries()).map(([status, flts]) => [status, flts.length])
      ),
      aircraftTypes: new Map(
        Array.from(byAircraft.entries()).map(([aircraft, flts]) => [aircraft, flts.length])
      ),
    };
  }

  /**
   * Check if flight is today
   */
  static isToday(flight: FlightByNumberData): boolean {
    const flightDate = this.parseDate(flight.DATE);
    if (!flightDate) return false;
    
    const today = new Date();
    return flightDate.toDateString() === today.toDateString();
  }

  /**
   * Check if flight is in the future
   */
  static isFuture(flight: FlightByNumberData): boolean {
    const flightDate = this.parseDate(flight.DATE);
    if (!flightDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return flightDate > today;
  }

  /**
   * Get next scheduled flight
   */
  static getNextScheduledFlight(flights: FlightByNumberData[]): FlightByNumberData | null {
    const futureFlights = flights
      .filter(f => this.isFuture(f) && f.STATUS.toLowerCase() === 'scheduled')
      .sort((a, b) => {
        const dateA = this.parseDate(a.DATE);
        const dateB = this.parseDate(b.DATE);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      });
    
    return futureFlights[0] || null;
  }
} 