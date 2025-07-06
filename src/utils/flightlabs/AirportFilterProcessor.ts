import {
  AirportFilterData,
  AirportNames,
  isMajorAirport,
  isInternationalAirport,
  hasSchedules,
  isActiveAirport,
  getAirportNameInLanguage
} from '../../types/flightlabs.types';

/**
 * Statistics for filtered airport data
 */
export interface AirportFilterStatistics {
  totalAirports: number;
  activeAirports: number;
  majorAirports: number;
  internationalAirports: number;
  airportsWithSchedules: number;
  averageRunways: number;
  averageDepartures: number;
  averageConnections: number;
  bySize: {
    small: number;
    medium: number;
    large: number;
  };
  byType: {
    airport: number;
    heliport: number;
    closed: number;
  };
  byStatus: {
    active: number;
    inactive: number;
    closed: number;
  };
}

/**
 * Grouped airport data
 */
export interface GroupedAirports {
  byCountry: Map<string, AirportFilterData[]>;
  byCity: Map<string, AirportFilterData[]>;
  bySize: Map<string, AirportFilterData[]>;
  byFIR: Map<string, AirportFilterData[]>;
}

/**
 * Processor for airport filter data
 */
export class AirportFilterProcessor {
  private airports: AirportFilterData[];

  constructor(airports: AirportFilterData[]) {
    this.airports = airports;
  }

  /**
   * Get all airports
   */
  getAllAirports(): AirportFilterData[] {
    return this.airports;
  }

  /**
   * Get only active airports
   */
  getActiveAirports(): AirportFilterData[] {
    return this.airports.filter(isActiveAirport);
  }

  /**
   * Get major airports only
   */
  getMajorAirports(): AirportFilterData[] {
    return this.airports.filter(isMajorAirport);
  }

  /**
   * Get international airports only
   */
  getInternationalAirports(): AirportFilterData[] {
    return this.airports.filter(isInternationalAirport);
  }

  /**
   * Get airports with scheduled flights
   */
  getAirportsWithSchedules(): AirportFilterData[] {
    return this.airports.filter(hasSchedules);
  }

  /**
   * Sort airports by popularity
   */
  sortByPopularity(ascending = false): AirportFilterData[] {
    return [...this.airports].sort((a, b) => 
      ascending ? a.popularity - b.popularity : b.popularity - a.popularity
    );
  }

  /**
   * Sort airports by number of departures
   */
  sortByDepartures(ascending = false): AirportFilterData[] {
    return [...this.airports].sort((a, b) => 
      ascending ? a.departures - b.departures : b.departures - a.departures
    );
  }

  /**
   * Sort airports by number of connections
   */
  sortByConnections(ascending = false): AirportFilterData[] {
    return [...this.airports].sort((a, b) => 
      ascending ? a.connections - b.connections : b.connections - a.connections
    );
  }

  /**
   * Sort airports by number of runways
   */
  sortByRunways(ascending = false): AirportFilterData[] {
    return [...this.airports].sort((a, b) => 
      ascending ? a.runways - b.runways : b.runways - a.runways
    );
  }

  /**
   * Filter airports by size
   */
  filterBySize(size: 'small' | 'medium' | 'large'): AirportFilterData[] {
    return this.airports.filter(airport => airport.size === size);
  }

  /**
   * Filter airports by minimum number of runways
   */
  filterByMinRunways(minRunways: number): AirportFilterData[] {
    return this.airports.filter(airport => airport.runways >= minRunways);
  }

  /**
   * Filter airports by minimum number of departures
   */
  filterByMinDepartures(minDepartures: number): AirportFilterData[] {
    return this.airports.filter(airport => airport.departures >= minDepartures);
  }

  /**
   * Filter airports by state/province
   */
  filterByState(state: string): AirportFilterData[] {
    return this.airports.filter(airport => 
      airport.state?.toUpperCase() === state.toUpperCase()
    );
  }

  /**
   * Filter airports by FIR (Flight Information Region)
   */
  filterByFIR(firCode: string): AirportFilterData[] {
    return this.airports.filter(airport => 
      airport.fir_code?.toUpperCase() === firCode.toUpperCase()
    );
  }

  /**
   * Search airports by name (any language)
   */
  searchByName(searchTerm: string): AirportFilterData[] {
    const term = searchTerm.toLowerCase();
    return this.airports.filter(airport => {
      // Check main name
      if (airport.name.toLowerCase().includes(term)) {
        return true;
      }
      
      // Check all language variants
      for (const langName of Object.values(airport.names)) {
        if (langName && langName.toLowerCase().includes(term)) {
          return true;
        }
      }
      
      return false;
    });
  }

  /**
   * Get airports within a coordinate boundary
   */
  filterByCoordinates(bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }): AirportFilterData[] {
    return this.airports.filter(airport => 
      airport.lat >= bounds.minLat &&
      airport.lat <= bounds.maxLat &&
      airport.lng >= bounds.minLng &&
      airport.lng <= bounds.maxLng
    );
  }

  /**
   * Get airports near a coordinate point
   */
  getNearbyAirports(
    lat: number,
    lng: number,
    radiusKm: number
  ): Array<AirportFilterData & { distance: number }> {
    const results = this.airports.map(airport => {
      const distance = this.calculateDistance(lat, lng, airport.lat, airport.lng);
      return { ...airport, distance };
    }).filter(airport => airport.distance <= radiusKm);
    
    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Group airports by various criteria
   */
  groupAirports(): GroupedAirports {
    const byCountry = new Map<string, AirportFilterData[]>();
    const byCity = new Map<string, AirportFilterData[]>();
    const bySize = new Map<string, AirportFilterData[]>();
    const byFIR = new Map<string, AirportFilterData[]>();

    for (const airport of this.airports) {
      // Group by country
      if (!byCountry.has(airport.country_code)) {
        byCountry.set(airport.country_code, []);
      }
      byCountry.get(airport.country_code)!.push(airport);

      // Group by city
      const cityKey = `${airport.city_code}_${airport.city}`;
      if (!byCity.has(cityKey)) {
        byCity.set(cityKey, []);
      }
      byCity.get(cityKey)!.push(airport);

      // Group by size
      if (!bySize.has(airport.size)) {
        bySize.set(airport.size, []);
      }
      bySize.get(airport.size)!.push(airport);

      // Group by FIR
      if (airport.fir_code) {
        if (!byFIR.has(airport.fir_code)) {
          byFIR.set(airport.fir_code, []);
        }
        byFIR.get(airport.fir_code)!.push(airport);
      }
    }

    return { byCountry, byCity, bySize, byFIR };
  }

  /**
   * Get statistics about the airports
   */
  getStatistics(): AirportFilterStatistics {
    const totalAirports = this.airports.length;
    if (totalAirports === 0) {
      return {
        totalAirports: 0,
        activeAirports: 0,
        majorAirports: 0,
        internationalAirports: 0,
        airportsWithSchedules: 0,
        averageRunways: 0,
        averageDepartures: 0,
        averageConnections: 0,
        bySize: { small: 0, medium: 0, large: 0 },
        byType: { airport: 0, heliport: 0, closed: 0 },
        byStatus: { active: 0, inactive: 0, closed: 0 }
      };
    }

    const stats: AirportFilterStatistics = {
      totalAirports,
      activeAirports: 0,
      majorAirports: 0,
      internationalAirports: 0,
      airportsWithSchedules: 0,
      averageRunways: 0,
      averageDepartures: 0,
      averageConnections: 0,
      bySize: { small: 0, medium: 0, large: 0 },
      byType: { airport: 0, heliport: 0, closed: 0 },
      byStatus: { active: 0, inactive: 0, closed: 0 }
    };

    let totalRunways = 0;
    let totalDepartures = 0;
    let totalConnections = 0;

    for (const airport of this.airports) {
      // Count by criteria
      if (isActiveAirport(airport)) stats.activeAirports++;
      if (isMajorAirport(airport)) stats.majorAirports++;
      if (isInternationalAirport(airport)) stats.internationalAirports++;
      if (hasSchedules(airport)) stats.airportsWithSchedules++;

      // Sum for averages
      totalRunways += airport.runways;
      totalDepartures += airport.departures;
      totalConnections += airport.connections;

      // Count by size
      stats.bySize[airport.size]++;

      // Count by type
      const type = airport.type as 'airport' | 'heliport' | 'closed';
      stats.byType[type]++;

      // Count by status
      const status = airport.status as 'active' | 'inactive' | 'closed';
      stats.byStatus[status]++;
    }

    // Calculate averages
    stats.averageRunways = totalRunways / totalAirports;
    stats.averageDepartures = totalDepartures / totalAirports;
    stats.averageConnections = totalConnections / totalAirports;

    return stats;
  }

  /**
   * Format airport for display
   */
  formatAirport(airport: AirportFilterData, languageCode = 'en'): string {
    const name = getAirportNameInLanguage(airport, languageCode);
    const status = airport.status === 'active' ? '✓' : '✗';
    const intl = airport.is_international === 1 ? 'INTL' : 'DOM';
    const major = airport.is_major === 1 ? '★' : '';
    
    return `${status} ${airport.iata_code}/${airport.icao_code} - ${name} (${airport.city}, ${airport.country_code}) ${intl} ${major}`;
  }

  /**
   * Export airports to CSV format
   */
  exportToCSV(): string {
    const headers = [
      'IATA Code', 'ICAO Code', 'Name', 'City', 'Country', 'Latitude', 'Longitude',
      'Elevation (ft)', 'Timezone', 'Type', 'Size', 'Status', 'Major', 'International',
      'Runways', 'Departures', 'Connections', 'Website', 'Popularity'
    ];

    const rows = this.airports.map(airport => [
      airport.iata_code,
      airport.icao_code,
      `"${airport.name}"`,
      `"${airport.city}"`,
      airport.country_code,
      airport.lat,
      airport.lng,
      airport.alt,
      airport.timezone,
      airport.type,
      airport.size,
      airport.status,
      airport.is_major === 1 ? 'Yes' : 'No',
      airport.is_international === 1 ? 'Yes' : 'No',
      airport.runways,
      airport.departures,
      airport.connections,
      airport.website || '',
      airport.popularity
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Get airports with contact information
   */
  getAirportsWithContactInfo(): AirportFilterData[] {
    return this.airports.filter(airport => 
      airport.website || airport.email || airport.phone
    );
  }

  /**
   * Get airports with social media presence
   */
  getAirportsWithSocialMedia(): AirportFilterData[] {
    return this.airports.filter(airport => 
      airport.twitter || airport.facebook || airport.instagram || 
      airport.linkedin || airport.youtube
    );
  }
} 