import { AirlineData, isInternationalAirline, isPassengerAirline, isCargoAirline, isScheduledAirline, isIosaRegistered } from '../../types/flightlabs.types';

/**
 * Statistics for airline data
 */
export interface AirlineStatistics {
  totalAirlines: number;
  internationalAirlines: number;
  domesticAirlines: number;
  passengerAirlines: number;
  cargoAirlines: number;
  scheduledAirlines: number;
  iosaRegistered: number;
  byCountry: Map<string, number>;
  avgFleetSize: number;
  avgFleetAge: number;
  totalAircraft: number;
  totalAccidents: number;
  totalCrashes: number;
}

/**
 * Grouped airlines structure
 */
export interface GroupedAirlines {
  byCountry: Map<string, AirlineData[]>;
  byFleetSize: Map<string, AirlineData[]>;
  byType: {
    international: AirlineData[];
    domestic: AirlineData[];
    passenger: AirlineData[];
    cargo: AirlineData[];
    mixed: AirlineData[];
  };
  bySafety: {
    safe: AirlineData[];  // 0 crashes in last 5 years
    caution: AirlineData[];  // Has accidents but no crashes
    risk: AirlineData[];  // Has crashes
  };
}

/**
 * Utility class for processing airline data
 */
export class AirlineDataProcessor {
  /**
   * Sort airlines by name
   */
  static sortByName(airlines: AirlineData[], ascending = true): AirlineData[] {
    return [...airlines].sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      const comparison = nameA.localeCompare(nameB);
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Sort airlines by fleet size
   */
  static sortByFleetSize(airlines: AirlineData[], ascending = false): AirlineData[] {
    return [...airlines].sort((a, b) => {
      const comparison = a.total_aircrafts - b.total_aircrafts;
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Sort airlines by fleet age
   */
  static sortByFleetAge(airlines: AirlineData[], ascending = true): AirlineData[] {
    return [...airlines].sort((a, b) => {
      const comparison = a.average_fleet_age - b.average_fleet_age;
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Sort airlines by safety record (crashes, then accidents)
   */
  static sortBySafety(airlines: AirlineData[], ascending = true): AirlineData[] {
    return [...airlines].sort((a, b) => {
      // First compare by crashes
      let comparison = a.crashes_last_5y - b.crashes_last_5y;
      if (comparison === 0) {
        // Then by accidents
        comparison = a.accidents_last_5y - b.accidents_last_5y;
      }
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Filter airlines by country
   */
  static filterByCountry(airlines: AirlineData[], countryCode: string): AirlineData[] {
    return airlines.filter(airline => airline.country_code === countryCode.toUpperCase());
  }

  /**
   * Filter international airlines only
   */
  static filterInternational(airlines: AirlineData[]): AirlineData[] {
    return airlines.filter(isInternationalAirline);
  }

  /**
   * Filter domestic airlines only
   */
  static filterDomestic(airlines: AirlineData[]): AirlineData[] {
    return airlines.filter(airline => !isInternationalAirline(airline));
  }

  /**
   * Filter passenger airlines
   */
  static filterPassenger(airlines: AirlineData[]): AirlineData[] {
    return airlines.filter(isPassengerAirline);
  }

  /**
   * Filter cargo airlines
   */
  static filterCargo(airlines: AirlineData[]): AirlineData[] {
    return airlines.filter(isCargoAirline);
  }

  /**
   * Filter IOSA registered airlines
   */
  static filterIosaRegistered(airlines: AirlineData[]): AirlineData[] {
    return airlines.filter(isIosaRegistered);
  }

  /**
   * Filter airlines with no crashes in last 5 years
   */
  static filterSafeAirlines(airlines: AirlineData[]): AirlineData[] {
    return airlines.filter(airline => airline.crashes_last_5y === 0);
  }

  /**
   * Filter airlines by minimum fleet size
   */
  static filterByMinFleetSize(airlines: AirlineData[], minSize: number): AirlineData[] {
    return airlines.filter(airline => airline.total_aircrafts >= minSize);
  }

  /**
   * Group airlines by various criteria
   */
  static groupAirlines(airlines: AirlineData[]): GroupedAirlines {
    const byCountry = new Map<string, AirlineData[]>();
    const byFleetSize = new Map<string, AirlineData[]>();
    
    const grouped: GroupedAirlines = {
      byCountry,
      byFleetSize,
      byType: {
        international: [],
        domestic: [],
        passenger: [],
        cargo: [],
        mixed: [],
      },
      bySafety: {
        safe: [],
        caution: [],
        risk: [],
      },
    };

    airlines.forEach(airline => {
      // Group by country
      if (!byCountry.has(airline.country_code)) {
        byCountry.set(airline.country_code, []);
      }
      byCountry.get(airline.country_code)!.push(airline);

      // Group by fleet size category
      const sizeCategory = this.getFleetSizeCategory(airline.total_aircrafts);
      if (!byFleetSize.has(sizeCategory)) {
        byFleetSize.set(sizeCategory, []);
      }
      byFleetSize.get(sizeCategory)!.push(airline);

      // Group by type
      if (isInternationalAirline(airline)) {
        grouped.byType.international.push(airline);
      } else {
        grouped.byType.domestic.push(airline);
      }

      if (isPassengerAirline(airline)) {
        grouped.byType.passenger.push(airline);
      }

      if (isCargoAirline(airline)) {
        grouped.byType.cargo.push(airline);
      }

      if (isPassengerAirline(airline) && isCargoAirline(airline)) {
        grouped.byType.mixed.push(airline);
      }

      // Group by safety
      if (airline.crashes_last_5y > 0) {
        grouped.bySafety.risk.push(airline);
      } else if (airline.accidents_last_5y > 0) {
        grouped.bySafety.caution.push(airline);
      } else {
        grouped.bySafety.safe.push(airline);
      }
    });

    return grouped;
  }

  /**
   * Get fleet size category
   */
  static getFleetSizeCategory(fleetSize: number): string {
    if (fleetSize >= 500) return 'Mega Carrier';
    if (fleetSize >= 200) return 'Large Carrier';
    if (fleetSize >= 50) return 'Medium Carrier';
    if (fleetSize >= 20) return 'Small Carrier';
    if (fleetSize >= 5) return 'Regional Carrier';
    return 'Boutique Carrier';
  }

  /**
   * Calculate statistics for airlines
   */
  static getStatistics(airlines: AirlineData[]): AirlineStatistics {
    const byCountry = new Map<string, number>();
    let totalAircraft = 0;
    let totalFleetAge = 0;
    let totalAccidents = 0;
    let totalCrashes = 0;

    airlines.forEach(airline => {
      // Count by country
      byCountry.set(airline.country_code, (byCountry.get(airline.country_code) || 0) + 1);
      
      // Sum totals
      totalAircraft += airline.total_aircrafts;
      totalFleetAge += airline.average_fleet_age;
      totalAccidents += airline.accidents_last_5y;
      totalCrashes += airline.crashes_last_5y;
    });

    return {
      totalAirlines: airlines.length,
      internationalAirlines: airlines.filter(isInternationalAirline).length,
      domesticAirlines: airlines.filter(a => !isInternationalAirline(a)).length,
      passengerAirlines: airlines.filter(isPassengerAirline).length,
      cargoAirlines: airlines.filter(isCargoAirline).length,
      scheduledAirlines: airlines.filter(isScheduledAirline).length,
      iosaRegistered: airlines.filter(isIosaRegistered).length,
      byCountry,
      avgFleetSize: airlines.length > 0 ? Math.round(totalAircraft / airlines.length) : 0,
      avgFleetAge: airlines.length > 0 ? Math.round(totalFleetAge / airlines.length * 10) / 10 : 0,
      totalAircraft,
      totalAccidents,
      totalCrashes,
    };
  }

  /**
   * Search airlines by name
   */
  static searchByName(airlines: AirlineData[], searchTerm: string): AirlineData[] {
    const term = searchTerm.toLowerCase();
    return airlines.filter(airline => 
      (airline.name && airline.name.toLowerCase().includes(term)) ||
      (airline.iata_code && airline.iata_code.toLowerCase() === term) ||
      (airline.icao_code && airline.icao_code.toLowerCase() === term) ||
      (airline.callsign && airline.callsign.toLowerCase().includes(term))
    );
  }

  /**
   * Format airline information for display
   */
  static formatAirline(airline: AirlineData): string {
    const lines = [
      `${airline.name} (${airline.iata_code}/${airline.icao_code})`,
      `Country: ${airline.country_code}`,
      `Callsign: ${airline.callsign}`,
      `Fleet: ${airline.total_aircrafts} aircraft (avg age: ${airline.average_fleet_age} years)`,
    ];

    const types = [];
    if (isInternationalAirline(airline)) types.push('International');
    if (isPassengerAirline(airline)) types.push('Passenger');
    if (isCargoAirline(airline)) types.push('Cargo');
    if (isScheduledAirline(airline)) types.push('Scheduled');
    
    if (types.length > 0) {
      lines.push(`Type: ${types.join(', ')}`);
    }

    if (isIosaRegistered(airline)) {
      lines.push(`IOSA Registered (expires: ${new Date(airline.iosa_expiry!).toLocaleDateString()})`);
    }

    lines.push(`Safety: ${airline.accidents_last_5y} accidents, ${airline.crashes_last_5y} crashes (last 5y)`);

    return lines.join('\n');
  }

  /**
   * Get airline safety rating
   */
  static getSafetyRating(airline: AirlineData): {
    rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    score: number;
    description: string;
  } {
    let score = 10;
    
    // Deduct points for crashes (more severe)
    score -= airline.crashes_last_5y * 3;
    
    // Deduct points for accidents
    score -= airline.accidents_last_5y * 0.5;
    
    // Bonus for IOSA registration
    if (isIosaRegistered(airline)) {
      score += 1;
    }
    
    // Ensure score is between 0 and 10
    score = Math.max(0, Math.min(10, score));
    
    let rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    let description: string;
    
    if (score >= 9) {
      rating = 'Excellent';
      description = 'Outstanding safety record';
    } else if (score >= 7) {
      rating = 'Good';
      description = 'Above average safety record';
    } else if (score >= 5) {
      rating = 'Fair';
      description = 'Average safety record';
    } else {
      rating = 'Poor';
      description = 'Below average safety record';
    }
    
    return { rating, score: Math.round(score * 10) / 10, description };
  }

  /**
   * Check if IOSA registration is expiring soon
   */
  static isIosaExpiringSoon(airline: AirlineData, daysThreshold = 90): boolean {
    if (!isIosaRegistered(airline) || !airline.iosa_expiry) {
      return false;
    }
    
    const expiryDate = new Date(airline.iosa_expiry);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntilExpiry <= daysThreshold && daysUntilExpiry >= 0;
  }

  /**
   * Get top airlines by various criteria
   */
  static getTopAirlines(airlines: AirlineData[], criteria: 'fleet' | 'safety' | 'age', limit = 10): AirlineData[] {
    let sorted: AirlineData[];
    
    switch (criteria) {
      case 'fleet':
        sorted = this.sortByFleetSize(airlines, false);
        break;
      case 'safety':
        sorted = this.sortBySafety(airlines, true);
        break;
      case 'age':
        sorted = this.sortByFleetAge(airlines, true);
        break;
    }
    
    return sorted.slice(0, limit);
  }

  /**
   * Create airline comparison
   */
  static compareAirlines(airlines: AirlineData[]): {
    airline: AirlineData;
    fleetRank: number;
    safetyRank: number;
    ageRank: number;
    overallScore: number;
  }[] {
    const fleetSorted = this.sortByFleetSize(airlines, false);
    const safetySorted = this.sortBySafety(airlines, true);
    const ageSorted = this.sortByFleetAge(airlines, true);
    
    return airlines.map(airline => {
      const fleetRank = fleetSorted.indexOf(airline) + 1;
      const safetyRank = safetySorted.indexOf(airline) + 1;
      const ageRank = ageSorted.indexOf(airline) + 1;
      
      // Lower rank numbers are better, so we invert them for scoring
      const fleetScore = (airlines.length - fleetRank + 1) / airlines.length;
      const safetyScore = (airlines.length - safetyRank + 1) / airlines.length;
      const ageScore = (airlines.length - ageRank + 1) / airlines.length;
      
      // Weighted overall score: safety 50%, fleet size 30%, age 20%
      const overallScore = (safetyScore * 0.5 + fleetScore * 0.3 + ageScore * 0.2) * 100;
      
      return {
        airline,
        fleetRank,
        safetyRank,
        ageRank,
        overallScore: Math.round(overallScore),
      };
    }).sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Export airlines to CSV format
   */
  static exportToCSV(airlines: AirlineData[]): string {
    const headers = [
      'Name',
      'IATA Code',
      'ICAO Code',
      'Country',
      'Callsign',
      'Type',
      'Fleet Size',
      'Fleet Age',
      'Accidents (5y)',
      'Crashes (5y)',
      'IOSA Status',
      'Website',
    ];
    
    const rows = airlines.map(airline => {
      const types = [];
      if (isInternationalAirline(airline)) types.push('International');
      if (isPassengerAirline(airline)) types.push('Passenger');
      if (isCargoAirline(airline)) types.push('Cargo');
      
      return [
        airline.name,
        airline.iata_code,
        airline.icao_code,
        airline.country_code,
        airline.callsign,
        types.join('/'),
        airline.total_aircrafts.toString(),
        airline.average_fleet_age.toFixed(1),
        airline.accidents_last_5y.toString(),
        airline.crashes_last_5y.toString(),
        isIosaRegistered(airline) ? 'Registered' : 'Not Registered',
        airline.website || '',
      ];
    });
    
    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
  }
} 