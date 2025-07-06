import { CountryData } from '../../types/flightlabs.types';

/**
 * Statistics for country data
 */
export interface CountryStatistics {
  totalCountries: number;
  uniqueCurrencies: number;
  uniqueMarkets: number;
  countriesByCurrency: Map<string, number>;
  countriesByMarket: Map<string, number>;
  countriesByRegion: Map<string, number>;
}

/**
 * Country grouping structure
 */
export interface GroupedCountries {
  byCurrency: Map<string, CountryData[]>;
  byMarket: Map<string, CountryData[]>;
  byRegion: Map<string, CountryData[]>;
  byLanguage: Map<string, CountryData[]>;
}

/**
 * Processor for country data
 */
export class CountryDataProcessor {
  private countries: CountryData[];

  constructor(countries: CountryData[]) {
    this.countries = countries;
  }

  /**
   * Get all countries
   */
  getAllCountries(): CountryData[] {
    return this.countries;
  }

  /**
   * Sort countries alphabetically by name
   */
  sortByName(ascending = true): CountryData[] {
    return [...this.countries].sort((a, b) => {
      const comparison = a.country.localeCompare(b.country);
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Sort countries by country code
   */
  sortByCountryCode(ascending = true): CountryData[] {
    return [...this.countries].sort((a, b) => {
      const comparison = a.countryCode.localeCompare(b.countryCode);
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Sort countries by currency code
   */
  sortByCurrency(ascending = true): CountryData[] {
    return [...this.countries].sort((a, b) => {
      const comparison = a.currency.localeCompare(b.currency);
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Group countries by various criteria
   */
  groupCountries(): GroupedCountries {
    const byCurrency = new Map<string, CountryData[]>();
    const byMarket = new Map<string, CountryData[]>();
    const byRegion = new Map<string, CountryData[]>();
    const byLanguage = new Map<string, CountryData[]>();

    for (const country of this.countries) {
      // Group by currency
      if (!byCurrency.has(country.currency)) {
        byCurrency.set(country.currency, []);
      }
      byCurrency.get(country.currency)!.push(country);

      // Group by market
      if (!byMarket.has(country.market)) {
        byMarket.set(country.market, []);
      }
      byMarket.get(country.market)!.push(country);

      // Group by region (inferred from country code)
      const region = this.getRegionFromCountryCode(country.countryCode);
      if (!byRegion.has(region)) {
        byRegion.set(region, []);
      }
      byRegion.get(region)!.push(country);

      // Group by language (extracted from market)
      const language = country.market.split('-')[0];
      if (!byLanguage.has(language)) {
        byLanguage.set(language, []);
      }
      byLanguage.get(language)!.push(country);
    }

    return { byCurrency, byMarket, byRegion, byLanguage };
  }

  /**
   * Get region from country code (simplified regional grouping)
   */
  getRegionFromCountryCode(countryCode: string): string {
    const regions: { [key: string]: string[] } = {
      'Europe': ['AD', 'AL', 'AT', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 
                 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 
                 'IT', 'LI', 'LT', 'LU', 'LV', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 
                 'PL', 'PT', 'RO', 'RS', 'RU', 'SE', 'SI', 'SK', 'UA', 'UK', 'VA'],
      'North America': ['CA', 'US', 'MX', 'GL'],
      'South America': ['AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'GY', 'PE', 'PY', 'SR', 'UY', 'VE'],
      'Asia': ['AE', 'AF', 'AM', 'AZ', 'BD', 'BT', 'BN', 'CN', 'GE', 'HK', 'ID', 
               'IL', 'IN', 'IQ', 'IR', 'JO', 'JP', 'KG', 'KH', 'KR', 'KW', 'KZ', 
               'LA', 'LB', 'LK', 'MM', 'MN', 'MO', 'MV', 'MY', 'NP', 'OM', 'PH', 
               'PK', 'PS', 'QA', 'SA', 'SG', 'SY', 'TH', 'TJ', 'TM', 'TR', 'TW', 
               'UZ', 'VN', 'YE'],
      'Africa': ['AO', 'BF', 'BI', 'BJ', 'BW', 'CD', 'CF', 'CG', 'CI', 'CM', 'CV', 
                 'DJ', 'DZ', 'EG', 'ER', 'ET', 'GA', 'GH', 'GM', 'GN', 'GQ', 'GW', 
                 'KE', 'KM', 'LR', 'LS', 'LY', 'MA', 'MG', 'ML', 'MR', 'MU', 'MW', 
                 'MZ', 'NA', 'NE', 'NG', 'RW', 'SC', 'SD', 'SL', 'SN', 'SO', 'SS', 
                 'ST', 'SZ', 'TD', 'TG', 'TN', 'TZ', 'UG', 'ZA', 'ZM', 'ZW'],
      'Oceania': ['AU', 'FJ', 'FM', 'KI', 'MH', 'NR', 'NZ', 'PG', 'PW', 'SB', 
                  'TO', 'TV', 'VU', 'WS'],
      'Caribbean': ['AG', 'BB', 'BS', 'CU', 'DM', 'DO', 'GD', 'HT', 'JM', 'KN', 
                    'LC', 'TT', 'VC'],
      'Central America': ['BZ', 'CR', 'GT', 'HN', 'NI', 'PA', 'SV']
    };

    for (const [region, codes] of Object.entries(regions)) {
      if (codes.includes(countryCode)) {
        return region;
      }
    }

    return 'Other';
  }

  /**
   * Get statistics about the countries
   */
  getStatistics(): CountryStatistics {
    const grouped = this.groupCountries();
    
    const countriesByCurrency = new Map<string, number>();
    grouped.byCurrency.forEach((countries, currency) => {
      countriesByCurrency.set(currency, countries.length);
    });

    const countriesByMarket = new Map<string, number>();
    grouped.byMarket.forEach((countries, market) => {
      countriesByMarket.set(market, countries.length);
    });

    const countriesByRegion = new Map<string, number>();
    grouped.byRegion.forEach((countries, region) => {
      countriesByRegion.set(region, countries.length);
    });

    return {
      totalCountries: this.countries.length,
      uniqueCurrencies: grouped.byCurrency.size,
      uniqueMarkets: grouped.byMarket.size,
      countriesByCurrency,
      countriesByMarket,
      countriesByRegion,
    };
  }

  /**
   * Get unique currencies with their usage count
   */
  getUniqueCurrencies(): Array<{ currency: string; currencyTitle: string; symbol: string; count: number }> {
    const currencyMap = new Map<string, { title: string; symbol: string; countries: string[] }>();

    this.countries.forEach(country => {
      if (!currencyMap.has(country.currency)) {
        currencyMap.set(country.currency, {
          title: country.currencyTitle,
          symbol: country.currencySymbol,
          countries: []
        });
      }
      currencyMap.get(country.currency)!.countries.push(country.country);
    });

    return Array.from(currencyMap.entries())
      .map(([currency, data]) => ({
        currency,
        currencyTitle: data.title,
        symbol: data.symbol,
        count: data.countries.length
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get unique markets with their usage count
   */
  getUniqueMarkets(): Array<{ market: string; language: string; count: number; countries: string[] }> {
    const marketMap = new Map<string, string[]>();

    this.countries.forEach(country => {
      if (!marketMap.has(country.market)) {
        marketMap.set(country.market, []);
      }
      marketMap.get(country.market)!.push(country.country);
    });

    return Array.from(marketMap.entries())
      .map(([market, countries]) => ({
        market,
        language: market.split('-')[0],
        count: countries.length,
        countries
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Find countries in the same currency zone
   */
  getCurrencyZone(currencyCode: string): CountryData[] {
    return this.countries.filter(country => 
      country.currency === currencyCode.toUpperCase()
    );
  }

  /**
   * Find countries sharing the same language (based on market)
   */
  getLanguageGroup(languageCode: string): CountryData[] {
    return this.countries.filter(country => 
      country.market.toLowerCase().startsWith(languageCode.toLowerCase())
    );
  }

  /**
   * Format country for display
   */
  formatCountry(country: CountryData): string {
    return `${country.country} (${country.countryCode}) - ${country.currency} ${country.currencySymbol} - Market: ${country.market}`;
  }

  /**
   * Export countries to CSV format
   */
  exportToCSV(): string {
    const headers = ['Country', 'Country Code', 'Market', 'Currency Title', 'Currency', 'Currency Symbol'];
    
    const rows = this.countries.map(country => [
      `"${country.country}"`,
      country.countryCode,
      country.market,
      `"${country.currencyTitle}"`,
      country.currency,
      country.currencySymbol
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Create country lookup maps for quick access
   */
  createLookupMaps(): {
    byCode: Map<string, CountryData>;
    byName: Map<string, CountryData>;
    byCurrency: Map<string, CountryData[]>;
  } {
    const byCode = new Map<string, CountryData>();
    const byName = new Map<string, CountryData>();
    const byCurrency = new Map<string, CountryData[]>();

    this.countries.forEach(country => {
      byCode.set(country.countryCode, country);
      byName.set(country.country.toLowerCase(), country);
      
      if (!byCurrency.has(country.currency)) {
        byCurrency.set(country.currency, []);
      }
      byCurrency.get(country.currency)!.push(country);
    });

    return { byCode, byName, byCurrency };
  }

  /**
   * Get market preferences for a region
   */
  getRegionalMarketPreferences(): Map<string, { primaryMarket: string; markets: Map<string, number> }> {
    const grouped = this.groupCountries();
    const regionalPreferences = new Map<string, Map<string, number>>();

    // Count market occurrences by region
    grouped.byRegion.forEach((countries, region) => {
      const marketCount = new Map<string, number>();
      countries.forEach(country => {
        marketCount.set(country.market, (marketCount.get(country.market) || 0) + 1);
      });
      regionalPreferences.set(region, marketCount);
    });

    // Determine primary market for each region
    const result = new Map<string, { primaryMarket: string; markets: Map<string, number> }>();
    regionalPreferences.forEach((markets, region) => {
      const sortedMarkets = Array.from(markets.entries()).sort((a, b) => b[1] - a[1]);
      result.set(region, {
        primaryMarket: sortedMarkets[0]?.[0] || '',
        markets
      });
    });

    return result;
  }

  /**
   * Search countries by partial name match
   */
  searchByName(searchTerm: string): CountryData[] {
    const term = searchTerm.toLowerCase();
    return this.countries.filter(country =>
      country.country.toLowerCase().includes(term) ||
      country.countryCode.toLowerCase() === term
    );
  }
} 