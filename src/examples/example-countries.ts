import * as dotenv from 'dotenv';
import { FlightLabsService } from '../utils/flightlabs';
import { CountryDataProcessor } from '../utils/flightlabs/CountryDataProcessor';
import { CountryData } from '../types/flightlabs.types';

// Load environment variables
dotenv.config();

const flightLabsService = new FlightLabsService({
  accessKey: process.env.FLIGHTLABS_ACCESS_KEY || '',
});

/**
 * Example 1: Get all countries with basic information
 */
async function getAllCountries() {
  console.log('\n=== Example 1: Get All Countries ===');
  
  try {
    const countries = await flightLabsService.getCountries();
    
    console.log(`\nTotal countries: ${countries.length}`);
    console.log('\nFirst 5 countries:');
    countries.slice(0, 5).forEach(country => {
      console.log(`- ${country.country} (${country.countryCode})`);
      console.log(`  Market: ${country.market}`);
      console.log(`  Currency: ${country.currency} (${country.currencySymbol})`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 2: Get countries with comprehensive analysis
 */
async function getCountriesAnalysis() {
  console.log('\n=== Example 2: Countries Analysis ===');
  
  try {
    const analysis = await flightLabsService.getCountriesWithAnalysis();
    
    console.log('\nStatistics:');
    console.log(`Total countries: ${analysis.statistics.totalCountries}`);
    console.log(`Unique currencies: ${analysis.statistics.uniqueCurrencies}`);
    console.log(`Unique markets: ${analysis.statistics.uniqueMarkets}`);
    
    console.log('\nTop 5 Currencies by Usage:');
    analysis.currencies.slice(0, 5).forEach(curr => {
      console.log(`- ${curr.currency} (${curr.symbol}): ${curr.count} countries`);
      console.log(`  Name: ${curr.currencyTitle}`);
    });
    
    console.log('\nTop 5 Markets:');
    analysis.markets.slice(0, 5).forEach(market => {
      console.log(`- ${market.market}: ${market.count} countries`);
      console.log(`  Language: ${market.language}`);
      console.log(`  Countries: ${market.countries.slice(0, 3).join(', ')}${market.countries.length > 3 ? '...' : ''}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 3: Get specific country information
 */
async function getCountryDetails() {
  console.log('\n=== Example 3: Get Country Details ===');
  
  try {
    const countryCodes = ['US', 'GB', 'JP', 'BR', 'ZA'];
    
    for (const code of countryCodes) {
      const country = await flightLabsService.getCountryByCode(code);
      
      if (country) {
        console.log(`\n${country.country} (${country.countryCode}):`);
        console.log(`  Market: ${country.market}`);
        console.log(`  Currency: ${country.currencyTitle}`);
        console.log(`  Symbol: ${country.currencySymbol}`);
        console.log(`  Code: ${country.currency}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 4: Get countries by currency
 */
async function getCountriesByCurrency() {
  console.log('\n=== Example 4: Countries by Currency ===');
  
  try {
    const currencies = ['USD', 'EUR', 'GBP'];
    
    for (const currency of currencies) {
      const result = await flightLabsService.getCountriesByCurrency(currency);
      
      console.log(`\n${result.currency} (${result.currencySymbol}) - ${result.currencyTitle}:`);
      console.log(`Used by ${result.count} countries:`);
      result.countries.forEach(country => {
        console.log(`  - ${country.country} (${country.countryCode})`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 5: Get countries by market locale
 */
async function getCountriesByMarket() {
  console.log('\n=== Example 5: Countries by Market ===');
  
  try {
    const markets = ['en-US', 'es-ES', 'fr-FR'];
    
    for (const market of markets) {
      const result = await flightLabsService.getCountriesByMarket(market);
      
      console.log(`\n${market} (Language: ${result.language}):`);
      console.log(`${result.count} countries use this market:`);
      
      // Show countries by region
      result.byRegion.forEach((countries, region) => {
        console.log(`\n  ${region}: ${countries.map(c => c.countryCode).join(', ')}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 6: Search countries by name
 */
async function searchCountries() {
  console.log('\n=== Example 6: Search Countries ===');
  
  try {
    const searches = ['United', 'Korea', 'Island'];
    
    for (const search of searches) {
      const result = await flightLabsService.searchCountriesByName(search);
      
      console.log(`\nSearch for "${search}":`);
      
      if (result.exactMatch) {
        console.log(`Exact match: ${result.exactMatch.country} (${result.exactMatch.countryCode})`);
      }
      
      if (result.partialMatches.length > 0) {
        console.log(`Partial matches (${result.partialMatches.length}):`);
        result.partialMatches.forEach(country => {
          console.log(`  - ${country.country} (${country.countryCode})`);
        });
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 7: Currency zones analysis
 */
async function analyzeCurrencyZones() {
  console.log('\n=== Example 7: Currency Zones Analysis ===');
  
  try {
    const analysis = await flightLabsService.getCurrencyZonesAnalysis();
    
    console.log('\nMajor Currency Zones (used by 5+ countries):');
    analysis.majorZones.forEach(zone => {
      console.log(`\n${zone.currency} (${zone.symbol}) - ${zone.title}:`);
      console.log(`  Countries: ${zone.countryCount}`);
      console.log(`  Regions: ${zone.regions.join(', ')}`);
    });
    
    console.log(`\n\nSingle-country currencies: ${analysis.singleCountryCurrencies.length}`);
    console.log('Examples:');
    analysis.singleCountryCurrencies.slice(0, 5).forEach(country => {
      console.log(`  - ${country.country}: ${country.currency} (${country.currencySymbol})`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 8: Regional market analysis
 */
async function analyzeRegionalMarkets() {
  console.log('\n=== Example 8: Regional Market Analysis ===');
  
  try {
    const analysis = await flightLabsService.getRegionalMarketAnalysis();
    
    console.log('\nMarket dominance across regions:');
    analysis.marketDominance.slice(0, 5).forEach(market => {
      console.log(`\n${market.market}:`);
      console.log(`  Countries: ${market.countryCount} (${market.percentage}%)`);
      console.log(`  Regions: ${market.regions.join(', ')}`);
    });
    
    console.log('\n\nRegional preferences:');
    analysis.byRegion.forEach((data, region) => {
      console.log(`\n${region}:`);
      console.log(`  Primary market: ${data.primaryMarket}`);
      console.log(`  Total countries: ${data.countries.length}`);
      console.log(`  Currencies used: ${data.currencies.size}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 9: Compare countries
 */
async function compareCountries() {
  console.log('\n=== Example 9: Compare Countries ===');
  
  try {
    const groups = [
      { name: 'North America', codes: ['US', 'CA', 'MX'] },
      { name: 'European Union', codes: ['FR', 'DE', 'IT', 'ES'] },
      { name: 'BRICS', codes: ['BR', 'RU', 'IN', 'CN', 'ZA'] }
    ];
    
    for (const group of groups) {
      console.log(`\n${group.name}:`);
      const comparison = await flightLabsService.compareCountries(group.codes);
      
      console.log(`  Same currency: ${comparison.comparison.sameCurrency}`);
      console.log(`  Same market: ${comparison.comparison.sameMarket}`);
      console.log(`  Same language: ${comparison.comparison.sameLanguage}`);
      console.log(`  Same region: ${comparison.comparison.sameRegion}`);
      
      if (comparison.comparison.currencies.length > 1) {
        console.log(`  Currencies: ${comparison.comparison.currencies.join(', ')}`);
      }
      if (comparison.comparison.languages.length > 1) {
        console.log(`  Languages: ${comparison.comparison.languages.join(', ')}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 10: Export countries to CSV
 */
async function exportCountriesToCSV() {
  console.log('\n=== Example 10: Export Countries to CSV ===');
  
  try {
    const csv = await flightLabsService.exportCountriesToCSV();
    
    // Show first few lines
    const lines = csv.split('\n');
    console.log('\nCSV Preview (first 10 lines):');
    lines.slice(0, 10).forEach(line => console.log(line));
    
    console.log(`\nTotal lines: ${lines.length}`);
    
    // Save to file (optional)
    // const fs = require('fs');
    // fs.writeFileSync('countries.csv', csv);
    // console.log('Saved to countries.csv');
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 11: Use CountryDataProcessor directly
 */
async function useCountryDataProcessor() {
  console.log('\n=== Example 11: Direct CountryDataProcessor Usage ===');
  
  try {
    const countries = await flightLabsService.getCountries();
    const processor = new CountryDataProcessor(countries);
    
    // Filter countries
    console.log('\nEuropean countries:');
    const grouped = processor.groupCountries();
    const europeanCountries = grouped.byRegion.get('Europe') || [];
    console.log(`Found ${europeanCountries.length} European countries`);
    console.log('Examples:', europeanCountries.slice(0, 5).map((c: CountryData) => c.countryCode).join(', '));
    
    // Sort by name
    console.log('\nCountries sorted alphabetically:');
    const sorted = processor.sortByName();
    sorted.slice(0, 5).forEach(country => {
      console.log(`  - ${country.country} (${country.countryCode})`);
    });
    
    // Get region for specific country
    const testCountry = 'JP';
    const region = processor.getRegionFromCountryCode(testCountry);
    console.log(`\n${testCountry} is in ${region}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Main function to run all examples
 */
async function main() {
  console.log('FlightLabs Countries API Examples\n');
  console.log('=================================');
  
  // Run examples sequentially
  await getAllCountries();
  await getCountriesAnalysis();
  await getCountryDetails();
  await getCountriesByCurrency();
  await getCountriesByMarket();
  await searchCountries();
  await analyzeCurrencyZones();
  await analyzeRegionalMarkets();
  await compareCountries();
  await exportCountriesToCSV();
  await useCountryDataProcessor();
  
  console.log('\n\nAll examples completed!');
}

// Run the examples
main().catch(console.error); 