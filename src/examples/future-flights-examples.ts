/**
 * FlightLabs Future Flights Endpoint Examples
 * 
 * Demonstrates usage of the future flight predictions endpoint
 */

import FlightLabsService, { 
  FutureFlightDataProcessor,
  FutureFlightData,
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
 * Example 1: Get future departures with analysis
 */
async function getFutureDepartures() {
  const service = await initializeService();
  
  try {
    // Get future departures from BER (Berlin) 
    const futureDate = '2025-07-14';
    const analysis = await service.getFutureDeparturesAnalysis('BER', futureDate);
    
    console.log(`BER Future Departures Analysis (${futureDate}):`);
    console.log(`  Total flights: ${analysis.statistics.total}`);
    console.log(`  Carriers: ${analysis.statistics.carriers}`);
    console.log(`  Destinations: ${analysis.statistics.destinations}`);
    console.log(`  Codeshare flights: ${analysis.statistics.codeshare}`);
    
    // Show time distribution
    console.log('\nTime Distribution:');
    console.log(`  Morning (00:00-11:59): ${analysis.timeSlots.morning.length} flights`);
    console.log(`  Afternoon (12:00-17:59): ${analysis.timeSlots.afternoon.length} flights`);
    console.log(`  Evening (18:00-23:59): ${analysis.timeSlots.evening.length} flights`);
    
    // Show carrier statistics
    console.log('\nTop Carriers:');
    const topCarriers = Array.from(analysis.statistics.carrierStats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
    
    topCarriers.forEach(([code, stats]) => {
      console.log(`  ${stats.carrier} (${code}): ${stats.count} flights (${stats.percentage.toFixed(1)}%)`);
      console.log(`    Destinations: ${Array.from(stats.destinations).join(', ')}`);
    });
    
    // Show popular routes
    console.log('\nPopular Routes:');
    analysis.statistics.popularRoutes.slice(0, 5).forEach(route => {
      console.log(`  ${route.destination}: ${route.count} flights`);
      console.log(`    Carriers: ${Array.from(route.carriers).join(', ')}`);
    });
    
    // Show hourly distribution
    console.log('\nHourly Distribution:');
    const hourlyDist = Array.from(analysis.hourlyDistribution.entries()).sort((a, b) => a[0] - b[0]);
    hourlyDist.forEach(([hour, count]) => {
      if (count > 0) {
        const bar = '█'.repeat(Math.ceil(count / 2));
        console.log(`  ${hour.toString().padStart(2, '0')}:00  ${bar} ${count}`);
      }
    });
  } catch (error) {
    console.error('Future departures error:', error);
  }
}

/**
 * Example 2: Get future arrivals
 */
async function getFutureArrivals() {
  const service = await initializeService();
  
  try {
    // Get future arrivals at JFK
    const futureDate = '2025-08-01';
    const analysis = await service.getFutureArrivalsAnalysis('JFK', futureDate);
    
    console.log(`JFK Future Arrivals Analysis (${futureDate}):`);
    console.log(`  Total flights: ${analysis.statistics.total}`);
    console.log(`  Carriers: ${analysis.statistics.carriers}`);
    console.log(`  Origin cities: ${analysis.statistics.origins}`);
    
    // Show flights by city
    console.log('\nTop Origin Cities:');
    const topCities = Array.from(analysis.byCity.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);
    
    topCities.forEach(([city, flights]) => {
      console.log(`  ${city}: ${flights.length} flights`);
    });
    
    // Show morning arrivals
    console.log('\nMorning Arrivals (00:00-11:59):');
    analysis.timeSlots.morning.slice(0, 5).forEach(flight => {
      const formatted = FutureFlightDataProcessor.formatFutureFlight(flight);
      console.log(`  ${formatted.carrier.fullFlightNumber} from ${formatted.route.airport.city}`);
      console.log(`    Arrival: ${formatted.schedule.arrival.time12}`);
      if (formatted.operator && formatted.operator !== '') {
        console.log(`    ${formatted.operator}`);
      }
    });
  } catch (error) {
    console.error('Future arrivals error:', error);
  }
}

/**
 * Example 3: Get future flights for date range
 */
async function getFutureFlightsRange() {
  const service = await initializeService();
  
  try {
    // Get week of departures from LAX
    const startDate = '2025-06-01';
    const endDate = '2025-06-07';
    
    const result = await service.getFutureFlightsRange('LAX', 'departure', startDate, endDate);
    
    console.log(`LAX Future Departures (${startDate} to ${endDate}):`);
    console.log(`  Total flights: ${result.grandTotal}`);
    console.log(`  Date range: ${result.dateRange.length} days`);
    
    console.log('\nDaily Flight Counts:');
    result.dateRange.forEach(date => {
      const count = result.totals.get(date) || 0;
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
      const bar = '▓'.repeat(Math.ceil(count / 10));
      console.log(`  ${date} (${dayName}): ${bar} ${count} flights`);
    });
    
    // Analyze day with most flights
    let maxDate = '';
    let maxCount = 0;
    result.totals.forEach((count, date) => {
      if (count > maxCount) {
        maxCount = count;
        maxDate = date;
      }
    });
    
    if (maxDate) {
      console.log(`\nBusiest Day: ${maxDate} with ${maxCount} flights`);
      const busyDayFlights = result.flightsByDate.get(maxDate) || [];
      const carriers = FutureFlightDataProcessor.groupByCarrier(busyDayFlights);
      console.log(`  ${carriers.size} different carriers operating`);
    }
  } catch (error) {
    console.error('Date range error:', error);
  }
}

/**
 * Example 4: Compare future schedules
 */
async function compareFutureSchedules() {
  const service = await initializeService();
  
  try {
    // Compare weekday vs weekend at DFW
    const weekday = '2025-07-15'; // Tuesday
    const weekend = '2025-07-19'; // Saturday
    
    const comparison = await service.compareFutureSchedules('DFW', 'departure', weekday, weekend);
    
    console.log('DFW Schedule Comparison:');
    console.log(`\nWeekday (${weekday}):`);
    console.log(`  Total flights: ${comparison.date1.flights.length}`);
    console.log(`  Carriers: ${comparison.date1.carriers.size}`);
    console.log(`  Destinations: ${comparison.date1.destinations.size}`);
    
    console.log(`\nWeekend (${weekend}):`);
    console.log(`  Total flights: ${comparison.date2.flights.length}`);
    console.log(`  Carriers: ${comparison.date2.carriers.size}`);
    console.log(`  Destinations: ${comparison.date2.destinations.size}`);
    
    console.log('\nComparison:');
    console.log(`  Flight difference: ${comparison.comparison.flightDifference > 0 ? '+' : ''}${comparison.comparison.flightDifference}`);
    console.log(`  Common carriers: ${comparison.comparison.commonCarriers.size}`);
    console.log(`  Common destinations: ${comparison.comparison.commonDestinations.size}`);
    
    if (comparison.comparison.uniqueCarriersDate1.size > 0) {
      console.log(`\nCarriers only on weekday: ${Array.from(comparison.comparison.uniqueCarriersDate1).join(', ')}`);
    }
    
    if (comparison.comparison.uniqueCarriersDate2.size > 0) {
      console.log(`Carriers only on weekend: ${Array.from(comparison.comparison.uniqueCarriersDate2).join(', ')}`);
    }
    
    if (comparison.comparison.uniqueDestinationsDate1.size > 0) {
      console.log(`\nDestinations only on weekday: ${Array.from(comparison.comparison.uniqueDestinationsDate1).join(', ')}`);
    }
    
    if (comparison.comparison.uniqueDestinationsDate2.size > 0) {
      console.log(`Destinations only on weekend: ${Array.from(comparison.comparison.uniqueDestinationsDate2).join(', ')}`);
    }
  } catch (error) {
    console.error('Schedule comparison error:', error);
  }
}

/**
 * Example 5: Analyze carrier operations
 */
async function analyzeCarrierOperations() {
  const service = await initializeService();
  
  try {
    // Analyze carrier operations at ORD
    const date = '2025-07-20';
    const flights = await service.getFutureFlights({
      iataCode: 'ORD',
      type: 'departure',
      date
    });
    
    console.log(`ORD Carrier Operations Analysis (${date}):`);
    
    // Get carrier statistics
    const carrierStats = FutureFlightDataProcessor.getCarrierStatistics(flights);
    const sorted = Array.from(carrierStats.entries())
      .sort((a, b) => b[1].count - a[1].count);
    
    console.log(`Total carriers: ${carrierStats.size}`);
    console.log(`Total flights: ${flights.length}\n`);
    
    sorted.forEach(([code, stats]) => {
      console.log(`${stats.carrier} (${code}):`);
      console.log(`  Flights: ${stats.count} (${stats.percentage.toFixed(1)}%)`);
      console.log(`  Destinations: ${stats.destinations.size}`);
      console.log(`  Cities: ${Array.from(stats.destinations).sort().join(', ')}`);
      
      // Show flight times for this carrier
      const carrierFlights = flights.filter(f => f.carrier.fs === code);
      const sorted = FutureFlightDataProcessor.sortByDepartureTime(carrierFlights);
      console.log(`  First departure: ${sorted[0]?.departureTime.time24 || 'N/A'}`);
      console.log(`  Last departure: ${sorted[sorted.length - 1]?.departureTime.time24 || 'N/A'}`);
      console.log('');
    });
  } catch (error) {
    console.error('Carrier analysis error:', error);
  }
}

/**
 * Example 6: Format and display future flights
 */
async function displayFormattedFlights() {
  const service = await initializeService();
  
  try {
    // Get future flights from MIA
    const flights = await service.getFutureFlights({
      iataCode: 'MIA',
      type: 'departure',
      date: '2025-09-15'
    });
    
    console.log('MIA Future Departures (2025-09-15):');
    console.log('Time     Flight      Destination        Duration  Operator');
    console.log('────     ──────      ───────────        ────────  ────────');
    
    // Sort and display first 10 flights
    const sorted = FutureFlightDataProcessor.sortByDepartureTime(flights);
    sorted.slice(0, 10).forEach(flight => {
      const formatted = FutureFlightDataProcessor.formatFutureFlight(flight);
      
      const time = formatted.schedule.departure.time24.padEnd(8);
      const flightNum = formatted.carrier.fullFlightNumber.padEnd(11);
      const dest = `${formatted.route.airport.city} (${formatted.route.airport.code})`.padEnd(18);
      const duration = formatted.schedule.duration 
        ? `${Math.floor(formatted.schedule.duration / 60)}h ${formatted.schedule.duration % 60}m`.padEnd(9)
        : 'N/A'.padEnd(9);
      
      console.log(`${time} ${flightNum} ${dest} ${duration}`);
      
      if (formatted.operator && formatted.operator !== '') {
        console.log(`         ${formatted.operator}`);
      }
    });
  } catch (error) {
    console.error('Display error:', error);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('FlightLabs Future Flights Examples\n');
  
  const args = process.argv.slice(2);
  const example = args[0];
  
  switch (example) {
    case 'departures':
      await getFutureDepartures();
      break;
    case 'arrivals':
      await getFutureArrivals();
      break;
    case 'range':
      await getFutureFlightsRange();
      break;
    case 'compare':
      await compareFutureSchedules();
      break;
    case 'carriers':
      await analyzeCarrierOperations();
      break;
    case 'display':
      await displayFormattedFlights();
      break;
    default:
      console.log('Usage: npm run dev src/examples/future-flights-examples.ts [example]');
      console.log('\nExamples:');
      console.log('  departures  - Analyze future departures');
      console.log('  arrivals    - Analyze future arrivals');
      console.log('  range       - Get flights for date range');
      console.log('  compare     - Compare schedules between dates');
      console.log('  carriers    - Analyze carrier operations');
      console.log('  display     - Display formatted flight list');
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