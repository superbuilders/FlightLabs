/**
 * FlightLabs API Usage Examples
 * 
 * This file demonstrates various ways to use the FlightLabs utilities
 */

import FlightLabsService, { 
  FlightDataProcessor,
  CallSignDataProcessor,
  HistoricalDataProcessor,
  ScheduleDataProcessor,
  FutureFlightDataProcessor,
  DelayDataProcessor,
  FlightByNumberProcessor,
  FlightStatus,
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
 * Example 1: Get flights by airline
 */
async function getAmericanAirlinesFlights() {
  const service = await initializeService();
  
  try {
    const flights = await service.getFlightsByAirline('AA', { limit: 10 });
    console.log(`Found ${flights.length} American Airlines flights`);
    
    // Get formatted data
    const formatted = await service.getFlightsByAirlineFormatted('AA', { limit: 5 });
    formatted.forEach(flight => {
      console.log(`Flight ${flight.flightNumber}: ${flight.route}`);
      console.log(`  Altitude: ${flight.position.altitude.feet} ft`);
      console.log(`  Speed: ${flight.speed.horizontal.knots} knots`);
    });
  } catch (error) {
    if (error instanceof FlightLabsApiError) {
      console.error('API Error:', error.message);
    } else {
      console.error('Error:', error);
    }
  }
}

/**
 * Example 2: Track a specific flight
 */
async function trackSpecificFlight(flightIata: string) {
  const service = await initializeService();
  
  try {
    const trackingData = await service.trackFlight(flightIata);
    
    if (!trackingData) {
      console.log(`Flight ${flightIata} not found`);
      return;
    }
    
    console.log(`Tracking ${flightIata}:`);
    console.log(`  Status: ${trackingData.flight!.status}`);
    console.log(`  Position: ${trackingData.formatted.position.latitude}, ${trackingData.formatted.position.longitude}`);
    console.log(`  Data age: ${trackingData.dataAge} seconds`);
    console.log(`  Is stale: ${trackingData.isStale}`);
  } catch (error) {
    console.error('Tracking error:', error);
  }
}

/**
 * Example 3: Get airport activity
 */
async function getAirportActivity(airportCode: string) {
  const service = await initializeService();
  
  try {
    const activity = await service.getAirportActivity(airportCode);
    
    console.log(`${airportCode} Airport Activity:`);
    console.log(`  Departures: ${activity.departures.length}`);
    console.log(`  Arrivals: ${activity.arrivals.length}`);
    console.log(`  Total movements: ${activity.totalMovements}`);
    console.log(`  Airlines operating: ${activity.airlines.size}`);
    
    // Show some departures
    console.log('\nNext departures:');
    activity.departures.slice(0, 5).forEach(flight => {
      const formatted = FlightDataProcessor.formatFlightInfo(flight);
      console.log(`  ${formatted.flightNumber} to ${flight.arr_iata} - ${formatted.status}`);
    });
  } catch (error) {
    console.error('Airport activity error:', error);
  }
}

/**
 * Example 4: Get flights in a geographic area
 */
async function getFlightsInArea() {
  const service = await initializeService();
  
  // Example: New York area
  const nyBounds = {
    north: 41.0,
    south: 40.0,
    east: -73.0,
    west: -75.0
  };
  
  try {
    const flights = await service.getFlightsInArea(nyBounds);
    console.log(`Found ${flights.length} flights in the New York area`);
    
    // Group by altitude
    const cruising = flights.filter(f => f.alt > 9000).length;
    const descending = flights.filter(f => f.alt <= 9000 && f.alt > 3000).length;
    const low = flights.filter(f => f.alt <= 3000).length;
    
    console.log(`  Cruising (>30k ft): ${cruising}`);
    console.log(`  Descending (10k-30k ft): ${descending}`);
    console.log(`  Low altitude (<10k ft): ${low}`);
  } catch (error) {
    console.error('Area search error:', error);
  }
}

/**
 * Example 5: Get airline fleet status
 */
async function getAirlineFleetStatus(airlineCode: string) {
  const service = await initializeService();
  
  try {
    const status = await service.getAirlineFleetStatus(airlineCode);
    
    console.log(`${airlineCode} Fleet Status:`);
    console.log(`  Total aircraft: ${status.total}`);
    console.log(`  En-route: ${status.enRoute}`);
    console.log(`  Scheduled: ${status.scheduled}`);
    console.log(`  Landed: ${status.landed}`);
    console.log(`  Average altitude: ${FlightDataProcessor.metersToFeet(status.averageAltitude)} ft`);
    console.log(`  Average speed: ${FlightDataProcessor.kmhToKnots(status.averageSpeed)} knots`);
    
    console.log('\nAircraft types:');
    status.byAircraft.forEach((count, type) => {
      console.log(`  ${type}: ${count}`);
    });
  } catch (error) {
    console.error('Fleet status error:', error);
  }
}

/**
 * Example 6: Search flights with multiple criteria
 */
async function searchFlights() {
  const service = await initializeService();
  
  try {
    // Search for Boeing 737 flights from LAX
    const flights = await service.searchAndSortFlights({
      departure: { iata: 'LAX' },
      limit: 20
    }, 'altitude', 'desc');
    
    console.log(`Found ${flights.length} flights from LAX`);
    
    // Filter for specific aircraft types
    const b737Flights = flights.filter(f => f.aircraft_icao.startsWith('B73'));
    console.log(`  Boeing 737 variants: ${b737Flights.length}`);
    
    b737Flights.forEach(flight => {
      const formatted = FlightDataProcessor.formatFlightInfo(flight);
      console.log(`  ${formatted.flightNumber} - ${formatted.aircraft} at ${formatted.position.altitude.feet} ft`);
    });
  } catch (error) {
    console.error('Search error:', error);
  }
}

/**
 * Example 7: Monitor flights with caching
 */
async function monitorFlightsWithCache() {
  const service = await initializeService();
  
  try {
    // First call - hits API
    console.log('First call (from API)...');
    let start = Date.now();
    const flights1 = await service.getActiveFlights({ airlineIata: 'DL', limit: 50 });
    console.log(`Found ${flights1.length} Delta flights (took ${Date.now() - start}ms)`);
    
    // Second call - from cache
    console.log('\nSecond call (from cache)...');
    start = Date.now();
    const flights2 = await service.getActiveFlights({ airlineIata: 'DL', limit: 50 });
    console.log(`Found ${flights2.length} Delta flights (took ${Date.now() - start}ms)`);
    
    // Check cache stats
    const cacheStats = service.getCacheStats();
    if (cacheStats) {
      console.log('\nCache statistics:');
      console.log(`  Entries: ${cacheStats.size}/${cacheStats.maxSize}`);
      console.log(`  TTL: ${cacheStats.ttl}ms`);
    }
  } catch (error) {
    console.error('Monitoring error:', error);
  }
}

/**
 * Example 8: Calculate distances and ETAs
 */
async function calculateFlightProgress() {
  const service = await initializeService();
  
  try {
    // Track a specific flight
    const flightIata = 'AA100'; // Example flight
    const flights = await service.getFlights({ flightIata });
    
    if (flights.length === 0) {
      console.log('Flight not found');
      return;
    }
    
    const flight = flights[0];
    
    // Assuming we know the arrival airport coordinates
    // (In real app, you'd look these up from an airports database)
    const arrivalCoords = { lat: 51.4775, lon: -0.4614 }; // LHR example
    
    const distance = FlightDataProcessor.calculateDistance(
      flight.lat,
      flight.lng,
      arrivalCoords.lat,
      arrivalCoords.lon
    );
    
    const eta = FlightDataProcessor.estimateTimeToArrival(
      flight,
      arrivalCoords.lat,
      arrivalCoords.lon
    );
    
    console.log(`Flight ${flight.flight_iata} Progress:`);
    console.log(`  Current position: ${flight.lat}, ${flight.lng}`);
    console.log(`  Distance to destination: ${Math.round(distance)} km`);
    console.log(`  Estimated time to arrival: ${eta} minutes`);
  } catch (error) {
    console.error('Progress calculation error:', error);
  }
}

/**
 * Example 9: Track flight by call sign
 */
async function trackByCallSign(callsign: string) {
  const service = await initializeService();
  
  try {
    const tracking = await service.trackFlightByCallSign(callsign);
    
    console.log(`Tracking call sign ${callsign}:`);
    console.log(`  Total matches: ${tracking.flights.length}`);
    console.log(`  Airborne: ${tracking.airborne.length}`);
    console.log(`  On ground: ${tracking.grounded.length}`);
    
    // Show formatted data
    tracking.formatted.forEach(flight => {
      console.log(`\nFlight ${flight.callsign}:`);
      console.log(`  Aircraft: ${flight.aircraft.registration} (${flight.aircraft.code})`);
      console.log(`  Position: ${flight.position.latitude}, ${flight.position.longitude}`);
      console.log(`  Altitude: ${flight.position.altitude.feet} ft`);
      console.log(`  Speed: ${flight.speed.ground.knots} knots`);
      console.log(`  Status: ${flight.status.onGround ? 'On Ground' : 'Airborne'}`);
      if (flight.route.origin && flight.route.destination) {
        console.log(`  Route: ${flight.route.origin} → ${flight.route.destination}`);
      }
    });
  } catch (error) {
    console.error('Call sign tracking error:', error);
  }
}

/**
 * Example 10: Get airline flights using call sign endpoint
 */
async function getAirlineFlightsByCallSignEndpoint(airlineIcao: string) {
  const service = await initializeService();
  
  try {
    const result = await service.getAirlineFlightsByCallSign(airlineIcao);
    
    console.log(`${airlineIcao} Flights (via call sign endpoint):`);
    console.log(`  Total flights: ${result.total}`);
    console.log(`  Airborne: ${result.airborne}`);
    console.log(`  On ground: ${result.grounded}`);
    console.log(`  Aircraft in use: ${result.byAircraft.size}`);
    
    // Show aircraft utilization
    console.log('\nAircraft utilization:');
    result.byAircraft.forEach((flights, registration) => {
      console.log(`  ${registration}: ${flights.length} flight(s)`);
    });
  } catch (error) {
    console.error('Airline flights error:', error);
  }
}

/**
 * Example 11: Monitor emergency flights
 */
async function monitorEmergencyFlights() {
  const service = await initializeService();
  
  try {
    const emergencyFlights = await service.getEmergencyFlights();
    
    if (emergencyFlights.length === 0) {
      console.log('No emergency flights detected');
      return;
    }
    
    console.log(`⚠️  ${emergencyFlights.length} emergency flight(s) detected:`);
    
    emergencyFlights.forEach(flight => {
      const formatted = CallSignDataProcessor.formatCallSignFlight(flight);
      const squawkMeaning = {
        '7700': 'General Emergency',
        '7600': 'Radio Failure',
        '7500': 'Hijacking'
      }[flight.squawk] || 'Unknown Emergency';
      
      console.log(`\n🚨 ${flight.callsign} - ${squawkMeaning} (${flight.squawk})`);
      console.log(`  Aircraft: ${formatted.aircraft.registration}`);
      console.log(`  Position: ${formatted.position.latitude}, ${formatted.position.longitude}`);
      console.log(`  Altitude: ${formatted.position.altitude.feet} ft`);
      console.log(`  Last update: ${formatted.lastUpdate.toISOString()}`);
    });
  } catch (error) {
    console.error('Emergency monitoring error:', error);
  }
}

/**
 * Example 12: Compare endpoints for same airline
 */
async function compareEndpoints(airlineIata: string, airlineIcao: string) {
  const service = await initializeService();
  
  try {
    console.log(`Comparing endpoints for ${airlineIata}/${airlineIcao}...`);
    
    // Get data from both endpoints
    const [realTimeFlights, callSignFlights] = await Promise.all([
      service.getFlights({ airlineIata }),
      service.getAirlineFlightsByCallSign(airlineIcao)
    ]);
    
    console.log('\nReal-time flights endpoint:');
    console.log(`  Total flights: ${realTimeFlights.length}`);
    console.log(`  En-route: ${realTimeFlights.filter(f => f.status === FlightStatus.EN_ROUTE).length}`);
    
    console.log('\nCall sign endpoint:');
    console.log(`  Total flights: ${callSignFlights.total}`);
    console.log(`  Airborne: ${callSignFlights.airborne}`);
    console.log(`  On ground: ${callSignFlights.grounded}`);
    
    // Note: The two endpoints may return different data due to different update frequencies
    // and data sources
  } catch (error) {
    console.error('Comparison error:', error);
  }
}

/**
 * Example 13: Get historical flight data
 */
async function getHistoricalData() {
  const service = await initializeService();
  
  try {
    // Get historical arrivals at LHR for a specific time window
    const flights = await service.getHistoricalFlights({
      code: 'LHR',
      type: 'arrival',
      date_from: '2023-10-01T10:00',
      date_to: '2023-10-01T12:00'
    });
    
    console.log(`Historical arrivals at LHR (2023-10-01 10:00-12:00):`);
    console.log(`Total flights: ${flights.length}\n`);
    
    // Group by airline
    const byAirline = HistoricalDataProcessor.groupByAirline(flights);
    console.log('Airlines:');
    byAirline.forEach((flights, iata) => {
      const airline = flights[0].airline.name;
      console.log(`  ${airline} (${iata}): ${flights.length} flights`);
    });
    
    // Show some flight details
    console.log('\nSample flights:');
    flights.slice(0, 5).forEach(flight => {
      const formatted = HistoricalDataProcessor.formatHistoricalFlight(flight);
      console.log(`  ${formatted.flightNumber} - ${formatted.airline.name}`);
      console.log(`    Aircraft: ${formatted.aircraft.model}`);
      console.log(`    Scheduled: ${formatted.schedule.formattedLocal}`);
      console.log(`    Terminal: ${formatted.airport.terminal || 'N/A'}`);
    });
  } catch (error) {
    console.error('Historical data error:', error);
  }
}

/**
 * Example 14: Get flight schedules
 */
async function getFlightSchedules() {
  const service = await initializeService();
  
  try {
    // Get departure schedules from JFK
    const analysis = await service.getDepartureSchedulesAnalysis('JFK', {
      limit: 20
    });
    
    console.log(`JFK Departure Schedules:`);
    console.log(`Total flights: ${analysis.statistics.total}`);
    console.log(`On-time performance: ${analysis.statistics.onTimePerformance.toFixed(1)}%`);
    console.log(`Delayed: ${analysis.statistics.delayed}`);
    console.log(`Cancelled: ${analysis.statistics.cancelled}\n`);
    
    // Show next few departures
    console.log('Next Departures:');
    const upcoming = ScheduleDataProcessor.getUpcomingDepartures(analysis.flights, new Date(), 2);
    
    upcoming.slice(0, 5).forEach(flight => {
      const formatted = ScheduleDataProcessor.formatScheduledFlight(flight);
      const depTime = formatted.departure.scheduled.local;
      console.log(`  ${formatted.flightIdentifier.iata} to ${flight.arr_iata}`);
      console.log(`    Time: ${depTime?.toLocaleTimeString() || 'N/A'}`);
      console.log(`    Gate: ${formatted.departure.gate || 'TBD'}`);
      console.log(`    Status: ${formatted.status}`);
      if (formatted.departure.delay && formatted.departure.delay > 0) {
        console.log(`    Delay: ${formatted.departure.delay} minutes`);
      }
    });
  } catch (error) {
    console.error('Flight schedules error:', error);
  }
}

/**
 * Example 15: Get future flight predictions
 */
async function getFutureFlights() {
  const service = await initializeService();
  
  try {
    // Get future departures from LAX
    const futureDate = '2025-07-01';
    const analysis = await service.getFutureDeparturesAnalysis('LAX', futureDate);
    
    console.log(`LAX Future Departures (${futureDate}):`);
    console.log(`Total flights: ${analysis.statistics.total}`);
    console.log(`Carriers: ${analysis.statistics.carriers}`);
    console.log(`Destinations: ${analysis.statistics.destinations}\n`);
    
    // Show popular routes
    console.log('Popular Routes:');
    analysis.statistics.popularRoutes.slice(0, 5).forEach(route => {
      console.log(`  ${route.destination}: ${route.count} flights`);
    });
    
    // Show time distribution
    console.log('\nTime Distribution:');
    console.log(`  Morning: ${analysis.timeSlots.morning.length} flights`);
    console.log(`  Afternoon: ${analysis.timeSlots.afternoon.length} flights`);
    console.log(`  Evening: ${analysis.timeSlots.evening.length} flights`);
    
    // Show sample flights
    console.log('\nSample Morning Departures:');
    analysis.timeSlots.morning.slice(0, 3).forEach(flight => {
      const formatted = FutureFlightDataProcessor.formatFutureFlight(flight);
      console.log(`  ${formatted.carrier.fullFlightNumber} to ${formatted.route.airport.city}`);
      console.log(`    Departure: ${formatted.schedule.departure.time12}`);
    });
  } catch (error) {
    console.error('Future flights error:', error);
  }
}

/**
 * Example 16: Monitor flight delays
 */
async function monitorFlightDelays() {
  const service = await initializeService();
  
  try {
    // Get delayed departures from ORD (≥30 minutes)
    const analysis = await service.getDelayedDeparturesAnalysis('ORD', 30);
    
    console.log('ORD Delayed Departures (≥30 min):');
    console.log(`Total delayed flights: ${analysis.statistics.totalFlights}`);
    console.log(`Average delay: ${analysis.statistics.averageDelay} minutes`);
    console.log(`Maximum delay: ${analysis.statistics.maxDelay} minutes\n`);
    
    // Show delay categories
    console.log('Delay Categories:');
    analysis.statistics.byCategory.forEach((count, category) => {
      const pct = (count / analysis.statistics.totalFlights * 100).toFixed(1);
      console.log(`  ${category}: ${count} flights (${pct}%)`);
    });
    
    // Show worst delays
    console.log('\nWorst 3 Delays:');
    analysis.worstDelays.slice(0, 3).forEach(flight => {
      const duration = DelayDataProcessor.formatDelayDuration(flight.delayed);
      console.log(`  ${flight.flight_iata} to ${flight.arr_iata}: ${duration} delay`);
      console.log(`    Status: ${flight.status}`);
      
      // Show cost estimate
      const cost = DelayDataProcessor.estimateDelayCost(flight.delayed);
      console.log(`    Estimated cost: $${cost.totalCost.toLocaleString()}`);
    });
    
    // Show airline performance
    console.log('\nAirline Performance:');
    const topAirlines = Array.from(analysis.airlinePerformance.entries())
      .sort((a, b) => a[1].averageDelay - b[1].averageDelay)
      .slice(0, 3);
    
    topAirlines.forEach(([iata, stats]) => {
      console.log(`  ${iata}: ${stats.totalFlights} delays, avg ${stats.averageDelay}min`);
    });
  } catch (error) {
    console.error('Delay monitoring error:', error);
  }
}

/**
 * Example 17: Get flight by number
 */
async function getFlightByNumber() {
  const service = await initializeService();
  
  try {
    // Get AA100 flight information
    const analysis = await service.getFlightByNumberAnalysis('AA100');
    
    console.log('Flight AA100 Analysis:');
    console.log(`Total schedules: ${analysis.statistics.total}`);
    console.log(`Unique routes: ${analysis.statistics.uniqueRoutes}`);
    console.log(`Aircraft types: ${analysis.statistics.uniqueAircraft}`);
    
    // Show status breakdown
    console.log('\nStatus breakdown:');
    analysis.statistics.statusBreakdown.forEach((count, status) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // Show routes
    console.log('\nRoutes operated:');
    analysis.routes.forEach(route => {
      console.log(`  ${route.from} → ${route.to}: ${route.count} times`);
    });
    
    // Show next scheduled flight
    if (analysis.nextFlight) {
      console.log('\nNext scheduled flight:');
      const formatted = FlightByNumberProcessor.formatFlightInfo(analysis.nextFlight);
      console.log(`  Date: ${analysis.nextFlight.DATE}`);
      console.log(`  Route: ${formatted.from.airport} → ${formatted.to.airport}`);
      console.log(`  Departure: ${analysis.nextFlight.STD}`);
      console.log(`  Aircraft: ${analysis.nextFlight.AIRCRAFT}`);
    }
    
    // Show recent flights
    console.log('\nRecent flights:');
    analysis.sorted.slice(-3).forEach(flight => {
      console.log(`  ${flight.DATE}: ${flight.FROM} → ${flight.TO} (${flight.STATUS})`);
    });
  } catch (error) {
    console.error('Flight by number error:', error);
  }
}

/**
 * Main function to run examples
 */
async function main() {
  console.log('FlightLabs API Examples\n');
  
  // Uncomment the examples you want to run:
  
  // await getAmericanAirlinesFlights();
  // await trackSpecificFlight('AA719');
  // await getAirportActivity('JFK');
  // await getFlightsInArea();
  // await getAirlineFleetStatus('UA');
  // await searchFlights();
  // await monitorFlightsWithCache();
  // await calculateFlightProgress();
  // await trackByCallSign('BAW123');
  // await getAirlineFlightsByCallSignEndpoint('BAW');
  // await monitorEmergencyFlights();
  // await compareEndpoints('DL', 'BAW');
  // await getHistoricalData();
  // await getFlightSchedules();
  // await getFutureFlights();
  // await monitorFlightDelays();
  // await getFlightByNumber();
  
  // Don't forget to clean up
  const service = await initializeService();
  service.destroy();
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
} 