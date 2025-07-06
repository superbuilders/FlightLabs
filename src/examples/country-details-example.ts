/**
 * FlightLabs Country Details by Code Example
 * Demonstrates retrieving detailed country information using ISO 2 country codes
 */

import { FlightLabsService } from '../utils/flightlabs';
import { flightLabsConfig } from '../config/flightlabs.config';

// Initialize service
const service = new FlightLabsService({
  ...flightLabsConfig,
  cacheEnabled: true,
});

/**
 * Example 1: Get detailed country information by ISO 2 code
 */
async function getCountryDetails(countryCode: string) {
  console.log(`\n=== Country Details for ${countryCode} ===`);
  
  try {
    const result = await service.getCountryDetailsByCode(countryCode);
    
    if (!result.country) {
      console.log(`No country found with code: ${countryCode}`);
      return;
    }
    
    const { country, continentName, currencyInfo, populationFormatted, nameTranslations } = result;
    
    console.log('\nBasic Information:');
    console.log(`  Name: ${country.name}`);
    console.log(`  ISO 2 Code: ${country.country_code}`);
    console.log(`  ISO 3 Code: ${country.code3}`);
    console.log(`  Continent: ${continentName} (${country.continent})`);
    console.log(`  Population: ${populationFormatted}`);
    console.log(`  Currency: ${country.currency}`);
    
    console.log('\nCurrency Information:');
    console.log(`  Currency Code: ${currencyInfo.code}`);
    console.log(`  Other Countries Using ${currencyInfo.code}:`);
    currencyInfo.countries.slice(0, 5).forEach(c => {
      console.log(`    - ${c}`);
    });
    if (currencyInfo.countries.length > 5) {
      console.log(`    ... and ${currencyInfo.countries.length - 5} more`);
    }
    
    console.log('\nName Translations (Top 10):');
    result.languages.forEach(({ language, name }) => {
      console.log(`  ${language}: ${name}`);
    });
    
    console.log(`\nTotal Translations Available: ${nameTranslations.length}`);
    
  } catch (error) {
    console.error('Error fetching country details:', error);
  }
}

/**
 * Example 2: Get comprehensive country summary including airports
 */
async function getCountrySummaryWithAirports(countryCode: string) {
  console.log(`\n=== Comprehensive Country Summary for ${countryCode} ===`);
  
  try {
    const summary = await service.getCountrySummary(countryCode);
    
    if (!summary.basicInfo) {
      console.log(`No country found with code: ${countryCode}`);
      return;
    }
    
    console.log('\nBasic Information:');
    console.log(`  Country: ${summary.basicInfo.country}`);
    console.log(`  Market: ${summary.basicInfo.market}`);
    console.log(`  Currency: ${summary.basicInfo.currency} (${summary.basicInfo.currencySymbol})`);
    console.log(`  Currency Name: ${summary.basicInfo.currencyTitle}`);
    
    if (summary.detailedInfo) {
      console.log('\nDetailed Information:');
      console.log(`  Population: ${summary.detailedInfo.population.toLocaleString()}`);
      console.log(`  Continent: ${summary.detailedInfo.continent}`);
      console.log(`  Languages Available: ${summary.languages.length}`);
    }
    
    console.log('\nAirport Statistics:');
    console.log(`  Total Airports: ${summary.airports.total}`);
    console.log(`  Major Airports: ${summary.airports.major}`);
    console.log(`  International Airports: ${summary.airports.international}`);
    
    if (summary.airports.topAirports.length > 0) {
      console.log('\nTop Major Airports:');
      summary.airports.topAirports.forEach(airport => {
        console.log(`  ${airport.iata_code} - ${airport.name} (${airport.city})`);
        console.log(`    Type: ${airport.type}, Size: ${airport.size}`);
        console.log(`    Connections: ${airport.connections}, Popularity: ${airport.popularity}`);
      });
    }
    
    if (summary.neighboringMarkets.length > 0) {
      console.log('\nCountries with Similar Markets:');
      summary.neighboringMarkets.forEach(country => {
        console.log(`  ${country.country} (${country.countryCode}) - Market: ${country.market}`);
      });
    }
    
  } catch (error) {
    console.error('Error fetching country summary:', error);
  }
}

/**
 * Example 3: Compare multiple countries
 */
async function compareCountries(countryCodes: string[]) {
  console.log(`\n=== Comparing Countries: ${countryCodes.join(', ')} ===`);
  
  try {
    const countryDetails = await Promise.all(
      countryCodes.map(code => service.getCountryDetailsByCode(code))
    );
    
    console.log('\nComparison Table:');
    console.log('Country | Population | Continent | Currency');
    console.log('--------|------------|-----------|----------');
    
    countryDetails.forEach((result, index) => {
      if (result.country) {
        const { country, continentName, populationFormatted } = result;
        console.log(
          `${country.name.padEnd(7)} | ${populationFormatted.padEnd(10)} | ${continentName.padEnd(9)} | ${country.currency}`
        );
      } else {
        console.log(`${countryCodes[index].padEnd(7)} | Not Found`);
      }
    });
    
    // Find common currencies
    const currencies = countryDetails
      .filter(r => r.country)
      .map(r => r.country!.currency);
    const uniqueCurrencies = [...new Set(currencies)];
    
    console.log(`\nUnique Currencies: ${uniqueCurrencies.join(', ')}`);
    
    // Find if any share the same currency
    const currencyGroups = new Map<string, string[]>();
    countryDetails.forEach((result, index) => {
      if (result.country) {
        const currency = result.country.currency;
        if (!currencyGroups.has(currency)) {
          currencyGroups.set(currency, []);
        }
        currencyGroups.get(currency)!.push(result.country.name);
      }
    });
    
    currencyGroups.forEach((countries, currency) => {
      if (countries.length > 1) {
        console.log(`\nCountries sharing ${currency}: ${countries.join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('Error comparing countries:', error);
  }
}

/**
 * Main function to run examples
 */
async function main() {
  console.log('FlightLabs Country Details API Examples\n');
  
  // Example 1: Get details for specific countries
  await getCountryDetails('US');
  await getCountryDetails('SG');
  await getCountryDetails('FR');
  
  // Example 2: Get comprehensive summary
  await getCountrySummaryWithAirports('GB');
  await getCountrySummaryWithAirports('JP');
  
  // Example 3: Compare countries
  await compareCountries(['DE', 'FR', 'IT', 'ES']); // EU countries
  await compareCountries(['US', 'CA', 'MX']); // North American countries
  await compareCountries(['SG', 'MY', 'TH', 'ID']); // Southeast Asian countries
}

// Run examples
main().catch(console.error); 