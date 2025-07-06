/**
 * FlightLabs Flights By Airline Examples
 * 
 * Demonstrates usage of the flights-by-airline endpoint
 */

import FlightLabsService, { 
  CallSignDataProcessor,
  CallSignFlightData,
  FlightLabsApiError 
} from '../utils/flightlabs';
import { flightLabsConfig, validateConfig } from '../config/flightlabs.config';

// Initialize the service
async function initializeService() {
  try {
    validateConfig();
    const service = new FlightLabsService(flightLabsConfig);
    return service;
  } catch (error) {
    console.error('Failed to initialize FlightLabs service:', error);
    throw error;
  }
}

/**
 * Example 1: Get flights by airline ICAO code
 */
async function getFlightsByAirline() {
  const service = await initializeService();
  
  try {
    // Get Azul Brazilian Airlines flights (ICAO: AZU)
    const result = await service.getFlightsByAirlineIcao('AZU');
    
    console.log('Azul Brazilian Airlines (AZU) Flights:');
    console.log(`  Total flights: ${result.total}`);
    console.log(`  Airborne: ${result.airborne.length}`);
    console.log(`  On ground: ${result.grounded.length}`);
    console.log(`  Active routes: ${result.byRoute.size}`);
    console.log(`  Aircraft in use: ${result.byAircraft.size}`);
    
    if (result.statistics.emergencyCount > 0) {
      console.log(`  ⚠️ Emergency flights: ${result.statistics.emergencyCount}`);
    }
    
    console.log('\nOperational metrics:');
    console.log(`  Average altitude: ${result.statistics.averageAltitude}m (${Math.round(result.statistics.averageAltitude * 3.28084)}ft)`);
    console.log(`  Average speed: ${result.statistics.averageSpeed} knots`);
    
    // Show some airborne flights
    console.log('\nSample airborne flights:');
    result.airborne.slice(0, 3).forEach(flight => {
      const formatted = CallSignDataProcessor.formatCallSignFlight(flight);
      console.log(`  ${flight.callsign} (${flight.number})`);
      console.log(`    Route: ${flight.origin_airport_iata} → ${flight.destination_airport_iata}`);
      console.log(`    Aircraft: ${flight.registration} (${flight.aircraft_code})`);
      console.log(`    Altitude: ${formatted.position.altitude.feet} ft`);
      console.log(`    Speed: ${formatted.speed.ground.knots} knots`);
    });
  } catch (error) {
    console.error('Error fetching airline flights:', error);
  }
}

/**
 * Example 2: Get airline operations summary
 */
async function getAirlineOperationsSummary() {
  const service = await initializeService();
  
  try {
    // Get comprehensive summary for TAM Airlines (ICAO: TAM)
    const summary = await service.getAirlineOperationsSummary('TAM');
    
    console.log(`${summary.airline} Operations Summary:`);
    
    console.log('\nFleet Status:');
    console.log(`  Total aircraft tracked: ${summary.fleetStatus.total}`);
    console.log(`  Currently airborne: ${summary.fleetStatus.airborne}`);
    console.log(`  On ground: ${summary.fleetStatus.grounded}`);
    if (summary.fleetStatus.emergency > 0) {
      console.log(`  🚨 Emergency: ${summary.fleetStatus.emergency}`);
    }
    
    console.log('\nRoute Network:');
    console.log(`  Active routes: ${summary.routeNetwork.activeRoutes}`);
    console.log('  Top routes:');
    summary.routeNetwork.topRoutes.forEach(route => {
      console.log(`    ${route.route}: ${route.flights} flight(s)`);
    });
    
    console.log('\nAircraft Utilization:');
    console.log(`  Aircraft in use: ${summary.aircraftUtilization.inUse}`);
    console.log('  Most active aircraft:');
    summary.aircraftUtilization.topAircraft.forEach(aircraft => {
      console.log(`    ${aircraft.registration}: ${aircraft.flights} flight(s)`);
    });
    
    console.log('\nOperational Metrics:');
    console.log(`  Average altitude: ${summary.operationalMetrics.averageAltitude.feet} ft`);
    console.log(`  Average speed: ${summary.operationalMetrics.averageSpeed.mph} mph`);
  } catch (error) {
    console.error('Error fetching operations summary:', error);
  }
}

/**
 * Example 3: Compare airline operations
 */
async function compareAirlineOperations() {
  const service = await initializeService();
  
  try {
    // Compare two Brazilian airlines
    const airlines = ['AZU', 'GLO']; // Azul and Gol
    const results = new Map();
    
    console.log('Comparing Brazilian Airlines Operations:\n');
    
    for (const icao of airlines) {
      const analysis = await service.getFlightsByAirlineIcao(icao);
      results.set(icao, analysis);
      
      console.log(`${icao}:`);
      console.log(`  Total flights: ${analysis.total}`);
      console.log(`  Airborne: ${analysis.airborne.length} (${(analysis.airborne.length / analysis.total * 100).toFixed(1)}%)`);
      console.log(`  Routes: ${analysis.byRoute.size}`);
      console.log(`  Fleet size: ${analysis.byAircraft.size}`);
      console.log();
    }
    
    // Find common routes
    const azuRoutes = results.get('AZU').byRoute;
    const gloRoutes = results.get('GLO').byRoute;
    const commonRoutes: string[] = [];
    
    azuRoutes.forEach((flights: CallSignFlightData[], route: string) => {
      if (gloRoutes.has(route)) {
        commonRoutes.push(route);
      }
    });
    
    if (commonRoutes.length > 0) {
      console.log(`Common routes (${commonRoutes.length}):`);
      commonRoutes.slice(0, 5).forEach(route => {
        console.log(`  ${route}`);
      });
    }
  } catch (error) {
    console.error('Error comparing airlines:', error);
  }
}

/**
 * Example 4: Monitor airline with specific limit
 */
async function monitorAirlineWithLimit() {
  const service = await initializeService();
  
  try {
    // Get limited results for better performance
    const limit = 50;
    const result = await service.getFlightsByAirlineIcao('AAL', limit); // American Airlines
    
    console.log(`American Airlines (AAL) - Limited to ${limit} flights:`);
    console.log(`  Showing ${result.flights.length} of potentially more flights`);
    console.log(`  Airborne: ${result.airborne.length}`);
    console.log(`  On ground: ${result.grounded.length}`);
    
    // Group by phase of flight
    const climbing = result.airborne.filter(f => f.vertical_speed > 100);
    const descending = result.airborne.filter(f => f.vertical_speed < -100);
    const cruising = result.airborne.filter(f => Math.abs(f.vertical_speed) <= 100);
    
    console.log('\nFlight phases:');
    console.log(`  Climbing: ${climbing.length}`);
    console.log(`  Cruising: ${cruising.length}`);
    console.log(`  Descending: ${descending.length}`);
    
    // Show busiest routes
    const routeCounts = Array.from(result.byRoute.entries())
      .map(([route, flights]) => ({ route, count: flights.length }))
      .sort((a, b) => b.count - a.count);
    
    console.log('\nBusiest routes in sample:');
    routeCounts.slice(0, 5).forEach(({ route, count }) => {
      console.log(`  ${route}: ${count} flight(s)`);
    });
  } catch (error) {
    console.error('Error monitoring airline:', error);
  }
}

/**
 * Example 5: Real-time fleet tracking
 */
async function trackFleetInRealTime() {
  const service = await initializeService();
  
  try {
    // Track Copa Airlines fleet
    const result = await service.getFlightsByAirlineIcao('CMP');
    
    console.log('Copa Airlines (CMP) Real-Time Fleet Tracking:');
    console.log(`  Last update: ${new Date().toISOString()}`);
    console.log(`  Total fleet tracked: ${result.total}`);
    
    // Calculate fleet distribution
    const fleetByType = new Map();
    result.flights.forEach(flight => {
      const type = flight.aircraft_code || 'Unknown';
      fleetByType.set(type, (fleetByType.get(type) || 0) + 1);
    });
    
    console.log('\nFleet composition:');
    Array.from(fleetByType.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count} aircraft`);
      });
    
    // Show flights by status
    console.log('\nCurrent operations:');
    
    // International flights (simplified by checking if route crosses certain distance)
    const longHaulFlights = result.airborne.filter(flight => {
      if (!flight.origin_airport_iata || !flight.destination_airport_iata) return false;
      // This is a simplification - in real app you'd check actual airport locations
      return flight.altitude > 10000; // Assume high altitude = longer flight
    });
    
    console.log(`  Long-haul/High altitude flights: ${longHaulFlights.length}`);
    console.log(`  Regional flights: ${result.airborne.length - longHaulFlights.length}`);
    
    // Show some active flights with details
    console.log('\nActive flights snapshot:');
    result.airborne.slice(0, 5).forEach(flight => {
      const time = new Date(flight.time * 1000);
      console.log(`\n  Flight ${flight.number} (${flight.callsign})`);
      console.log(`    ${flight.origin_airport_iata} → ${flight.destination_airport_iata}`);
      console.log(`    Position: ${flight.latitude.toFixed(4)}°, ${flight.longitude.toFixed(4)}°`);
      console.log(`    Altitude: ${Math.round(flight.altitude * 3.28084)} ft`);
      console.log(`    Last update: ${time.toLocaleTimeString()}`);
    });
  } catch (error) {
    console.error('Error tracking fleet:', error);
  }
}

/**
 * Example 6: Emergency monitoring for airline
 */
async function monitorAirlineEmergencies() {
  const service = await initializeService();
  
  try {
    // Check multiple airlines for emergencies
    const airlines = ['AAL', 'DAL', 'UAL', 'SWA']; // Major US carriers
    console.log('Emergency Monitoring for Major US Carriers:\n');
    
    for (const icao of airlines) {
      const result = await service.getFlightsByAirlineIcao(icao, 100);
      
      console.log(`${icao}:`);
      console.log(`  Flights checked: ${result.flights.length}`);
      
      if (result.statistics.emergencyCount > 0) {
        console.log(`  🚨 EMERGENCY DETECTED: ${result.statistics.emergencyCount} flight(s)`);
        
        // Find emergency flights
        const emergencies = CallSignDataProcessor.getEmergencyFlights(result.flights);
        emergencies.forEach(flight => {
          const squawkMeaning = {
            '7700': 'General Emergency',
            '7600': 'Radio Failure',
            '7500': 'Hijacking'
          }[flight.squawk] || 'Unknown Emergency';
          
          console.log(`    Flight ${flight.number}: ${squawkMeaning} (${flight.squawk})`);
          console.log(`      Position: ${flight.latitude}, ${flight.longitude}`);
          console.log(`      Altitude: ${Math.round(flight.altitude * 3.28084)} ft`);
        });
      } else {
        console.log(`  ✓ No emergencies`);
      }
      console.log();
    }
    
    console.log('Note: This is for demonstration. In production, emergency');
    console.log('information should be handled by appropriate authorities.');
  } catch (error) {
    console.error('Error monitoring emergencies:', error);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('FlightLabs Flights By Airline Examples\n');
  
  const args = process.argv.slice(2);
  const example = args[0];
  
  switch (example) {
    case 'basic':
      await getFlightsByAirline();
      break;
    case 'summary':
      await getAirlineOperationsSummary();
      break;
    case 'compare':
      await compareAirlineOperations();
      break;
    case 'limit':
      await monitorAirlineWithLimit();
      break;
    case 'fleet':
      await trackFleetInRealTime();
      break;
    case 'emergency':
      await monitorAirlineEmergencies();
      break;
    default:
      console.log('Usage: npm run dev src/examples/flights-by-airline-examples.ts [example]');
      console.log('\nExamples:');
      console.log('  basic     - Get flights by airline ICAO code');
      console.log('  summary   - Get comprehensive operations summary');
      console.log('  compare   - Compare two airlines operations');
      console.log('  limit     - Monitor airline with result limit');
      console.log('  fleet     - Real-time fleet tracking');
      console.log('  emergency - Monitor airline emergencies');
      break;
  }
  
  // Clean up
  const service = await initializeService();
  service.destroy();
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
} 