/**
 * FlightLabs Call Sign Endpoint Examples
 * 
 * Demonstrates usage of the flights-with-call-sign endpoint
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
 * Example 1: Basic call sign search
 */
async function basicCallSignSearch() {
  const service = await initializeService();
  
  try {
    // Search for American Airlines flight 100
    const flights = await service.getFlightsByCallSign({ callsign: 'AAL100' });
    
    console.log(`Found ${flights.length} flight(s) with call sign AAL100`);
    
    flights.forEach(flight => {
      const formatted = CallSignDataProcessor.formatCallSignFlight(flight);
      console.log(`\nFlight Details:`);
      console.log(`  Call Sign: ${formatted.callsign}`);
      console.log(`  Aircraft: ${formatted.aircraft.registration}`);
      console.log(`  Position: ${formatted.position.latitude}°, ${formatted.position.longitude}°`);
      console.log(`  Altitude: ${formatted.position.altitude.feet} ft`);
      console.log(`  Speed: ${formatted.speed.ground.knots} kts (${formatted.speed.ground.mph} mph)`);
      console.log(`  Status: ${formatted.status.onGround ? 'On Ground' : 'Airborne'}`);
    });
  } catch (error) {
    console.error('Search error:', error);
  }
}

/**
 * Example 2: Monitor specific airline
 */
async function monitorAirline() {
  const service = await initializeService();
  
  try {
    // Get all British Airways flights
    const result = await service.getAirlineFlightsByCallSign('BAW');
    
    console.log('British Airways Fleet Status:');
    console.log(`  Total Aircraft: ${result.total}`);
    console.log(`  Airborne: ${result.airborne}`);
    console.log(`  On Ground: ${result.grounded}`);
    console.log(`  Unique Aircraft: ${result.byAircraft.size}`);
    
    // Show top 5 aircraft by registration
    const sortedAircraft = Array.from(result.byAircraft.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);
    
    console.log('\nMost Active Aircraft:');
    sortedAircraft.forEach(([registration, flights]) => {
      console.log(`  ${registration}: ${flights.length} flight(s)`);
    });
    
    // Show some airborne flights
    const airborneFlights = CallSignDataProcessor.getAirborneFlights(result.flights);
    console.log(`\nAirborne Flights (${airborneFlights.length} total):`);
    
    airborneFlights.slice(0, 5).forEach(flight => {
      console.log(`  ${flight.callsign} - ${flight.registration} at ${CallSignDataProcessor.metersToFeet(flight.altitude)} ft`);
    });
  } catch (error) {
    console.error('Airline monitoring error:', error);
  }
}

/**
 * Example 3: Real-time tracking with updates
 */
async function trackFlightRealtime(callsign: string, intervalSeconds: number = 60) {
  const service = await initializeService();
  
  console.log(`Starting real-time tracking for ${callsign}...`);
  console.log(`Updates every ${intervalSeconds} seconds. Press Ctrl+C to stop.\n`);
  
  const track = async () => {
    try {
      const result = await service.trackFlightByCallSign(callsign);
      
      if (result.flights.length === 0) {
        console.log(`No flights found with call sign ${callsign}`);
        return;
      }
      
      const flight = result.flights[0];
      const formatted = result.formatted[0];
      const dataAge = CallSignDataProcessor.getDataAge(flight);
      
      console.log(`[${new Date().toISOString()}] ${callsign} Update:`);
      console.log(`  Position: ${formatted.position.latitude}°, ${formatted.position.longitude}°`);
      console.log(`  Altitude: ${formatted.position.altitude.feet} ft`);
      console.log(`  Speed: ${formatted.speed.ground.knots} kts`);
      console.log(`  Heading: ${formatted.position.heading}°`);
      console.log(`  Status: ${formatted.status.onGround ? 'On Ground' : 'Airborne'}`);
      console.log(`  Data Age: ${dataAge} seconds`);
      
      if (formatted.route.origin && formatted.route.destination) {
        console.log(`  Route: ${formatted.route.origin} → ${formatted.route.destination}`);
      }
      
      console.log('---\n');
    } catch (error) {
      console.error('Tracking error:', error);
    }
  };
  
  // Initial track
  await track();
  
  // Set up interval for updates
  const interval = setInterval(track, intervalSeconds * 1000);
  
  // Handle cleanup
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\nTracking stopped.');
    process.exit();
  });
}

/**
 * Example 4: Emergency monitoring
 */
async function monitorEmergencies() {
  const service = await initializeService();
  
  console.log('Monitoring for emergency flights...\n');
  
  const checkEmergencies = async () => {
    try {
      const emergencies = await service.getEmergencyFlights();
      
      if (emergencies.length === 0) {
        console.log(`[${new Date().toISOString()}] No emergency flights detected.`);
        return;
      }
      
      console.log(`[${new Date().toISOString()}] ⚠️  ${emergencies.length} EMERGENCY FLIGHT(S) DETECTED:`);
      
      emergencies.forEach(flight => {
        const formatted = CallSignDataProcessor.formatCallSignFlight(flight);
        const squawkInfo = {
          '7700': '🚨 GENERAL EMERGENCY',
          '7600': '📡 RADIO FAILURE',
          '7500': '🆘 HIJACKING'
        }[flight.squawk] || '⚠️  UNKNOWN EMERGENCY';
        
        console.log(`\n${squawkInfo}`);
        console.log(`  Call Sign: ${flight.callsign}`);
        console.log(`  Aircraft: ${flight.registration}`);
        console.log(`  Position: ${formatted.position.latitude}°, ${formatted.position.longitude}°`);
        console.log(`  Altitude: ${formatted.position.altitude.feet} ft`);
        
        if (formatted.route.origin && formatted.route.destination) {
          console.log(`  Route: ${formatted.route.origin} → ${formatted.route.destination}`);
        }
      });
      
      console.log('\n---\n');
    } catch (error) {
      console.error('Emergency check error:', error);
    }
  };
  
  // Check every 30 seconds
  await checkEmergencies();
  const interval = setInterval(checkEmergencies, 30000);
  
  // Handle cleanup
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\nEmergency monitoring stopped.');
    process.exit();
  });
}

/**
 * Example 5: Geographic analysis
 */
async function analyzeFlightsByLocation() {
  const service = await initializeService();
  
  try {
    // Get all flights
    const flights = await service.getFlightsByCallSign({});
    
    console.log(`Analyzing ${flights.length} flights by location...\n`);
    
    // Group by altitude ranges
    const groundLevel = flights.filter(f => f.altitude < 100);
    const lowAlt = flights.filter(f => f.altitude >= 100 && f.altitude < 3000);
    const midAlt = flights.filter(f => f.altitude >= 3000 && f.altitude < 9000);
    const highAlt = flights.filter(f => f.altitude >= 9000);
    
    console.log('Altitude Distribution:');
    console.log(`  Ground Level (< 100m): ${groundLevel.length}`);
    console.log(`  Low Altitude (100m - 3km): ${lowAlt.length}`);
    console.log(`  Mid Altitude (3km - 9km): ${midAlt.length}`);
    console.log(`  High Altitude (> 9km): ${highAlt.length}`);
    
    // Find flights with routes
    const withRoutes = CallSignDataProcessor.getFlightsWithRoute(flights);
    console.log(`\nFlights with known routes: ${withRoutes.length} of ${flights.length}`);
    
    // Group by airline
    const byAirline = CallSignDataProcessor.groupByAirline(flights);
    console.log(`\nAirlines operating: ${byAirline.size}`);
    
    // Show top 5 airlines
    const sortedAirlines = Array.from(byAirline.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);
    
    console.log('\nTop 5 Airlines by Fleet Size:');
    sortedAirlines.forEach(([airline, flights]) => {
      console.log(`  ${airline}: ${flights.length} aircraft`);
    });
  } catch (error) {
    console.error('Analysis error:', error);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('FlightLabs Call Sign Endpoint Examples\n');
  
  const args = process.argv.slice(2);
  const example = args[0];
  
  switch (example) {
    case 'search':
      await basicCallSignSearch();
      break;
    case 'airline':
      await monitorAirline();
      break;
    case 'track':
      const callsign = args[1] || 'AAL100';
      await trackFlightRealtime(callsign);
      break;
    case 'emergency':
      await monitorEmergencies();
      break;
    case 'analyze':
      await analyzeFlightsByLocation();
      break;
    default:
      console.log('Usage: npm run dev src/examples/callsign-examples.ts [example] [options]');
      console.log('\nExamples:');
      console.log('  search     - Basic call sign search');
      console.log('  airline    - Monitor specific airline');
      console.log('  track      - Real-time flight tracking (optional: callsign)');
      console.log('  emergency  - Monitor emergency flights');
      console.log('  analyze    - Geographic flight analysis');
      break;
  }
  
  // Clean up (for non-continuous examples)
  if (!['track', 'emergency'].includes(example || '')) {
    const service = await initializeService();
    service.destroy();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
} 