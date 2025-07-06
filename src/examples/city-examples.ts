/**
 * Examples of using the FlightLabs API cities endpoint
 * Demonstrates retrieving city information by IATA code
 */

import { FlightLabsService } from '../utils/flightlabs';
import { flightLabsConfig } from '../config/flightlabs.config';

async function main() {
  try {
    // Initialize the service
    const flightLabsService = new FlightLabsService({
      ...flightLabsConfig,
      cacheEnabled: true,
    });

    console.log('=== FlightLabs Cities API Examples ===\n');

    // Example 1: Get city information for Singapore
    console.log('1. Getting information for Singapore (SIN)...');
    const singapore = await flightLabsService.getCityByIataCode('SIN');
    
    if (singapore.city) {
      console.log('\nCity Details:');
      console.log(singapore.formatted);
      
      console.log('\nDetailed Information:');
      console.log(`- IATA Code: ${singapore.city.iata_city_code}`);
      console.log(`- UN/LOCODE: ${singapore.city.un_locode}`);
      console.log(`- Population: ${singapore.population?.formatted || 'N/A'}`);
      console.log(`- Timezone: ${singapore.timezone}`);
      console.log(`- Coordinates: ${singapore.location?.lat}°N, ${singapore.location?.lng}°E`);
      console.log(`- Elevation: ${singapore.location?.alt}m`);
      
      if (singapore.airports.length > 0) {
        console.log(`\nAirports in ${singapore.city.name}:`);
        singapore.airports.forEach(airport => {
          console.log(`  - ${airport.name} (${airport.iata_code})`);
          console.log(`    Type: ${airport.type}, Size: ${airport.size}`);
          console.log(`    International: ${airport.is_international ? 'Yes' : 'No'}`);
          console.log(`    Annual Departures: ${airport.departures.toLocaleString()}`);
        });
      }
      
      if (singapore.languages.length > 0) {
        console.log(`\nAvailable Language Translations (${singapore.languages.length}):`);
        console.log(singapore.languages.slice(0, 10).map(l => `  - ${l.code}: ${singapore.city?.names[l.code]}`).join('\n'));
        if (singapore.languages.length > 10) {
          console.log(`  ... and ${singapore.languages.length - 10} more languages`);
        }
      }
    }

    // Example 2: Get city information for major cities
    console.log('\n\n2. Getting information for major world cities...');
    const cityCodes = ['NYC', 'LON', 'PAR', 'TYO', 'DXB'];
    
    for (const code of cityCodes) {
      const cityInfo = await flightLabsService.getCityByIataCode(code);
      if (cityInfo.city) {
        console.log(`\n${cityInfo.city.name} (${code}):`);
        console.log(`  Country: ${cityInfo.country?.country || cityInfo.city.country_code}`);
        console.log(`  Population: ${cityInfo.population?.formatted || 'N/A'}`);
        console.log(`  Timezone: ${cityInfo.timezone}`);
        console.log(`  Airports: ${cityInfo.airports.length}`);
        console.log(`  Location: ${cityInfo.location?.lat}°N, ${cityInfo.location?.lng}°E`);
      } else {
        console.log(`\n${code}: No city data found`);
      }
    }

    // Example 3: Compare city sizes
    console.log('\n\n3. Comparing city populations...');
    const citiesToCompare = ['HKG', 'SIN', 'BKK', 'KUL', 'JKT'];
    const cityPopulations: Array<{ name: string; code: string; population: number }> = [];
    
    for (const code of citiesToCompare) {
      const cityInfo = await flightLabsService.getCityByIataCode(code);
      if (cityInfo.city) {
        cityPopulations.push({
          name: cityInfo.city.name,
          code: cityInfo.city.iata_city_code,
          population: cityInfo.city.population,
        });
      }
    }
    
    // Sort by population
    cityPopulations.sort((a, b) => b.population - a.population);
    
    console.log('\nCities by Population (largest to smallest):');
    cityPopulations.forEach((city, index) => {
      console.log(`  ${index + 1}. ${city.name} (${city.code}): ${city.population.toLocaleString()}`);
    });

    // Example 4: Get city with language analysis
    console.log('\n\n4. Analyzing language availability for Paris...');
    const paris = await flightLabsService.getCityByIataCode('PAR');
    
    if (paris.city) {
      console.log(`\n${paris.city.name} is available in ${paris.languages.length + 1} languages:`);
      
      // Group languages by script/region
      const languageGroups = {
        european: ['de', 'fr', 'es', 'it', 'pt', 'nl', 'sv', 'da', 'fi', 'el'],
        asian: ['zh', 'ja', 'ko', 'th', 'vi', 'hi', 'ta', 'my'],
        middle_eastern: ['ar', 'he', 'fa', 'ur'],
      };
      
      Object.entries(languageGroups).forEach(([group, codes]) => {
        const available = codes.filter(code => paris.city?.names[code]);
        if (available.length > 0) {
          console.log(`\n  ${group.charAt(0).toUpperCase() + group.slice(1).replace('_', ' ')} languages:`);
          available.forEach(code => {
            console.log(`    - ${code}: ${paris.city?.names[code]}`);
          });
        }
      });
    }

    // Example 5: Airport connectivity analysis
    console.log('\n\n5. Analyzing airport connectivity for major hubs...');
    const hubCities = ['LON', 'NYC', 'TYO'];
    
    for (const code of hubCities) {
      const cityInfo = await flightLabsService.getCityByIataCode(code);
      if (cityInfo.city && cityInfo.airports.length > 0) {
        console.log(`\n${cityInfo.city.name} (${code}) - ${cityInfo.airports.length} airports:`);
        
        const totalDepartures = cityInfo.airports.reduce((sum, airport) => sum + airport.departures, 0);
        const internationalAirports = cityInfo.airports.filter(a => a.is_international === 1);
        const majorAirports = cityInfo.airports.filter(a => a.is_major === 1);
        
        console.log(`  Total annual departures: ${totalDepartures.toLocaleString()}`);
        console.log(`  International airports: ${internationalAirports.length}`);
        console.log(`  Major airports: ${majorAirports.length}`);
        
        // List major airports
        if (majorAirports.length > 0) {
          console.log(`  Major airports:`);
          majorAirports.forEach(airport => {
            console.log(`    - ${airport.name} (${airport.iata_code}): ${airport.departures.toLocaleString()} departures/year`);
          });
        }
      }
    }

    // Clean up
    flightLabsService.destroy();
    
  } catch (error) {
    console.error('Error in city examples:', error);
  }
}

// Run the examples
main(); 