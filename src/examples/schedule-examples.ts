/**
 * FlightLabs Flight Schedules Endpoint Examples
 * 
 * Demonstrates usage of the advanced flight schedules endpoint
 */

import FlightLabsService, { 
  ScheduleDataProcessor,
  FlightScheduleData,
  hasPaginationInfo,
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
 * Example 1: Get departure schedules with analysis
 */
async function getDepartureSchedules() {
  const service = await initializeService();
  
  try {
    // Get departure schedules from JFK
    const analysis = await service.getDepartureSchedulesAnalysis('JFK', {
      limit: 50
    });
    
    console.log('JFK Departure Schedules Analysis:');
    console.log(`  Total flights: ${analysis.statistics.total}`);
    console.log(`  Scheduled: ${analysis.statistics.scheduled}`);
    console.log(`  Active: ${analysis.statistics.active}`);
    console.log(`  Cancelled: ${analysis.statistics.cancelled}`);
    console.log(`  Delayed: ${analysis.statistics.delayed}`);
    console.log(`  On-time performance: ${analysis.statistics.onTimePerformance.toFixed(1)}%`);
    console.log(`  Codeshare flights: ${analysis.statistics.codeshare}`);
    
    // Show terminal distribution
    console.log('\nTerminal Distribution:');
    analysis.byTerminal.forEach((flights, terminal) => {
      console.log(`  Terminal ${terminal}: ${flights.length} flights`);
    });
    
    // Show top airlines
    console.log('\nTop Airlines:');
    const topAirlines = Array.from(analysis.byAirline.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);
    
    topAirlines.forEach(([airline, flights]) => {
      console.log(`  ${airline}: ${flights.length} flights`);
    });
    
    // Show delayed flights
    const delayed = ScheduleDataProcessor.filterDelayedFlights(analysis.flights, 30);
    if (delayed.length > 0) {
      console.log('\nSignificantly Delayed Flights (30+ minutes):');
      delayed.slice(0, 5).forEach(flight => {
        const formatted = ScheduleDataProcessor.formatScheduledFlight(flight);
        console.log(`  ${formatted.flightIdentifier.iata} to ${flight.arr_iata}`);
        console.log(`    Departure delay: ${formatted.departure.delay || 0} minutes`);
        console.log(`    Status: ${formatted.status}`);
      });
    }
  } catch (error) {
    console.error('Departure schedules error:', error);
  }
}

/**
 * Example 2: Get arrival schedules with baggage claim info
 */
async function getArrivalSchedules() {
  const service = await initializeService();
  
  try {
    // Get arrival schedules at LAX
    const analysis = await service.getArrivalSchedulesAnalysis('LAX', {
      limit: 50
    });
    
    console.log('LAX Arrival Schedules Analysis:');
    console.log(`  Total flights: ${analysis.statistics.total}`);
    console.log(`  Scheduled: ${analysis.statistics.scheduled}`);
    console.log(`  Active: ${analysis.statistics.active}`);
    console.log(`  Landed: ${analysis.statistics.landed}`);
    console.log(`  Cancelled: ${analysis.statistics.cancelled}`);
    console.log(`  On-time performance: ${analysis.statistics.onTimePerformance.toFixed(1)}%`);
    
    // Show baggage claim assignments
    console.log('\nBaggage Claim Assignments:');
    analysis.statistics.baggageClaims.forEach((flights, carousel) => {
      console.log(`  Carousel ${carousel}: ${flights.length} flights`);
      flights.slice(0, 3).forEach(flight => {
        console.log(`    - ${flight.flight_iata} from ${flight.dep_iata}`);
      });
    });
    
    // Show upcoming arrivals
    const now = new Date();
    const upcoming = ScheduleDataProcessor.filterByTimeRange(
      analysis.flights,
      now,
      new Date(now.getTime() + 2 * 60 * 60 * 1000), // Next 2 hours
      'arrival'
    );
    
    console.log(`\nUpcoming Arrivals (next 2 hours): ${upcoming.length}`);
    upcoming.slice(0, 5).forEach(flight => {
      const formatted = ScheduleDataProcessor.formatScheduledFlight(flight);
      const arrTime = formatted.arrival.scheduled.local;
      console.log(`  ${formatted.flightIdentifier.iata} from ${flight.dep_iata}`);
      console.log(`    Scheduled: ${arrTime ? arrTime.toLocaleTimeString() : 'N/A'}`);
      console.log(`    Gate: ${formatted.arrival.gate || 'TBD'}`);
      console.log(`    Status: ${formatted.status}`);
    });
  } catch (error) {
    console.error('Arrival schedules error:', error);
  }
}

/**
 * Example 3: Get gate assignments
 */
async function getGateAssignments() {
  const service = await initializeService();
  
  try {
    // Get gate assignments at DFW
    const assignments = await service.getGateAssignments('DFW', 'departure', {
      limit: 100
    });
    
    console.log(`DFW Gate Assignments (${assignments.total} flights):`);
    console.log(`  Gates in use: ${assignments.gates.size}`);
    console.log(`  Unassigned: ${assignments.unassigned.length}`);
    
    // Show busiest gates
    const busyGates = Array.from(assignments.gates.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);
    
    console.log('\nBusiest Gates:');
    busyGates.forEach(([gate, flights]) => {
      console.log(`\n  Gate ${gate}: ${flights.length} flights`);
      flights.slice(0, 3).forEach(flight => {
        const time = ScheduleDataProcessor.parseLocalTime(flight.dep_time);
        console.log(`    ${flight.flight_iata} to ${flight.arr_iata} at ${time?.toLocaleTimeString() || 'N/A'}`);
      });
    });
  } catch (error) {
    console.error('Gate assignments error:', error);
  }
}

/**
 * Example 4: Track specific flight schedule
 */
async function trackFlightSchedule() {
  const service = await initializeService();
  
  try {
    // Track United flight 100 from SFO
    const schedules = await service.getFlightSchedule('UA100', 'SFO', 'departure');
    
    if (schedules.length === 0) {
      console.log('Flight UA100 not found in SFO departures');
      return;
    }
    
    console.log(`Found ${schedules.length} schedule(s) for UA100 from SFO:`);
    
    schedules.forEach(flight => {
      const formatted = ScheduleDataProcessor.formatScheduledFlight(flight);
      
      console.log(`\n${formatted.flightIdentifier.iata} - ${formatted.status.toUpperCase()}`);
      console.log('Departure:');
      console.log(`  Airport: ${flight.dep_iata} Terminal ${formatted.departure.terminal || 'N/A'} Gate ${formatted.departure.gate || 'TBD'}`);
      console.log(`  Scheduled: ${formatted.departure.scheduled.local?.toLocaleString() || 'N/A'}`);
      if (formatted.departure.estimated.local) {
        console.log(`  Estimated: ${formatted.departure.estimated.local.toLocaleString()}`);
      }
      if (formatted.departure.actual.local) {
        console.log(`  Actual: ${formatted.departure.actual.local.toLocaleString()}`);
      }
      if (formatted.departure.delay) {
        console.log(`  Delay: ${formatted.departure.delay} minutes`);
      }
      
      console.log('Arrival:');
      console.log(`  Airport: ${flight.arr_iata} Terminal ${formatted.arrival.terminal || 'N/A'} Gate ${formatted.arrival.gate || 'TBD'}`);
      console.log(`  Scheduled: ${formatted.arrival.scheduled.local?.toLocaleString() || 'N/A'}`);
      if (formatted.arrival.estimated.local) {
        console.log(`  Estimated: ${formatted.arrival.estimated.local.toLocaleString()}`);
      }
      
      console.log(`Duration: ${formatted.duration} minutes`);
      
      if (formatted.codeshare.flightIata) {
        console.log(`Codeshare: ${formatted.codeshare.flightIata}`);
      }
    });
  } catch (error) {
    console.error('Flight schedule tracking error:', error);
  }
}

/**
 * Example 5: Paginated schedule retrieval
 */
async function getPaginatedSchedules() {
  const service = await initializeService();
  
  try {
    console.log('Fetching all departures from ATL (paginated)...\n');
    
    let pageCount = 0;
    let totalFlights = 0;
    const airlineStats = new Map<string, number>();
    
    // Use async generator to fetch pages
    for await (const page of service.getAllSchedulesPaginated('ATL', 'departure', 50)) {
      pageCount++;
      totalFlights += page.length;
      
      // Collect airline statistics
      page.forEach(flight => {
        const count = airlineStats.get(flight.airline_iata) || 0;
        airlineStats.set(flight.airline_iata, count + 1);
      });
      
      console.log(`Page ${pageCount}: ${page.length} flights (Total: ${totalFlights})`);
      
      // Stop after 5 pages for demo
      if (pageCount >= 5) {
        console.log('\nStopping after 5 pages for demo...');
        break;
      }
    }
    
    // Show airline distribution
    console.log('\nAirline Distribution:');
    const sortedAirlines = Array.from(airlineStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sortedAirlines.forEach(([airline, count]) => {
      const percentage = (count / totalFlights * 100).toFixed(1);
      console.log(`  ${airline}: ${count} flights (${percentage}%)`);
    });
  } catch (error) {
    console.error('Paginated retrieval error:', error);
  }
}

/**
 * Example 6: On-time performance analysis
 */
async function analyzeOnTimePerformance() {
  const service = await initializeService();
  
  try {
    // Compare on-time performance between airlines at ORD
    const response = await service.getFlightSchedules({
      iataCode: 'ORD',
      type: 'departure',
      limit: 200
    });
    
    console.log('ORD On-Time Performance Analysis:');
    
    // Overall stats
    const overall = ScheduleDataProcessor.calculateOnTimePerformance(response.data);
    console.log(`\nOverall Performance (${overall.total} flights):`);
    console.log(`  On-time: ${overall.onTime} (${overall.onTimePercentage.toFixed(1)}%)`);
    console.log(`  Delayed: ${overall.delayed}`);
    console.log(`  Cancelled: ${overall.cancelled}`);
    
    // By airline
    const byAirline = ScheduleDataProcessor.groupByAirline(response.data);
    const airlinePerformance = new Map<string, any>();
    
    byAirline.forEach((flights, airline) => {
      const perf = ScheduleDataProcessor.calculateOnTimePerformance(flights);
      if (flights.length >= 5) { // Only airlines with 5+ flights
        airlinePerformance.set(airline, perf);
      }
    });
    
    // Sort by on-time percentage
    const sorted = Array.from(airlinePerformance.entries())
      .sort((a, b) => b[1].onTimePercentage - a[1].onTimePercentage);
    
    console.log('\nAirline Performance (5+ flights):');
    sorted.forEach(([airline, perf]) => {
      console.log(`  ${airline}: ${perf.onTimePercentage.toFixed(1)}% on-time (${perf.total} flights)`);
    });
    
    // Show pagination info if available
    if (hasPaginationInfo(response)) {
      console.log('\nPagination Info:');
      console.log(`  Current page: ${response.skip + 1}`);
      console.log(`  Page size: ${response.limit}`);
      console.log(`  Total items: ${response.total_items}`);
      console.log(`  Has more: ${response.has_more}`);
    }
  } catch (error) {
    console.error('On-time performance error:', error);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('FlightLabs Flight Schedules Examples\n');
  
  const args = process.argv.slice(2);
  const example = args[0];
  
  switch (example) {
    case 'departures':
      await getDepartureSchedules();
      break;
    case 'arrivals':
      await getArrivalSchedules();
      break;
    case 'gates':
      await getGateAssignments();
      break;
    case 'track':
      await trackFlightSchedule();
      break;
    case 'paginated':
      await getPaginatedSchedules();
      break;
    case 'ontime':
      await analyzeOnTimePerformance();
      break;
    default:
      console.log('Usage: npm run dev src/examples/schedule-examples.ts [example]');
      console.log('\nExamples:');
      console.log('  departures  - Analyze departure schedules');
      console.log('  arrivals    - Analyze arrival schedules with baggage info');
      console.log('  gates       - Get gate assignments');
      console.log('  track       - Track specific flight schedule');
      console.log('  paginated   - Demonstrate paginated retrieval');
      console.log('  ontime      - Analyze on-time performance');
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