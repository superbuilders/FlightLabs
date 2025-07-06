import { FlightData, FlightStatus } from '../../types/flightlabs.types';

/**
 * Utility class for processing and transforming flight data
 */
export class FlightDataProcessor {
  /**
   * Convert altitude from meters to feet
   */
  static metersToFeet(meters: number): number {
    return Math.round(meters * 3.28084);
  }

  /**
   * Convert speed from km/h to mph
   */
  static kmhToMph(kmh: number): number {
    return Math.round(kmh * 0.621371);
  }

  /**
   * Convert speed from km/h to knots
   */
  static kmhToKnots(kmh: number): number {
    return Math.round(kmh * 0.539957);
  }

  /**
   * Calculate distance between two coordinates (in km)
   */
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private static toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Format flight data for display
   */
  static formatFlightInfo(flight: FlightData): {
    flightNumber: string;
    airline: string;
    aircraft: string;
    route: string;
    position: {
      latitude: number;
      longitude: number;
      altitude: { meters: number; feet: number };
      heading: number;
    };
    speed: {
      horizontal: { kmh: number; mph: number; knots: number };
      vertical: { kmh: number; fpm: number };
    };
    status: string;
    lastUpdate: Date;
  } {
    return {
      flightNumber: flight.flight_iata || flight.flight_icao,
      airline: `${flight.airline_iata} (${flight.airline_icao})`,
      aircraft: `${flight.aircraft_icao} - ${flight.reg_number}`,
      route: `${flight.dep_iata} → ${flight.arr_iata}`,
      position: {
        latitude: flight.lat,
        longitude: flight.lng,
        altitude: {
          meters: flight.alt,
          feet: this.metersToFeet(flight.alt),
        },
        heading: flight.dir,
      },
      speed: {
        horizontal: {
          kmh: flight.speed,
          mph: this.kmhToMph(flight.speed),
          knots: this.kmhToKnots(flight.speed),
        },
        vertical: {
          kmh: flight.v_speed,
          fpm: Math.round(flight.v_speed * 3.28084 * 60 / 1000), // Convert to feet per minute
        },
      },
      status: flight.status,
      lastUpdate: new Date(flight.updated * 1000),
    };
  }

  /**
   * Filter flights by status
   */
  static filterByStatus(flights: FlightData[], status: FlightStatus): FlightData[] {
    return flights.filter(flight => flight.status === status);
  }

  /**
   * Filter flights by altitude range (in meters)
   */
  static filterByAltitude(flights: FlightData[], minAlt: number, maxAlt: number): FlightData[] {
    return flights.filter(flight => flight.alt >= minAlt && flight.alt <= maxAlt);
  }

  /**
   * Sort flights by various criteria
   */
  static sortFlights(
    flights: FlightData[],
    sortBy: 'altitude' | 'speed' | 'updated' | 'flightNumber',
    order: 'asc' | 'desc' = 'asc'
  ): FlightData[] {
    const sorted = [...flights].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'altitude':
          comparison = a.alt - b.alt;
          break;
        case 'speed':
          comparison = a.speed - b.speed;
          break;
        case 'updated':
          comparison = a.updated - b.updated;
          break;
        case 'flightNumber':
          comparison = (a.flight_iata || a.flight_icao).localeCompare(b.flight_iata || b.flight_icao);
          break;
      }
      
      return order === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }

  /**
   * Group flights by airline
   */
  static groupByAirline(flights: FlightData[]): Map<string, FlightData[]> {
    const grouped = new Map<string, FlightData[]>();
    
    flights.forEach(flight => {
      const airline = flight.airline_iata || flight.airline_icao;
      if (!grouped.has(airline)) {
        grouped.set(airline, []);
      }
      grouped.get(airline)!.push(flight);
    });
    
    return grouped;
  }

  /**
   * Get flights within a geographic bounding box
   */
  static filterByBoundingBox(
    flights: FlightData[],
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    }
  ): FlightData[] {
    return flights.filter(flight => 
      flight.lat <= bounds.north &&
      flight.lat >= bounds.south &&
      flight.lng <= bounds.east &&
      flight.lng >= bounds.west
    );
  }

  /**
   * Calculate estimated time to arrival (in minutes)
   * This is a rough estimate based on distance and speed
   */
  static estimateTimeToArrival(
    flight: FlightData,
    arrivalLat: number,
    arrivalLon: number
  ): number | null {
    if (flight.speed === 0) return null;
    
    const distance = this.calculateDistance(
      flight.lat,
      flight.lng,
      arrivalLat,
      arrivalLon
    );
    
    // Convert to minutes
    return Math.round((distance / flight.speed) * 60);
  }

  /**
   * Get age of flight data in seconds
   */
  static getDataAge(flight: FlightData): number {
    return Math.floor(Date.now() / 1000) - flight.updated;
  }

  /**
   * Check if flight data is stale (older than specified seconds)
   */
  static isDataStale(flight: FlightData, maxAgeSeconds: number = 300): boolean {
    return this.getDataAge(flight) > maxAgeSeconds;
  }
} 