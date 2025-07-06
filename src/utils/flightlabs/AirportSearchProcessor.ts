/**
 * Airport Search Data Processor
 * Utilities for processing and analyzing airport search results
 */

import {
  AirportSearchResult,
  isAirport,
  isCity
} from '../../types/flightlabs.types';

export class AirportSearchProcessor {
  /**
   * Group search results by entity type
   */
  static groupByType(results: AirportSearchResult[]): {
    cities: AirportSearchResult[];
    airports: AirportSearchResult[];
  } {
    return {
      cities: results.filter(isCity),
      airports: results.filter(isAirport)
    };
  }

  /**
   * Group airports by country
   */
  static groupByCountry(results: AirportSearchResult[]): Map<string, AirportSearchResult[]> {
    const grouped = new Map<string, AirportSearchResult[]>();
    
    results.forEach(result => {
      const country = result.presentation.subtitle;
      if (!grouped.has(country)) {
        grouped.set(country, []);
      }
      grouped.get(country)!.push(result);
    });
    
    return grouped;
  }

  /**
   * Extract unique countries from results
   */
  static getUniqueCountries(results: AirportSearchResult[]): string[] {
    const countries = new Set<string>();
    results.forEach(result => {
      countries.add(result.presentation.subtitle);
    });
    return Array.from(countries).sort();
  }

  /**
   * Sort results by relevance (cities first, then airports)
   */
  static sortByRelevance(results: AirportSearchResult[]): AirportSearchResult[] {
    return [...results].sort((a, b) => {
      // Cities come first
      if (isCity(a) && isAirport(b)) return -1;
      if (isAirport(a) && isCity(b)) return 1;
      
      // Within same type, sort alphabetically by title
      return a.presentation.title.localeCompare(b.presentation.title);
    });
  }

  /**
   * Sort results alphabetically by title
   */
  static sortAlphabetically(results: AirportSearchResult[]): AirportSearchResult[] {
    return [...results].sort((a, b) => 
      a.presentation.title.localeCompare(b.presentation.title)
    );
  }

  /**
   * Filter results by country
   */
  static filterByCountry(results: AirportSearchResult[], country: string): AirportSearchResult[] {
    return results.filter(result => 
      result.presentation.subtitle.toLowerCase() === country.toLowerCase()
    );
  }

  /**
   * Find exact matches for a query
   */
  static findExactMatches(results: AirportSearchResult[], query: string): AirportSearchResult[] {
    const normalizedQuery = query.toLowerCase().trim();
    
    return results.filter(result => {
      const title = result.presentation.title.toLowerCase();
      const skyId = result.skyId.toLowerCase();
      const localizedName = result.navigation.localizedName.toLowerCase();
      
      return title === normalizedQuery || 
             skyId === normalizedQuery || 
             localizedName === normalizedQuery;
    });
  }

  /**
   * Find partial matches for a query
   */
  static findPartialMatches(results: AirportSearchResult[], query: string): AirportSearchResult[] {
    const normalizedQuery = query.toLowerCase().trim();
    
    return results.filter(result => {
      const title = result.presentation.title.toLowerCase();
      const suggestionTitle = result.presentation.suggestionTitle.toLowerCase();
      const localizedName = result.navigation.localizedName.toLowerCase();
      
      return title.includes(normalizedQuery) || 
             suggestionTitle.includes(normalizedQuery) || 
             localizedName.includes(normalizedQuery);
    });
  }

  /**
   * Format search result for display
   */
  static formatSearchResult(result: AirportSearchResult): string {
    const type = result.navigation.entityType;
    const title = result.presentation.suggestionTitle;
    const country = result.presentation.subtitle;
    const skyId = result.skyId;
    const entityId = result.entityId;
    
    return `${title} - ${country} (${type}) [Sky ID: ${skyId}, Entity ID: ${entityId}]`;
  }

  /**
   * Format search results as a table
   */
  static formatResultsTable(results: AirportSearchResult[]): string {
    if (results.length === 0) return 'No results found';
    
    const header = 'Title | Country | Type | Sky ID | Entity ID';
    const separator = '------|---------|------|--------|----------';
    
    const rows = results.map(result => {
      return `${result.presentation.title} | ${result.presentation.subtitle} | ${result.navigation.entityType} | ${result.skyId} | ${result.entityId}`;
    });
    
    return [header, separator, ...rows].join('\n');
  }

  /**
   * Get flight search parameters from result
   */
  static getFlightSearchParams(result: AirportSearchResult): {
    skyId: string;
    entityId: string;
    name: string;
    type: 'CITY' | 'AIRPORT';
  } {
    return {
      skyId: result.skyId,
      entityId: result.entityId,
      name: result.navigation.localizedName,
      type: result.navigation.relevantFlightParams.flightPlaceType
    };
  }

  /**
   * Build a display name with location hierarchy
   */
  static buildHierarchicalName(result: AirportSearchResult): string {
    const parts: string[] = [result.presentation.title];
    
    if (result.presentation.subtitle) {
      parts.push(result.presentation.subtitle);
    }
    
    return parts.join(', ');
  }

  /**
   * Check if result is a major hub (based on common hub airport codes)
   */
  static isMajorHub(result: AirportSearchResult): boolean {
    if (!isAirport(result)) return false;
    
    const majorHubs = [
      'JFK', 'LAX', 'ORD', 'DFW', 'DEN', 'ATL', 'SFO', 'SEA', 'LAS', 'MCO', 'EWR', 'BOS',
      'LHR', 'CDG', 'FRA', 'AMS', 'MAD', 'FCO', 'MUC', 'ZRH', 'VIE', 'BCN', 'IST',
      'DXB', 'DOH', 'SIN', 'HKG', 'NRT', 'HND', 'ICN', 'PVG', 'PEK', 'BKK', 'KUL',
      'SYD', 'MEL', 'AKL', 'YYZ', 'YVR', 'MEX', 'GRU', 'EZE', 'SCL', 'BOG'
    ];
    
    return majorHubs.includes(result.skyId);
  }

  /**
   * Rank results by relevance and hub status
   */
  static rankResults(results: AirportSearchResult[]): AirportSearchResult[] {
    return [...results].sort((a, b) => {
      // Cities first
      if (isCity(a) && !isCity(b)) return -1;
      if (!isCity(a) && isCity(b)) return 1;
      
      // Major hubs before other airports
      const aIsHub = this.isMajorHub(a);
      const bIsHub = this.isMajorHub(b);
      if (aIsHub && !bIsHub) return -1;
      if (!aIsHub && bIsHub) return 1;
      
      // Alphabetically by title
      return a.presentation.title.localeCompare(b.presentation.title);
    });
  }

  /**
   * Get statistics about search results
   */
  static getStatistics(results: AirportSearchResult[]): {
    total: number;
    cities: number;
    airports: number;
    countries: number;
    majorHubs: number;
    byCountry: Array<{ country: string; count: number }>;
  } {
    const grouped = this.groupByType(results);
    const countries = this.getUniqueCountries(results);
    const majorHubs = results.filter(r => this.isMajorHub(r)).length;
    
    // Count by country
    const countryGroups = this.groupByCountry(results);
    const byCountry = Array.from(countryGroups.entries())
      .map(([country, items]) => ({ country, count: items.length }))
      .sort((a, b) => b.count - a.count);
    
    return {
      total: results.length,
      cities: grouped.cities.length,
      airports: grouped.airports.length,
      countries: countries.length,
      majorHubs,
      byCountry
    };
  }

  /**
   * Create a search summary
   */
  static createSearchSummary(query: string, results: AirportSearchResult[]): string {
    const stats = this.getStatistics(results);
    
    const lines = [
      `Search results for "${query}":`,
      `Total results: ${stats.total}`,
      `Cities: ${stats.cities}`,
      `Airports: ${stats.airports}`,
      `Countries: ${stats.countries}`,
      `Major hubs: ${stats.majorHubs}`
    ];
    
    if (stats.byCountry.length > 0) {
      lines.push('\nTop countries:');
      stats.byCountry.slice(0, 5).forEach(({ country, count }) => {
        lines.push(`  ${country}: ${count}`);
      });
    }
    
    return lines.join('\n');
  }
} 