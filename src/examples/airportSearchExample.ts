/**
 * FlightLabs Airport Search API Example
 * Demonstrates searching for airports and cities to get Sky IDs and Entity IDs
 */

import { FlightLabsService } from '../utils/flightlabs/FlightLabsService';
import { flightLabsConfig } from '../config/flightlabs.config';
import { AirportSearchProcessor } from '../utils/flightlabs/AirportSearchProcessor';

async function runAirportSearchExamples() {
  // Initialize the service
  const service = new FlightLabsService({
    ...flightLabsConfig,
    cacheEnabled: true,
    cacheTTL: 600, // 10 minutes cache for airport data
  });

  try {
    console.log('=== FlightLabs Airport Search Examples ===\n');

    // Example 1: Basic airport search
    console.log('1. Searching for "New York"...');
    const nyResults = await service.searchAirports('New York');
    
    console.log(`\nFound ${nyResults.length} results:`);
    nyResults.forEach(result => {
      console.log(AirportSearchProcessor.formatSearchResult(result));
    });

    // Example 2: Search with analysis
    console.log('\n\n2. Searching "London" with analysis...');
    const londonAnalysis = await service.searchAirportsWithAnalysis('London');
    
    console.log(londonAnalysis.summary);
    
    console.log('\nMajor hubs found:');
    londonAnalysis.majorHubs.forEach(hub => {
      console.log(`  ${hub.presentation.title} (${hub.skyId})`);
    });

    // Example 3: Get specific airport by IATA code
    console.log('\n\n3. Getting JFK airport details...');
    const jfk = await service.getAirportByIata('JFK');
    
    if (jfk) {
      console.log('Found:', AirportSearchProcessor.formatSearchResult(jfk));
      const params = AirportSearchProcessor.getFlightSearchParams(jfk);
      console.log('Flight search parameters:', params);
    } else {
      console.log('JFK airport not found');
    }

    // Example 4: Search city and airports
    console.log('\n\n4. Searching for Paris city and airports...');
    const parisData = await service.searchCityAndAirports('Paris');
    
    if (parisData.city) {
      console.log('City:', AirportSearchProcessor.formatSearchResult(parisData.city));
    }
    
    console.log(`\nAirports (${parisData.airports.length}):`);
    parisData.airports.forEach(airport => {
      console.log(`  ${airport.presentation.title} (${airport.skyId})`);
    });

    // Example 5: Search multiple locations
    console.log('\n\n5. Searching multiple locations...');
    const locations = ['Tokyo', 'Dubai', 'Sydney', 'São Paulo'];
    const multiSearch = await service.searchMultipleLocations(locations);
    
    console.log('\nBest matches for each location:');
    multiSearch.forEach((result, query) => {
      if (result.bestMatch) {
        console.log(`  ${query}: ${result.bestMatch.presentation.suggestionTitle} [${result.bestMatch.skyId}]`);
      } else if (result.error) {
        console.log(`  ${query}: Error - ${result.error}`);
      } else {
        console.log(`  ${query}: No results found`);
      }
    });

    // Example 6: Get airports by country
    console.log('\n\n6. Getting all airports in Germany...');
    const germanyAirports = await service.getAirportsByCountry('Germany');
    
    console.log(`\nFound ${germanyAirports.airports.length} airports and ${germanyAirports.cities.length} cities`);
    console.log(`Major hubs: ${germanyAirports.majorHubs.length}`);
    
    console.log('\nMajor German hubs:');
    germanyAirports.majorHubs.forEach(hub => {
      console.log(`  ${hub.presentation.title} (${hub.skyId})`);
    });

    // Example 7: Find route parameters
    console.log('\n\n7. Finding route from Los Angeles to Singapore...');
    const route = await service.findRouteBetweenLocations('Los Angeles', 'Singapore');
    
    if (route.routeParams.canSearchFlights) {
      console.log('\nRoute found!');
      console.log(`Origin: ${route.origin.bestMatch?.presentation.suggestionTitle}`);
      console.log(`  Sky ID: ${route.routeParams.origin?.skyId}`);
      console.log(`  Entity ID: ${route.routeParams.origin?.entityId}`);
      
      console.log(`\nDestination: ${route.destination.bestMatch?.presentation.suggestionTitle}`);
      console.log(`  Sky ID: ${route.routeParams.destination?.skyId}`);
      console.log(`  Entity ID: ${route.routeParams.destination?.entityId}`);
      
      console.log('\nYou can now use these IDs to search for flights!');
    }

    // Example 8: Compare searches
    console.log('\n\n8. Comparing search results for major US cities...');
    const comparison = await service.compareAirportSearches(['Chicago', 'Miami', 'Seattle']);
    
    console.log(comparison.formatted);
    console.log(`\nTotal major hubs found: ${comparison.comparison.allMajorHubs.length}`);

    // Example 9: Format results as table
    console.log('\n\n9. Displaying Barcelona results as table...');
    const barcelonaResults = await service.searchAirports('Barcelona');
    console.log('\n' + AirportSearchProcessor.formatResultsTable(barcelonaResults));

    // Example 10: Demonstrating flight price search workflow
    console.log('\n\n10. Complete workflow: Search airports and prepare for flight search...');
    
    // Step 1: Search origin
    const originSearch = await service.searchAirportsWithAnalysis('New York');
    const originBest = originSearch.ranked[0];
    console.log(`\nOrigin: ${originBest.presentation.suggestionTitle}`);
    
    // Step 2: Search destination
    const destSearch = await service.searchAirportsWithAnalysis('London');
    const destBest = destSearch.ranked[0];
    console.log(`Destination: ${destBest.presentation.suggestionTitle}`);
    
    // Step 3: Get flight parameters
    const originParams = AirportSearchProcessor.getFlightSearchParams(originBest);
    const destParams = AirportSearchProcessor.getFlightSearchParams(destBest);
    
    console.log('\nFlight search parameters ready:');
    console.log('Origin:', {
      skyId: originParams.skyId,
      entityId: originParams.entityId,
    });
    console.log('Destination:', {
      skyId: destParams.skyId,
      entityId: destParams.entityId,
    });
    
    console.log('\nYou can now use these parameters with the flight prices endpoint:');
    console.log(`await service.getOneWayFlightPricesAnalysis(`);
    console.log(`  { skyId: '${originParams.skyId}', entityId: '${originParams.entityId}' },`);
    console.log(`  { skyId: '${destParams.skyId}', entityId: '${destParams.entityId}' },`);
    console.log(`  '2025-07-15',`);
    console.log(`  { adults: 1, cabinClass: 'economy' }`);
    console.log(`);`);

    // Display cache statistics
    const cacheStats = service.getCacheStats();
    if (cacheStats) {
      console.log('\n\nCache Statistics:');
      console.log(`Entries: ${cacheStats.size}/${cacheStats.maxSize}`);
      console.log(`TTL: ${cacheStats.ttl} seconds`);
    }

  } catch (error) {
    console.error('Error running airport search examples:', error);
  } finally {
    // Clean up
    service.destroy();
  }
}

// Run the examples
if (require.main === module) {
  runAirportSearchExamples();
}

export { runAirportSearchExamples }; 