import { CallSignFlightData, isOnGround } from '../../types/flightlabs.types';

/**
 * Utility class for processing call sign flight data
 */
export class CallSignDataProcessor {
  /**
   * Convert altitude from meters to feet
   */
  static metersToFeet(meters: number): number {
    return Math.round(meters * 3.28084);
  }

  /**
   * Convert speed from knots to mph
   */
  static knotsToMph(knots: number): number {
    return Math.round(knots * 1.15078);
  }

  /**
   * Convert speed from knots to km/h
   */
  static knotsToKmh(knots: number): number {
    return Math.round(knots * 1.852);
  }

  /**
   * Format call sign flight data for display
   */
  static formatCallSignFlight(flight: CallSignFlightData): {
    flightId: string;
    callsign: string;
    flightNumber: string;
    airline: { iata: string; icao: string };
    aircraft: {
      registration: string;
      icao24: string;
      code: string;
    };
    position: {
      latitude: number;
      longitude: number;
      altitude: { meters: number; feet: number };
      heading: number;
    };
    speed: {
      ground: { knots: number; mph: number; kmh: number };
      vertical: { knots: number; fpm: number };
    };
    status: {
      onGround: boolean;
      squawk: string;
    };
    route: {
      origin: string;
      destination: string;
    };
    lastUpdate: Date;
  } {
    return {
      flightId: flight.id,
      callsign: flight.callsign,
      flightNumber: flight.number,
      airline: {
        iata: flight.airline_iata,
        icao: flight.airline_icao,
      },
      aircraft: {
        registration: flight.registration,
        icao24: flight.icao_24bit,
        code: flight.aircraft_code,
      },
      position: {
        latitude: flight.latitude,
        longitude: flight.longitude,
        altitude: {
          meters: flight.altitude,
          feet: this.metersToFeet(flight.altitude),
        },
        heading: flight.heading,
      },
      speed: {
        ground: {
          knots: flight.ground_speed,
          mph: this.knotsToMph(flight.ground_speed),
          kmh: this.knotsToKmh(flight.ground_speed),
        },
        vertical: {
          knots: flight.vertical_speed,
          fpm: Math.round(flight.vertical_speed * 101.269), // Convert knots to feet per minute
        },
      },
      status: {
        onGround: isOnGround(flight),
        squawk: flight.squawk,
      },
      route: {
        origin: flight.origin_airport_iata,
        destination: flight.destination_airport_iata,
      },
      lastUpdate: new Date(flight.time * 1000),
    };
  }

  /**
   * Filter flights by ground status
   */
  static filterByGroundStatus(flights: CallSignFlightData[], onGround: boolean): CallSignFlightData[] {
    return flights.filter(flight => isOnGround(flight) === onGround);
  }

  /**
   * Get only airborne flights
   */
  static getAirborneFlights(flights: CallSignFlightData[]): CallSignFlightData[] {
    return this.filterByGroundStatus(flights, false);
  }

  /**
   * Get only grounded flights
   */
  static getGroundedFlights(flights: CallSignFlightData[]): CallSignFlightData[] {
    return this.filterByGroundStatus(flights, true);
  }

  /**
   * Sort flights by various criteria
   */
  static sortFlights(
    flights: CallSignFlightData[],
    sortBy: 'altitude' | 'speed' | 'time' | 'callsign',
    order: 'asc' | 'desc' = 'asc'
  ): CallSignFlightData[] {
    const sorted = [...flights].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'altitude':
          comparison = a.altitude - b.altitude;
          break;
        case 'speed':
          comparison = a.ground_speed - b.ground_speed;
          break;
        case 'time':
          comparison = a.time - b.time;
          break;
        case 'callsign':
          comparison = a.callsign.localeCompare(b.callsign);
          break;
      }
      
      return order === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }

  /**
   * Group flights by airline
   */
  static groupByAirline(flights: CallSignFlightData[]): Map<string, CallSignFlightData[]> {
    const grouped = new Map<string, CallSignFlightData[]>();
    
    flights.forEach(flight => {
      const airline = flight.airline_icao || flight.airline_iata || 'Unknown';
      if (!grouped.has(airline)) {
        grouped.set(airline, []);
      }
      grouped.get(airline)!.push(flight);
    });
    
    return grouped;
  }

  /**
   * Get flights with valid route information
   */
  static getFlightsWithRoute(flights: CallSignFlightData[]): CallSignFlightData[] {
    return flights.filter(flight => 
      flight.origin_airport_iata && flight.destination_airport_iata
    );
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
   * Get age of flight data in seconds
   */
  static getDataAge(flight: CallSignFlightData): number {
    return Math.floor(Date.now() / 1000) - flight.time;
  }

  /**
   * Check if flight data is stale
   */
  static isDataStale(flight: CallSignFlightData, maxAgeSeconds: number = 300): boolean {
    return this.getDataAge(flight) > maxAgeSeconds;
  }

  /**
   * Filter flights by squawk code
   */
  static filterBySquawk(flights: CallSignFlightData[], squawk: string): CallSignFlightData[] {
    return flights.filter(flight => flight.squawk === squawk);
  }

  /**
   * Get emergency flights (squawk 7700, 7600, 7500)
   */
  static getEmergencyFlights(flights: CallSignFlightData[]): CallSignFlightData[] {
    const emergencySquawks = ['7700', '7600', '7500'];
    return flights.filter(flight => emergencySquawks.includes(flight.squawk));
  }
} 