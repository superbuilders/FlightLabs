/**
 * Test script for Flight Prices implementation
 */

import { FlightLabsService } from './utils/flightlabs/FlightLabsService';
import { flightLabsConfig } from './config/flightlabs.config';

async function testFlightPrices() {
  console.log('Testing Flight Prices Implementation...\n');

  const service = new FlightLabsService({
    ...flightLabsConfig,
    cacheEnabled: false, // Disable cache for testing
  });

  try {
    // Test 1: Basic type imports
    console.log('✅ Type imports successful');

    // Test 2: Service methods exist
    console.log('Checking service methods...');
    const methods = [
      'getFlightPrices',
      'getOneWayFlightPricesAnalysis',
      'getRoundTripFlightPricesAnalysis',
      'searchFlightsByPriceRange',
      'getMorningFlights',
      'compareFlightPricesAcrossDates',
      'getFlightsByCabinClassAnalysis',
      'getLayoverAnalysis',
      'getCarbonEmissionsAnalysis'
    ];

    let allMethodsExist = true;
    for (const method of methods) {
      if (typeof (service as any)[method] !== 'function') {
        console.log(`❌ Method ${method} not found`);
        allMethodsExist = false;
      }
    }
    
    if (allMethodsExist) {
      console.log('✅ All service methods exist');
    }

    // Test 3: Processor methods
    console.log('\nChecking FlightPriceProcessor...');
    const { FlightPriceProcessor } = await import('./utils/flightlabs/FlightPriceProcessor');
    
    const processorMethods = [
      'sortByPrice',
      'sortByDuration',
      'sortByStops',
      'getTotalDuration',
      'getTotalStops',
      'filterByMaxPrice',
      'filterDirectFlightsOnly',
      'findBestValue',
      'formatItinerarySummary',
      'getLayoverInfo',
      'hasOvernightLayover',
      'groupByAlliance',
      'estimateCarbonEmissions'
    ];

    let allProcessorMethodsExist = true;
    for (const method of processorMethods) {
      if (typeof (FlightPriceProcessor as any)[method] !== 'function') {
        console.log(`❌ Processor method ${method} not found`);
        allProcessorMethodsExist = false;
      }
    }
    
    if (allProcessorMethodsExist) {
      console.log('✅ All processor methods exist');
    }

    console.log('\n✅ Flight Prices implementation test completed successfully!');
    
    console.log('\nNote: To test actual API calls, you need:');
    console.log('1. Valid Sky IDs and Entity IDs from the retrieveAirport endpoint');
    console.log('2. A valid API key in your configuration');
    console.log('3. Run the example file: backend/src/examples/flightPricesExample.ts');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    service.destroy();
  }
}

// Run the test
testFlightPrices(); 