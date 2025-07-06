/**
 * FlightLabs Flight By Number Examples
 * 
 * Demonstrates usage of the flight by number endpoint
 */

import FlightLabsService, { 
  FlightByNumberProcessor,
  FlightByNumberData,
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
 * Example 1: Get flight by number with analysis
 */
async function getFlightByNumber() {
  const service = await initializeService();
  
  try {
    // Get flight AA100 schedule
    const analysis = await service.getFlightByNumberAnalysis('AA100');
    
    console.log('Flight AA100 Analysis:');
    console.log(`  Total schedules found: ${analysis.statistics.total}`);
    console.log(`  Scheduled: ${analysis.statistics.scheduled}`);
    console.log(`  Landed: ${analysis.statistics.landed}`);
    console.log(`  Cancelled: ${analysis.statistics.cancelled}`);
    console.log(`  Unique routes: ${analysis.statistics.uniqueRoutes}`);
    console.log(`  Aircraft types: ${analysis.statistics.uniqueAircraft}`);
    
    if (analysis.statistics.averageFlightTime) {
      const duration = FlightByNumberProcessor.formatDuration(analysis.statistics.averageFlightTime);
      console.log(`  Average flight time: ${duration}`);
    }
    
    // Show routes
    console.log('\nRoutes operated:');
    analysis.routes.forEach(route => {
      console.log(`  ${route.from} → ${route.to}: ${route.count} flight(s)`);
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
    
    // Show sample flights
    console.log('\nRecent flights:');
    analysis.sorted.slice(0, 3).forEach(flight => {
      console.log(`  ${flight.DATE}: ${flight.FROM} → ${flight.TO} (${flight.STATUS})`);
    });
  } catch (error) {
    console.error('Flight analysis error:', error);
  }
}

/**
 * Example 2: Get flight schedule for specific date
 */
async function getFlightOnDate() {
  const service = await initializeService();
  
  try {
    // Get UA328 flights on a specific date
    const date = '2025-01-15';
    const result = await service.getFlightByNumberOnDate('UA328', date);
    
    console.log(`UA328 Flights on ${date}:`);
    console.log(`  Total flights: ${result.flights.length}`);
    console.log(`  Scheduled: ${result.scheduled.length}`);
    console.log(`  Landed: ${result.landed.length}`);
    console.log(`  Cancelled: ${result.cancelled.length}`);
    
    // Show routes
    console.log('\nRoutes:');
    result.byRoute.forEach((count, route) => {
      console.log(`  ${route}: ${count} flight(s)`);
    });
    
    // Show flight details
    console.log('\nFlight details:');
    result.formatted.forEach(flight => {
      const depTime = flight.schedule.departure.scheduled;
      const arrTime = flight.schedule.arrival.scheduled;
      console.log(`\n  ${flight.from.airport} (${flight.from.code}) → ${flight.to.airport} (${flight.to.code})`);
      if (depTime && arrTime) {
        console.log(`  Departure: ${depTime.hours}:${depTime.minutes.toString().padStart(2, '0')}`);
        console.log(`  Arrival: ${arrTime.hours}:${arrTime.minutes.toString().padStart(2, '0')}`);
      }
      console.log(`  Aircraft: ${flight.aircraft}`);
      console.log(`  Status: ${flight.status}`);
      if (flight.schedule.departure.hasActual && flight.schedule.departure.actual) {
        const actual = flight.schedule.departure.actual;
        console.log(`  Actual departure: ${actual.hours}:${actual.minutes.toString().padStart(2, '0')}`);
      }
    });
  } catch (error) {
    console.error('Date-specific flight error:', error);
  }
}

/**
 * Example 3: Track flight number over date range
 */
async function trackFlightDateRange() {
  const service = await initializeService();
  
  try {
    // Track DL100 over a week
    const startDate = '2025-01-10';
    const endDate = '2025-01-16';
    
    const tracking = await service.trackFlightNumberDateRange('DL100', startDate, endDate);
    
    console.log(`DL100 Tracking (${startDate} to ${endDate}):`);
    console.log(`  Total flights: ${tracking.totalFlights}`);
    console.log(`  Date range: ${tracking.dateRange.length} days`);
    
    // Show statistics
    console.log('\nFlight Statistics:');
    console.log(`  Scheduled: ${tracking.statistics.scheduled}`);
    console.log(`  Landed: ${tracking.statistics.landed}`);
    console.log(`  Cancelled: ${tracking.statistics.cancelled}`);
    
    if (tracking.statistics.averageFlightTime) {
      const duration = FlightByNumberProcessor.formatDuration(tracking.statistics.averageFlightTime);
      console.log(`  Average flight time: ${duration}`);
    }
    
    // Show routes
    console.log('\nRoutes operated:');
    tracking.statistics.routes.forEach(route => {
      console.log(`  ${route.from} → ${route.to}: ${route.count} flight(s)`);
    });
    
    // Show aircraft usage
    console.log('\nAircraft types used:');
    tracking.statistics.aircraftTypes.forEach((count, aircraft) => {
      console.log(`  ${aircraft}: ${count} flight(s)`);
    });
    
    // Show weekday distribution
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    console.log('\nWeekday distribution:');
    tracking.weekdayDistribution.forEach((count, weekday) => {
      if (count > 0) {
        console.log(`  ${weekdays[weekday]}: ${count} flight(s)`);
      }
    });
    
    // Show daily summary
    console.log('\nDaily summary:');
    tracking.flightsByDate.forEach((flights, date) => {
      const scheduled = flights.filter(f => f.STATUS.toLowerCase() === 'scheduled').length;
      const landed = flights.filter(f => f.STATUS.toLowerCase() === 'landed').length;
      const cancelled = flights.filter(f => f.STATUS.toLowerCase() === 'cancelled').length;
      console.log(`  ${date}: ${flights.length} flights (${scheduled} scheduled, ${landed} landed, ${cancelled} cancelled)`);
    });
  } catch (error) {
    console.error('Date range tracking error:', error);
  }
}

/**
 * Example 4: Compare flight performance between dates
 */
async function compareFlightPerformance() {
  const service = await initializeService();
  
  try {
    // Compare BA100 performance between two dates
    const date1 = '2025-01-10';
    const date2 = '2025-01-17';
    
    const comparison = await service.compareFlightNumberPerformance('BA100', date1, date2);
    
    console.log(`BA100 Performance Comparison:`);
    console.log(`\n${date1}:`);
    console.log(`  Total flights: ${comparison.date1.statistics.total}`);
    console.log(`  On-time: ${comparison.date1.onTimeCount}`);
    console.log(`  Cancelled: ${comparison.date1.statistics.cancelled}`);
    
    console.log(`\n${date2}:`);
    console.log(`  Total flights: ${comparison.date2.statistics.total}`);
    console.log(`  On-time: ${comparison.date2.onTimeCount}`);
    console.log(`  Cancelled: ${comparison.date2.statistics.cancelled}`);
    
    console.log('\nChanges:');
    const totalDiff = comparison.comparison.totalFlightsDiff;
    console.log(`  Total flights: ${totalDiff > 0 ? '+' : ''}${totalDiff}`);
    const cancelDiff = comparison.comparison.cancelledDiff;
    console.log(`  Cancellations: ${cancelDiff > 0 ? '+' : ''}${cancelDiff}`);
    
    console.log('\nRoute changes:');
    if (comparison.comparison.commonRoutes.length > 0) {
      console.log(`  Common routes: ${comparison.comparison.commonRoutes.join(', ')}`);
    }
    if (comparison.comparison.uniqueRoutesDate1.length > 0) {
      console.log(`  Routes only on ${date1}: ${comparison.comparison.uniqueRoutesDate1.join(', ')}`);
    }
    if (comparison.comparison.uniqueRoutesDate2.length > 0) {
      console.log(`  Routes only on ${date2}: ${comparison.comparison.uniqueRoutesDate2.join(', ')}`);
    }
    
    console.log('\nAircraft changes:');
    comparison.comparison.aircraftChanges.forEach((counts, aircraft) => {
      if (counts.date1 !== counts.date2) {
        console.log(`  ${aircraft}: ${counts.date1} → ${counts.date2} flights`);
      }
    });
  } catch (error) {
    console.error('Performance comparison error:', error);
  }
}

/**
 * Example 5: Analyze weekly pattern
 */
async function analyzeWeeklyPattern() {
  const service = await initializeService();
  
  try {
    // Analyze weekly pattern for LH400
    const pattern = await service.getFlightNumberWeeklyPattern('LH400');
    
    console.log('LH400 Weekly Pattern Analysis:');
    console.log(`  Total flights analyzed: ${pattern.flights.length}`);
    console.log(`  Most frequent day: ${pattern.mostFrequentDay.day} (${pattern.mostFrequentDay.count} flights)`);
    console.log(`  Least frequent day: ${pattern.leastFrequentDay.day} (${pattern.leastFrequentDay.count} flights)`);
    
    console.log('\nWeekly breakdown:');
    pattern.weekdayPattern.forEach((data, weekday) => {
      if (data.count > 0) {
        console.log(`\n${data.day}:`);
        console.log(`  Flights: ${data.count}`);
        console.log(`  Scheduled: ${data.scheduled}, Landed: ${data.landed}, Cancelled: ${data.cancelled}`);
        console.log(`  Routes: ${data.routes.join(', ')}`);
      }
    });
    
    // Calculate reliability by day
    console.log('\nReliability by weekday:');
    pattern.weekdayPattern.forEach((data, weekday) => {
      if (data.count > 0) {
        const reliability = ((data.count - data.cancelled) / data.count * 100).toFixed(1);
        console.log(`  ${data.day}: ${reliability}%`);
      }
    });
  } catch (error) {
    console.error('Weekly pattern analysis error:', error);
  }
}

/**
 * Example 6: Search multiple flight numbers
 */
async function searchMultipleFlights() {
  const service = await initializeService();
  
  try {
    // Search for multiple flight numbers
    const flightNumbers = ['AA100', 'UA328', 'DL100', 'BA100'];
    const date = '2025-01-15';
    
    const results = await service.searchMultipleFlightNumbers(flightNumbers, date);
    
    console.log(`Multiple Flight Search Results (${date}):\n`);
    
    results.forEach((result, flightNumber) => {
      console.log(`${flightNumber}:`);
      
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      } else {
        console.log(`  Flights found: ${result.statistics.total}`);
        console.log(`  Status: ${result.statistics.scheduled} scheduled, ${result.statistics.landed} landed, ${result.statistics.cancelled} cancelled`);
        
        if (result.routes.length > 0) {
          console.log(`  Routes:`);
          result.routes.forEach(route => {
            console.log(`    ${route.from} → ${route.to}`);
          });
        }
        
        if (result.statistics.averageFlightTime) {
          const duration = FlightByNumberProcessor.formatDuration(result.statistics.averageFlightTime);
          console.log(`  Average flight time: ${duration}`);
        }
      }
      console.log();
    });
    
    // Summary statistics
    let totalFlights = 0;
    let totalCancelled = 0;
    results.forEach(result => {
      if (!result.error) {
        totalFlights += result.statistics.total;
        totalCancelled += result.statistics.cancelled;
      }
    });
    
    console.log('Summary:');
    console.log(`  Total flights across all numbers: ${totalFlights}`);
    console.log(`  Total cancellations: ${totalCancelled}`);
    if (totalFlights > 0) {
      const cancellationRate = (totalCancelled / totalFlights * 100).toFixed(1);
      console.log(`  Overall cancellation rate: ${cancellationRate}%`);
    }
  } catch (error) {
    console.error('Multiple flight search error:', error);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('FlightLabs Flight By Number Examples\n');
  
  const args = process.argv.slice(2);
  const example = args[0];
  
  switch (example) {
    case 'basic':
      await getFlightByNumber();
      break;
    case 'date':
      await getFlightOnDate();
      break;
    case 'range':
      await trackFlightDateRange();
      break;
    case 'compare':
      await compareFlightPerformance();
      break;
    case 'weekly':
      await analyzeWeeklyPattern();
      break;
    case 'multiple':
      await searchMultipleFlights();
      break;
    default:
      console.log('Usage: npm run dev src/examples/flight-by-number-examples.ts [example]');
      console.log('\nExamples:');
      console.log('  basic    - Get flight by number with analysis');
      console.log('  date     - Get flight schedule for specific date');
      console.log('  range    - Track flight number over date range');
      console.log('  compare  - Compare flight performance between dates');
      console.log('  weekly   - Analyze weekly pattern');
      console.log('  multiple - Search multiple flight numbers');
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