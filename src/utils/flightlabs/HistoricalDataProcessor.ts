import { HistoricalFlightData } from '../../types/flightlabs.types';

/**
 * Utility class for processing historical flight data
 */
export class HistoricalDataProcessor {
  /**
   * Parse UTC time string to Date object
   */
  static parseUTCTime(utcTime: string): Date {
    // Remove the 'Z' if present and add it back to ensure proper parsing
    const cleanTime = utcTime.replace(/Z$/, '') + 'Z';
    return new Date(cleanTime);
  }

  /**
   * Parse local time string to components
   */
  static parseLocalTime(localTime: string): {
    date: Date;
    offset: string;
  } {
    // Format: "2023-10-04 08:13-04:00"
    const match = localTime.match(/^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2})([+-]\d{2}:\d{2})$/);
    if (!match) {
      throw new Error(`Invalid local time format: ${localTime}`);
    }
    
    return {
      date: new Date(match[1]),
      offset: match[2],
    };
  }

  /**
   * Format historical flight data for display
   */
  static formatHistoricalFlight(flight: HistoricalFlightData): {
    flightNumber: string;
    airline: {
      name: string;
      iata: string;
      icao: string;
    };
    aircraft: {
      model: string;
      isCargo: boolean;
    };
    airport: {
      name: string;
      terminal?: string;
    };
    schedule: {
      utc: Date;
      local: {
        date: Date;
        offset: string;
      };
      formattedUTC: string;
      formattedLocal: string;
    };
    status: {
      flight: string;
      codeshare: string;
    };
    dataQuality: string[];
  } {
    const utcTime = this.parseUTCTime(flight.movement.scheduledTime.utc);
    const localTime = this.parseLocalTime(flight.movement.scheduledTime.local);

    return {
      flightNumber: flight.number,
      airline: {
        name: flight.airline.name,
        iata: flight.airline.iata,
        icao: flight.airline.icao,
      },
      aircraft: {
        model: flight.aircraft.model,
        isCargo: flight.isCargo,
      },
      airport: {
        name: flight.movement.airport.name,
        terminal: flight.movement.terminal,
      },
      schedule: {
        utc: utcTime,
        local: localTime,
        formattedUTC: utcTime.toISOString(),
        formattedLocal: flight.movement.scheduledTime.local,
      },
      status: {
        flight: flight.status,
        codeshare: flight.codeshareStatus,
      },
      dataQuality: flight.movement.quality,
    };
  }

  /**
   * Group flights by airline
   */
  static groupByAirline(flights: HistoricalFlightData[]): Map<string, HistoricalFlightData[]> {
    const grouped = new Map<string, HistoricalFlightData[]>();
    
    flights.forEach(flight => {
      const airline = flight.airline.iata;
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
  static groupByTerminal(flights: HistoricalFlightData[]): Map<string, HistoricalFlightData[]> {
    const grouped = new Map<string, HistoricalFlightData[]>();
    
    flights.forEach(flight => {
      const terminal = flight.movement.terminal || 'Unknown';
      if (!grouped.has(terminal)) {
        grouped.set(terminal, []);
      }
      grouped.get(terminal)!.push(flight);
    });
    
    return grouped;
  }

  /**
   * Sort flights by scheduled time
   */
  static sortByScheduledTime(
    flights: HistoricalFlightData[],
    order: 'asc' | 'desc' = 'asc'
  ): HistoricalFlightData[] {
    return [...flights].sort((a, b) => {
      const timeA = this.parseUTCTime(a.movement.scheduledTime.utc).getTime();
      const timeB = this.parseUTCTime(b.movement.scheduledTime.utc).getTime();
      return order === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }

  /**
   * Filter flights by time range
   */
  static filterByTimeRange(
    flights: HistoricalFlightData[],
    startTime: Date,
    endTime: Date
  ): HistoricalFlightData[] {
    return flights.filter(flight => {
      const flightTime = this.parseUTCTime(flight.movement.scheduledTime.utc);
      return flightTime >= startTime && flightTime <= endTime;
    });
  }

  /**
   * Filter cargo flights
   */
  static filterCargoFlights(flights: HistoricalFlightData[], cargoOnly: boolean = true): HistoricalFlightData[] {
    return flights.filter(flight => flight.isCargo === cargoOnly);
  }

  /**
   * Get flights by status
   */
  static filterByStatus(flights: HistoricalFlightData[], status: string): HistoricalFlightData[] {
    return flights.filter(flight => flight.status === status);
  }

  /**
   * Get codeshare flights
   */
  static getCodeshareFlights(flights: HistoricalFlightData[]): HistoricalFlightData[] {
    return flights.filter(flight => 
      flight.codeshareStatus !== 'Unknown' && 
      flight.codeshareStatus !== 'IsNotCodeshared'
    );
  }

  /**
   * Calculate flight frequency for airlines
   */
  static calculateAirlineFrequency(flights: HistoricalFlightData[]): Map<string, {
    airline: string;
    count: number;
    percentage: number;
  }> {
    const airlineGroups = this.groupByAirline(flights);
    const total = flights.length;
    const frequency = new Map<string, any>();

    airlineGroups.forEach((flights, iata) => {
      const airline = flights[0].airline;
      frequency.set(iata, {
        airline: airline.name,
        count: flights.length,
        percentage: (flights.length / total) * 100,
      });
    });

    return frequency;
  }

  /**
   * Get peak hours based on scheduled times
   */
  static getPeakHours(flights: HistoricalFlightData[]): Map<number, number> {
    const hourCounts = new Map<number, number>();
    
    flights.forEach(flight => {
      const hour = this.parseUTCTime(flight.movement.scheduledTime.utc).getUTCHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });
    
    return hourCounts;
  }

  /**
   * Get flights by aircraft model
   */
  static groupByAircraftModel(flights: HistoricalFlightData[]): Map<string, HistoricalFlightData[]> {
    const grouped = new Map<string, HistoricalFlightData[]>();
    
    flights.forEach(flight => {
      const model = flight.aircraft.model;
      if (!grouped.has(model)) {
        grouped.set(model, []);
      }
      grouped.get(model)!.push(flight);
    });
    
    return grouped;
  }

  /**
   * Extract unique aircraft models
   */
  static getUniqueAircraftModels(flights: HistoricalFlightData[]): string[] {
    const models = new Set<string>();
    flights.forEach(flight => models.add(flight.aircraft.model));
    return Array.from(models).sort();
  }

  /**
   * Get flights with high quality data
   */
  static getHighQualityFlights(flights: HistoricalFlightData[]): HistoricalFlightData[] {
    return flights.filter(flight => 
      !flight.movement.quality.includes('Basic') &&
      flight.movement.quality.length > 0
    );
  }
} 