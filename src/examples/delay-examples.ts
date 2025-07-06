/**
 * FlightLabs Flight Delays Endpoint Examples
 * 
 * Demonstrates usage of the flight delays endpoint
 */

import FlightLabsService, { 
  DelayDataProcessor,
  FlightDelayData,
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
 * Example 1: Get delayed departures from an airport
 */
async function getDelayedDepartures() {
  const service = await initializeService();
  
  try {
    // Get departures delayed by at least 30 minutes from JFK
    const analysis = await service.getDelayedDeparturesAnalysis('JFK', 30);
    
    console.log('JFK Delayed Departures Analysis (≥30 min):');
    console.log(`  Total delayed flights: ${analysis.statistics.totalFlights}`);
    console.log(`  Active delayed flights: ${analysis.active.length}`);
    console.log(`  Average delay: ${analysis.statistics.averageDelay} minutes`);
    console.log(`  Maximum delay: ${analysis.statistics.maxDelay} minutes`);
    
    // Show delay categories
    console.log('\nDelay Categories:');
    analysis.statistics.byCategory.forEach((count, category) => {
      const pct = (count / analysis.statistics.totalFlights * 100).toFixed(1);
      console.log(`  ${category}: ${count} flights (${pct}%)`);
    });
    
    // Show worst delays
    console.log('\nTop 5 Worst Delays:');
    analysis.worstDelays.forEach(flight => {
      const duration = DelayDataProcessor.formatDelayDuration(flight.delayed);
      const trend = DelayDataProcessor.getDelayTrend(flight);
      console.log(`  ${flight.flight_iata} to ${flight.arr_iata}: ${duration} delay (${trend})`);
    });
    
    // Show airline performance
    console.log('\nAirline Delay Performance:');
    const topAirlines = Array.from(analysis.airlinePerformance.entries())
      .sort((a, b) => b[1].totalFlights - a[1].totalFlights)
      .slice(0, 5);
    
    topAirlines.forEach(([iata, stats]) => {
      console.log(`  ${iata}: ${stats.totalFlights} delays, avg ${stats.averageDelay}min, max ${stats.maxDelay}min`);
    });
  } catch (error) {
    console.error('Delayed departures error:', error);
  }
}

/**
 * Example 2: Get delayed arrivals with trend analysis
 */
async function getDelayedArrivals() {
  const service = await initializeService();
  
  try {
    // Get arrivals delayed by at least 45 minutes at LAX
    const analysis = await service.getDelayedArrivalsAnalysis('LAX', 45);
    
    console.log('LAX Delayed Arrivals Analysis (≥45 min):');
    console.log(`  Total delayed flights: ${analysis.statistics.totalFlights}`);
    console.log(`  Average dep delay: ${analysis.statistics.averageDepartureDelay} min`);
    console.log(`  Average arr delay: ${analysis.statistics.averageArrivalDelay} min`);
    
    // Show delay trends
    console.log('\nDelay Trends (departure → arrival):');
    analysis.delayTrends.forEach((count, trend) => {
      const pct = (count / analysis.statistics.totalFlights * 100).toFixed(1);
      console.log(`  ${trend}: ${count} flights (${pct}%)`);
    });
    
    // Show origin airports
    console.log('\nTop Origin Airports by Delays:');
    const topOrigins = Array.from(analysis.byOriginAirport.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);
    
    topOrigins.forEach(([airport, flights]) => {
      const avgDelay = Math.round(
        flights.reduce((sum, f) => sum + f.delayed, 0) / flights.length
      );
      console.log(`  ${airport}: ${flights.length} flights, avg ${avgDelay}min delay`);
    });
    
    // Show formatted examples
    console.log('\nActive Delayed Arrivals:');
    analysis.active.slice(0, 3).forEach(flight => {
      const formatted = DelayDataProcessor.formatDelayedFlight(flight);
      console.log(`  ${formatted.flightIdentifier.full} from ${formatted.route.departure.airport}`);
      console.log(`    Delay: ${formatted.delay.total}min (${formatted.delay.category.description})`);
      if (formatted.schedule.arrival.estimated.local) {
        console.log(`    ETA: ${formatted.schedule.arrival.estimated.local.toLocaleTimeString()}`);
      }
    });
  } catch (error) {
    console.error('Delayed arrivals error:', error);
  }
}

/**
 * Example 3: Analyze airline delay performance and costs
 */
async function analyzeAirlineDelays() {
  const service = await initializeService();
  
  try {
    // Analyze American Airlines delays
    const analysis = await service.getAirlineDelayAnalysis('AA', 15, 'departures');
    
    console.log('American Airlines Delay Analysis (≥15 min departures):');
    console.log(`  Total delayed flights: ${analysis.statistics.totalFlights}`);
    console.log(`  Total delay time: ${analysis.statistics.totalDelayMinutes} minutes`);
    console.log(`  Median delay: ${analysis.statistics.medianDelay} minutes`);
    
    // Show route analysis
    console.log('\nMost Affected Routes:');
    const topRoutes = Array.from(analysis.byRoute.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);
    
    topRoutes.forEach(([route, flights]) => {
      const avgDelay = Math.round(
        flights.reduce((sum, f) => sum + f.delayed, 0) / flights.length
      );
      console.log(`  ${route}: ${flights.length} delays, avg ${avgDelay}min`);
    });
    
    // Show cost estimates
    console.log('\nEstimated Delay Costs:');
    console.log(`  Total estimated cost: $${analysis.estimatedCosts.total.toLocaleString()}`);
    console.log(`  Average cost per flight: $${analysis.estimatedCosts.perFlight.toLocaleString()}`);
    
    console.log('\nTop 5 Most Costly Delays:');
    analysis.estimatedCosts.breakdown.slice(0, 5).forEach(item => {
      const duration = DelayDataProcessor.formatDelayDuration(item.delay);
      console.log(`  ${item.flight}: ${duration} = $${item.cost.totalCost.toLocaleString()}`);
      console.log(`    Passenger cost: $${item.cost.passengerCost.toLocaleString()}`);
      console.log(`    Airline cost: $${item.cost.airlineCost.toLocaleString()}`);
    });
  } catch (error) {
    console.error('Airline delay analysis error:', error);
  }
}

/**
 * Example 4: Compare airline performance on a route
 */
async function compareRouteDelays() {
  const service = await initializeService();
  
  try {
    // Compare airlines on the JFK-LAX route
    const analysis = await service.getRouteDelayAnalysis('JFK', 'LAX', 20, 'departures');
    
    console.log('JFK-LAX Route Delay Analysis (≥20 min):');
    console.log(`  Total delayed flights: ${analysis.statistics.totalFlights}`);
    console.log(`  Airlines operating: ${analysis.byAirline.size}`);
    
    // Show airline comparison
    console.log('\nAirline Performance Comparison:');
    console.log('Airline | Flights | Avg Delay | Reliability');
    console.log('--------|---------|-----------|------------');
    
    analysis.airlineComparison.forEach(airline => {
      const avgDelay = `${airline.averageDelay}min`.padEnd(9);
      const reliability = `${airline.reliability.toFixed(1)}%`.padEnd(11);
      console.log(`${airline.airline.padEnd(7)} | ${airline.flights.toString().padEnd(7)} | ${avgDelay} | ${reliability}`);
    });
    
    // Show delay distribution
    console.log('\nDelay Distribution:');
    analysis.statistics.byCategory.forEach((count, category) => {
      const bar = '█'.repeat(Math.ceil(count / 2));
      console.log(`  ${category.padEnd(8)}: ${bar} ${count}`);
    });
  } catch (error) {
    console.error('Route delay comparison error:', error);
  }
}

/**
 * Example 5: Track specific flight delay history
 */
async function trackFlightDelays() {
  const service = await initializeService();
  
  try {
    // Track AA100 delay history
    const history = await service.getFlightDelayHistory('AA100', 10, 'departures');
    
    console.log('AA100 Delay History (≥10 min):');
    console.log(`  Total delays found: ${history.statistics.totalFlights}`);
    
    if (history.statistics.totalFlights > 0) {
      console.log(`  Average delay: ${history.statistics.averageDelay} minutes`);
      console.log(`  Maximum delay: ${history.statistics.maxDelay} minutes`);
      
      // Show delay patterns
      console.log('\nDelay Patterns:');
      Object.entries(history.delayPattern).forEach(([pattern, count]) => {
        if (count > 0) {
          const pct = (count / history.statistics.totalFlights * 100).toFixed(1);
          console.log(`  ${pattern}: ${count} (${pct}%)`);
        }
      });
      
      // Show recent delays
      console.log('\nRecent Delays:');
      history.formatted.forEach(flight => {
        const depTime = flight.schedule.departure.scheduled.local?.toLocaleDateString() || 'N/A';
        const duration = DelayDataProcessor.formatDelayDuration(flight.delay.total);
        console.log(`  ${depTime}: ${duration} delay`);
        console.log(`    Departure: ${flight.delay.departure || 0}min → Arrival: ${flight.delay.arrival || 0}min`);
        console.log(`    Category: ${flight.delay.category.description}`);
      });
    }
  } catch (error) {
    console.error('Flight delay tracking error:', error);
  }
}

/**
 * Example 6: Monitor network-wide severe delays
 */
async function monitorSevereDelays() {
  const service = await initializeService();
  
  try {
    // Monitor severe delays (≥60 minutes) across the network
    const monitor = await service.getNetworkDelayMonitor(60, 'departures');
    
    console.log('Network-wide Severe Delay Monitor (≥60 min):');
    console.log(`  Total delays: ${monitor.totalDelays}`);
    console.log(`  Severe delays (≥2h): ${monitor.severeDelays}`);
    console.log(`  Affected airports: ${monitor.affectedAirports.size}`);
    console.log(`  Affected airlines: ${monitor.affectedAirlines.size}`);
    
    // Show delay statistics
    console.log('\nDelay Statistics:');
    console.log(`  Average delay: ${monitor.statistics.averageDelay} minutes`);
    console.log(`  Maximum delay: ${monitor.statistics.maxDelay} minutes`);
    console.log(`  Total delay time: ${DelayDataProcessor.formatDelayDuration(monitor.statistics.totalDelayMinutes)}`);
    
    // Show most affected airports
    console.log('\nTop 10 Most Affected Airports:');
    const topAirports = Array.from(monitor.affectedAirports.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    topAirports.forEach(([airport, count]) => {
      console.log(`  ${airport}: ${count} delayed flights`);
    });
    
    // Show most affected airlines
    console.log('\nTop 10 Most Affected Airlines:');
    const topAirlines = Array.from(monitor.affectedAirlines.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    topAirlines.forEach(([airline, count]) => {
      console.log(`  ${airline}: ${count} delayed flights`);
    });
    
    // Show cost impact
    console.log('\nEstimated Economic Impact:');
    console.log(`  Total cost: $${monitor.costEstimate.totalCost.toLocaleString()}`);
    console.log(`  Average per delay: $${monitor.costEstimate.averageCostPerDelay.toLocaleString()}`);
    
    // Calculate hourly cost rate
    if (monitor.statistics.totalDelayMinutes > 0) {
      const hourlyRate = Math.round(monitor.costEstimate.totalCost / (monitor.statistics.totalDelayMinutes / 60));
      console.log(`  Cost per hour of delays: $${hourlyRate.toLocaleString()}`);
    }
  } catch (error) {
    console.error('Network delay monitoring error:', error);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('FlightLabs Flight Delays Examples\n');
  
  const args = process.argv.slice(2);
  const example = args[0];
  
  switch (example) {
    case 'departures':
      await getDelayedDepartures();
      break;
    case 'arrivals':
      await getDelayedArrivals();
      break;
    case 'airline':
      await analyzeAirlineDelays();
      break;
    case 'route':
      await compareRouteDelays();
      break;
    case 'track':
      await trackFlightDelays();
      break;
    case 'monitor':
      await monitorSevereDelays();
      break;
    default:
      console.log('Usage: npm run dev src/examples/delay-examples.ts [example]');
      console.log('\nExamples:');
      console.log('  departures  - Analyze delayed departures from an airport');
      console.log('  arrivals    - Analyze delayed arrivals with trends');
      console.log('  airline     - Analyze airline delay performance and costs');
      console.log('  route       - Compare airline delays on a specific route');
      console.log('  track       - Track specific flight delay history');
      console.log('  monitor     - Monitor network-wide severe delays');
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