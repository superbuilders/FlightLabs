import * as dotenv from 'dotenv';
import { FlightLabsService } from '../utils/flightlabs';
import { AirportFilterProcessor } from '../utils/flightlabs/AirportFilterProcessor';

// Load environment variables
dotenv.config();

const flightLabsService = new FlightLabsService({
  accessKey: process.env.FLIGHTLABS_ACCESS_KEY || '',
});

/**
 * Example 1: Get detailed airport information by IATA code
 */
async function getAirportDetails() {
  console.log('\n=== Example 1: Get Airport Details by IATA ===');
  
  try {
    const airport = await flightLabsService.getAirportDetailsByIata('JFK');
    
    if (airport) {
      console.log('\nAirport Details:');
      console.log(`Name: ${airport.name}`);
      console.log(`IATA/ICAO: ${airport.iata_code}/${airport.icao_code}`);
      console.log(`Location: ${airport.city}, ${airport.state || 'N/A'}, ${airport.country_code}`);
      console.log(`Coordinates: ${airport.lat}, ${airport.lng}`);
      console.log(`Elevation: ${airport.alt} feet`);
      console.log(`Timezone: ${airport.timezone}`);
      console.log(`Type: ${airport.type}, Size: ${airport.size}, Status: ${airport.status}`);
      console.log(`Runways: ${airport.runways}`);
      console.log(`Departures: ${airport.departures.toLocaleString()} (${airport.departures_intl.toLocaleString()} intl, ${airport.departures_dom.toLocaleString()} dom)`);
      console.log(`Connections: ${airport.connections.toLocaleString()}`);
      console.log(`Major Hub: ${airport.is_major === 1 ? 'Yes' : 'No'}`);
      console.log(`International: ${airport.is_international === 1 ? 'Yes' : 'No'}`);
      console.log(`Website: ${airport.website || 'N/A'}`);
      console.log(`Phone: ${airport.phone_formatted || airport.phone || 'N/A'}`);
      
      // Show name in different languages
      console.log('\nNames in other languages:');
      const languages = ['es', 'fr', 'de', 'ja', 'zh'];
      languages.forEach(lang => {
        if (airport.names[lang]) {
          console.log(`  ${lang}: ${airport.names[lang]}`);
        }
      });
    } else {
      console.log('Airport not found');
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Example 2: Get all airports in a city
 */
async function getAirportsByCity() {
  console.log('\n=== Example 2: Get Airports by City ===');
  
  try {
    const result = await flightLabsService.getAirportsByCityAnalysis('NYC');
    
    console.log(`\nFound ${result.airports.length} airports in NYC`);
    console.log('\nStatistics:');
    console.log(`- Total airports: ${result.statistics.totalAirports}`);
    console.log(`- Major airports: ${result.statistics.majorAirports}`);
    console.log(`- International airports: ${result.statistics.internationalAirports}`);
    console.log(`- Average runways: ${result.statistics.averageRunways.toFixed(1)}`);
    console.log(`- Average departures: ${result.statistics.averageDepartures.toLocaleString()}`);
    
    console.log('\nAirports by size:');
    result.bySize.forEach((airports, size) => {
      console.log(`- ${size}: ${airports.length} airports`);
    });
    
    console.log('\nAll airports:');
    result.formatted.forEach(formatted => {
      console.log(formatted);
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Example 3: Get airports by country with analysis
 */
async function getAirportsByCountry() {
  console.log('\n=== Example 3: Get Airports by Country ===');
  
  try {
    const result = await flightLabsService.getAirportsByCountryDetailed('US');
    
    console.log(`\nFound ${result.airports.length} airports in the United States`);
    
    console.log('\nOverall Statistics:');
    console.log(`- Active airports: ${result.statistics.activeAirports}`);
    console.log(`- Major hubs: ${result.statistics.majorAirports}`);
    console.log(`- International airports: ${result.statistics.internationalAirports}`);
    console.log(`- Airports with schedules: ${result.statistics.airportsWithSchedules}`);
    console.log(`- Average runways: ${result.statistics.averageRunways.toFixed(1)}`);
    console.log(`- Average departures: ${Math.round(result.statistics.averageDepartures).toLocaleString()}`);
    console.log(`- Average connections: ${Math.round(result.statistics.averageConnections).toLocaleString()}`);
    
    console.log('\nAirports by size:');
    console.log(`- Large: ${result.statistics.bySize.large}`);
    console.log(`- Medium: ${result.statistics.bySize.medium}`);
    console.log(`- Small: ${result.statistics.bySize.small}`);
    
    console.log('\nTop 10 airports by departures:');
    result.topByDepartures.forEach((airport, idx) => {
      console.log(`${idx + 1}. ${airport.iata_code} - ${airport.name} (${airport.city}): ${airport.departures.toLocaleString()} departures`);
    });
    
    console.log('\nTop 10 airports by connections:');
    result.topByConnections.forEach((airport, idx) => {
      console.log(`${idx + 1}. ${airport.iata_code} - ${airport.name}: ${airport.connections.toLocaleString()} connections`);
    });
    
    // Count cities
    console.log(`\nTotal cities with airports: ${result.groupedByCities.size}`);
    
    // Save CSV
    // console.log('\nSaving airport data to CSV...');
    // await fs.writeFile('us_airports.csv', result.csv);
    // console.log('Saved to us_airports.csv');
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Example 4: Compare airports between countries
 */
async function compareCountries() {
  console.log('\n=== Example 4: Compare Airports Between Countries ===');
  
  try {
    const countries = ['US', 'UK', 'JP', 'AU'];
    const result = await flightLabsService.compareAirportsByCountries(countries);
    
    console.log('\nAirport Comparison:');
    console.log('Country | Total | Major | International | Avg Runways | Avg Departures');
    console.log('--------|--------|--------|---------------|-------------|----------------');
    
    countries.forEach(country => {
      const total = result.comparison.totalAirports.get(country) || 0;
      const major = result.comparison.majorAirports.get(country) || 0;
      const intl = result.comparison.internationalAirports.get(country) || 0;
      const avgRunways = result.comparison.averageRunways.get(country) || 0;
      const avgDepartures = result.comparison.averageDepartures.get(country) || 0;
      
      console.log(`${country.padEnd(7)} | ${total.toString().padStart(6)} | ${major.toString().padStart(6)} | ${intl.toString().padStart(13)} | ${avgRunways.toFixed(1).padStart(11)} | ${avgDepartures.toLocaleString().padStart(14)}`);
    });
    
    console.log('\nTop 5 airports by popularity in each country:');
    result.topAirportsByCountry.forEach((airports, country) => {
      console.log(`\n${country}:`);
      airports.forEach((airport, idx) => {
        console.log(`  ${idx + 1}. ${airport.iata_code} - ${airport.name} (${airport.city})`);
      });
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Example 5: Search airports by name
 */
async function searchAirportsByName() {
  console.log('\n=== Example 5: Search Airports by Name ===');
  
  try {
    const searchTerm = 'Kennedy';
    const countries = ['US', 'CA'];
    
    const result = await flightLabsService.searchAirportsByName(searchTerm, countries);
    
    console.log(`\nSearching for "${searchTerm}" in ${countries.join(', ')}`);
    console.log(`Found ${result.results.length} total matches`);
    console.log(`- Exact matches: ${result.exactMatches.length}`);
    console.log(`- Partial matches: ${result.partialMatches.length}`);
    
    if (result.exactMatches.length > 0) {
      console.log('\nExact matches:');
      result.exactMatches.forEach(airport => {
        console.log(`- ${airport.iata_code}/${airport.icao_code} - ${airport.name} (${airport.city}, ${airport.country_code})`);
      });
    }
    
    if (result.partialMatches.length > 0) {
      console.log('\nPartial matches:');
      result.partialMatches.forEach(airport => {
        console.log(`- ${airport.iata_code}/${airport.icao_code} - ${airport.name} (${airport.city}, ${airport.country_code})`);
      });
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Example 6: Get major international hubs
 */
async function getMajorHubs() {
  console.log('\n=== Example 6: Get Major International Hubs ===');
  
  try {
    const countries = ['US', 'UK', 'DE', 'JP', 'SG', 'AE'];
    const result = await flightLabsService.getMajorInternationalHubs(countries);
    
    console.log(`\nFound ${result.hubs.length} major international hubs across ${countries.length} countries`);
    
    console.log('\nHub Statistics:');
    console.log(`- Average departures: ${result.statistics.averageDepartures.toLocaleString()}`);
    console.log(`- Average connections: ${result.statistics.averageConnections.toLocaleString()}`);
    
    console.log('\nTop 10 hubs by departures:');
    result.statistics.topHubsByDepartures.forEach((hub, idx) => {
      console.log(`${idx + 1}. ${hub.iata_code} - ${hub.name} (${hub.city}, ${hub.country_code}): ${hub.departures.toLocaleString()} departures`);
    });
    
    console.log('\nTop 10 hubs by connections:');
    result.statistics.topHubsByConnections.forEach((hub, idx) => {
      console.log(`${idx + 1}. ${hub.iata_code} - ${hub.name} (${hub.city}, ${hub.country_code}): ${hub.connections.toLocaleString()} connections`);
    });
    
    console.log('\nHubs by country:');
    result.byCountry.forEach((hubs, country) => {
      console.log(`${country}: ${hubs.length} hubs`);
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Example 7: City airport network analysis
 */
async function analyzeCityNetwork() {
  console.log('\n=== Example 7: City Airport Network Analysis ===');
  
  try {
    const cityCode = 'LON'; // London
    const result = await flightLabsService.getCityAirportNetwork(cityCode);
    
    console.log(`\nAirport Network Analysis for ${cityCode}:`);
    console.log(`Total airports: ${result.airports.length}`);
    
    console.log('\nNetwork Statistics:');
    console.log(`- Total connections: ${result.network.totalConnections.toLocaleString()}`);
    console.log(`- Total departures: ${result.network.totalDepartures.toLocaleString()}`);
    console.log(`- International capacity: ${result.network.internationalCapacity.toLocaleString()}`);
    console.log(`- Domestic capacity: ${result.network.domesticCapacity.toLocaleString()}`);
    console.log(`- Major hub count: ${result.network.majorHubCount}`);
    
    if (result.primary) {
      console.log('\nPrimary Airport:');
      console.log(`${result.primary.iata_code} - ${result.primary.name}`);
      console.log(`- Departures: ${result.primary.departures.toLocaleString()}`);
      console.log(`- Connections: ${result.primary.connections.toLocaleString()}`);
    }
    
    console.log('\nConnectivity Analysis:');
    result.connectivity.forEach(item => {
      console.log(`${item.airport.iata_code} - ${item.airport.name} (${item.type})`);
      console.log(`  Connections: ${item.connections.toLocaleString()}, Departures: ${item.departures.toLocaleString()}`);
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Example 8: Advanced filtering with processor
 */
async function advancedFiltering() {
  console.log('\n=== Example 8: Advanced Filtering ===');
  
  try {
    // Get all airports in California
    const airports = await flightLabsService.filterAirports({ 
      country_code: 'US',
      // Note: We can't filter by state directly in the API, so we'll filter after
    });
    
    // Create processor for advanced filtering
    const processor = new AirportFilterProcessor(airports);
    
    // Filter California airports (state = CA)
    const californiaAirports = processor.filterByState('CA');
    console.log(`\nFound ${californiaAirports.length} airports in California`);
    
    // Get large airports only
    const largeAirports = processor.filterBySize('large');
    console.log(`\nLarge airports in dataset: ${largeAirports.length}`);
    
    // Get airports with at least 3 runways
    const multiRunwayAirports = processor.filterByMinRunways(3);
    console.log(`\nAirports with 3+ runways: ${multiRunwayAirports.length}`);
    multiRunwayAirports.slice(0, 5).forEach(airport => {
      console.log(`- ${airport.iata_code} - ${airport.name}: ${airport.runways} runways`);
    });
    
    // Get busiest airports (min 50,000 departures)
    const busiestAirports = processor.filterByMinDepartures(50000);
    console.log(`\nAirports with 50,000+ departures: ${busiestAirports.length}`);
    busiestAirports.slice(0, 5).forEach(airport => {
      console.log(`- ${airport.iata_code} - ${airport.name}: ${airport.departures.toLocaleString()} departures`);
    });
    
    // Search for airports with "International" in name
    const internationalInName = processor.searchByName('International');
    console.log(`\nAirports with "International" in name: ${internationalInName.length}`);
    
    // Get airports with contact info
    const withContact = processor.getAirportsWithContactInfo();
    console.log(`\nAirports with contact information: ${withContact.length}`);
    
    // Get airports with social media
    const withSocial = processor.getAirportsWithSocialMedia();
    console.log(`Airports with social media presence: ${withSocial.length}`);
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Main function to run examples
 */
async function main() {
  console.log('FlightLabs Airports By Filter Examples');
  console.log('=====================================');
  
  // Run examples
  await getAirportDetails();
  await getAirportsByCity();
  await getAirportsByCountry();
  await compareCountries();
  await searchAirportsByName();
  await getMajorHubs();
  await analyzeCityNetwork();
  await advancedFiltering();
  
  // Clean up
  flightLabsService.destroy();
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  getAirportDetails,
  getAirportsByCity,
  getAirportsByCountry,
  compareCountries,
  searchAirportsByName,
  getMajorHubs,
  analyzeCityNetwork,
  advancedFiltering,
}; 