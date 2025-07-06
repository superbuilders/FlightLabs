/**
 * FlightLabs Flight Prices API Example
 * Demonstrates searching for flight prices and itineraries
 */

import { FlightLabsService } from '../utils/flightlabs/FlightLabsService';
import { flightLabsConfig } from '../config/flightlabs.config';
import { FlightPriceProcessor } from '../utils/flightlabs/FlightPriceProcessor';

async function runFlightPricesExamples() {
  // Initialize the service
  const service = new FlightLabsService({
    ...flightLabsConfig,
    cacheEnabled: true,
    cacheTTL: 300, // 5 minutes cache for price data
  });

  try {
    console.log('=== FlightLabs Flight Prices Examples ===\n');

    // Note: You need to get the Sky IDs and Entity IDs from the retrieveAirport endpoint
    // These are example IDs for London and New York
    const london = { skyId: 'LOND', entityId: '27544008' };
    const newYork = { skyId: 'NYCA', entityId: '27537542' };
    const paris = { skyId: 'PARI', entityId: '27539733' };

    // Example 1: Search one-way flights
    console.log('1. Searching one-way flights from London to New York...');
    const oneWayAnalysis = await service.getOneWayFlightPricesAnalysis(
      london,
      newYork,
      '2025-07-07',
      { adults: 1, cabinClass: 'economy', sortBy: 'best' }
    );
    
    console.log(`\nFound ${oneWayAnalysis.itineraries.length} flights`);
    console.log(`Price range: ${oneWayAnalysis.statistics.priceRange.min} - ${oneWayAnalysis.statistics.priceRange.max}`);
    console.log(`Average price: ${Math.round(oneWayAnalysis.statistics.priceRange.average)}`);
    console.log(`Direct flights: ${oneWayAnalysis.directFlights.length}`);
    console.log(`Airlines: ${oneWayAnalysis.statistics.airlines.join(', ')}`);
    
    if (oneWayAnalysis.cheapest) {
      console.log(`\nCheapest flight: ${oneWayAnalysis.cheapest.price.formatted}`);
      console.log(FlightPriceProcessor.formatItinerarySummary(oneWayAnalysis.cheapest));
    }
    
    if (oneWayAnalysis.bestValue) {
      console.log(`\nBest value flight:`);
      console.log(FlightPriceProcessor.formatItinerarySummary(oneWayAnalysis.bestValue));
    }

    // Example 2: Search round-trip flights
    console.log('\n\n2. Searching round-trip flights from London to Paris...');
    const roundTripAnalysis = await service.getRoundTripFlightPricesAnalysis(
      london,
      paris,
      '2025-07-15',
      '2025-07-22',
      { adults: 2, cabinClass: 'economy' }
    );
    
    console.log(`\nFound ${roundTripAnalysis.itineraries.length} round-trip options`);
    console.log(`Direct flights: ${roundTripAnalysis.directFlights.length}`);
    console.log(`Flights with overnight layovers: ${roundTripAnalysis.overnightLayovers.length}`);
    
    // Display alliance grouping
    console.log(`\nFlights by alliance:`);
    roundTripAnalysis.byAlliance.forEach((flights, alliance) => {
      console.log(`  ${alliance}: ${flights.length} options`);
    });

    // Example 3: Search flights by price range
    console.log('\n\n3. Searching flights within budget...');
    const budgetSearch = await service.searchFlightsByPriceRange(
      london,
      newYork,
      '2025-08-01',
      500, // Max price $500
      { adults: 1 }
    );
    
    console.log(`\nTotal flights found: ${budgetSearch.allItineraries.length}`);
    console.log(`Flights within $500 budget: ${budgetSearch.filteredItineraries.length}`);
    console.log(`Percentage within budget: ${budgetSearch.statistics.percentageWithinBudget}%`);
    console.log(`Cheapest option: $${budgetSearch.statistics.cheapestPrice}`);
    
    console.log(`\nFlights by number of stops:`);
    budgetSearch.byStops.forEach((flights, stops) => {
      console.log(`  ${stops} stop(s): ${flights.length} flights`);
    });

    // Example 4: Search morning flights
    console.log('\n\n4. Searching morning departures...');
    const morningFlights = await service.getMorningFlights(
      london,
      paris,
      '2025-07-10',
      { adults: 1 }
    );
    
    console.log(`\nFound ${morningFlights.itineraries.length} morning flights (6 AM - 12 PM)`);
    console.log(`Average price: $${Math.round(morningFlights.statistics.priceRange.average)}`);
    
    if (morningFlights.earliestDeparture) {
      const depTime = new Date(morningFlights.earliestDeparture.legs[0].departure);
      console.log(`Earliest departure: ${depTime.toLocaleTimeString()} - ${morningFlights.earliestDeparture.price.formatted}`);
    }

    // Example 5: Compare prices across dates
    console.log('\n\n5. Comparing prices across multiple dates...');
    const dates = ['2025-07-01', '2025-07-02', '2025-07-03', '2025-07-04', '2025-07-05'];
    const priceComparison = await service.compareFlightPricesAcrossDates(
      london,
      newYork,
      dates,
      { adults: 1 }
    );
    
    console.log('\nPrice comparison by date:');
    priceComparison.forEach((data, date) => {
      const cheapestPrice = data.cheapest ? data.cheapest.price.formatted : 'N/A';
      console.log(`  ${date}: ${data.totalFlights} flights, Cheapest: ${cheapestPrice}, Avg: $${data.averagePrice}, Direct: ${data.directFlightCount}`);
    });

    // Example 6: Business class search
    console.log('\n\n6. Searching business class flights...');
    const businessClass = await service.getFlightsByCabinClassAnalysis(
      london,
      newYork,
      '2025-07-15',
      'business',
      { adults: 1 }
    );
    
    console.log(`\nFound ${businessClass.itineraries.length} business class options`);
    console.log(`Airlines offering business class: ${businessClass.airlines.join(', ')}`);
    console.log(`Direct business class flights: ${businessClass.directOptions.length}`);
    
    if (businessClass.cheapest) {
      console.log(`Cheapest business class: ${businessClass.cheapest.price.formatted}`);
    }

    // Example 7: Layover analysis
    console.log('\n\n7. Analyzing layovers for London to Los Angeles...');
    const losAngeles = { skyId: 'LAXA', entityId: '27536669' };
    const layoverAnalysis = await service.getLayoverAnalysis(
      london,
      losAngeles,
      '2025-07-20',
      { adults: 1 }
    );
    
    console.log(`\nDirect flights: ${layoverAnalysis.directFlights.length}`);
    console.log(`One-stop flights: ${layoverAnalysis.oneStopFlights.length}`);
    console.log(`Multi-stop flights: ${layoverAnalysis.multiStopFlights.length}`);
    console.log(`Flights with overnight layovers: ${layoverAnalysis.overnightLayovers.length}`);
    console.log(`Flights with short layovers (<90 min): ${layoverAnalysis.shortLayovers.length}`);
    
    console.log(`\nMost common layover airports:`);
    const sortedLayovers = Array.from(layoverAnalysis.layoverAirports.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
    
    sortedLayovers.forEach(([airport, data]) => {
      console.log(`  ${airport}: ${data.count} flights, avg layover: ${data.averageDuration}`);
    });

    // Example 8: Carbon emissions analysis
    console.log('\n\n8. Analyzing carbon emissions...');
    const emissionsAnalysis = await service.getCarbonEmissionsAnalysis(
      london,
      paris,
      '2025-07-15',
      { adults: 1 }
    );
    
    console.log(`\nAverage emissions: ${emissionsAnalysis.averageEmissions} kg CO2`);
    console.log(`Direct flight average emissions: ${emissionsAnalysis.directFlightEmissions} kg CO2`);
    
    if (emissionsAnalysis.lowestEmissions) {
      const lowest = emissionsAnalysis.itineraries.find(i => i.itinerary === emissionsAnalysis.lowestEmissions)!;
      console.log(`\nLowest emissions flight: ${lowest.emissions} kg CO2 - ${lowest.itinerary.price.formatted}`);
    }
    
    if (emissionsAnalysis.bestValueForCarbon) {
      const bestValue = emissionsAnalysis.itineraries.find(i => i.itinerary === emissionsAnalysis.bestValueForCarbon)!;
      console.log(`Best value (price + emissions): ${bestValue.emissions} kg CO2 - ${bestValue.itinerary.price.formatted}`);
    }

    // Example 9: Direct flights only
    console.log('\n\n9. Finding direct flights only...');
    const oneWayResponse = await service.getOneWayFlightPricesAnalysis(
      london,
      newYork,
      '2025-07-10',
      { adults: 1, sortBy: 'price_high' }
    );
    const directFlights = oneWayResponse.directFlights;
    
    console.log(`\nFound ${directFlights.length} direct flights`);
    if (directFlights.length > 0) {
      const sorted = FlightPriceProcessor.sortByPrice(directFlights);
      console.log(`Price range: ${sorted[0].price.formatted} - ${sorted[sorted.length - 1].price.formatted}`);
      
      // Show top 3 direct options
      console.log('\nTop 3 direct flight options:');
      sorted.slice(0, 3).forEach((flight, index) => {
        const duration = FlightPriceProcessor.formatDuration(
          FlightPriceProcessor.getTotalDuration(flight)
        );
        const airline = flight.legs[0].carriers.marketing[0].name;
        console.log(`  ${index + 1}. ${flight.price.formatted} - ${duration} - ${airline}`);
      });
    }

    // Example 10: Finding the fastest flight
    console.log('\n\n10. Finding the fastest flight...');
    const searchForFastest = await service.getOneWayFlightPricesAnalysis(
      london,
      newYork,
      '2025-07-10',
      { adults: 1, sortBy: 'fastest' }
    );
    
    const fastestFlight = searchForFastest.fastest;
    if (fastestFlight) {
      const duration = FlightPriceProcessor.formatDuration(
        FlightPriceProcessor.getTotalDuration(fastestFlight)
      );
      console.log(`\nFastest flight: ${duration} - ${fastestFlight.price.formatted}`);
      console.log(`Stops: ${FlightPriceProcessor.getTotalStops(fastestFlight)}`);
    }

  } catch (error) {
    console.error('Error running flight prices examples:', error);
  } finally {
    // Clean up
    service.destroy();
  }
}

// Run the examples
if (require.main === module) {
  runFlightPricesExamples();
}

export { runFlightPricesExamples }; 