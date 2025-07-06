/**
 * FlightLabs Routes API Examples
 * Demonstrates retrieving and analyzing airline route information
 */

import { FlightLabsService } from '../utils/flightlabs';
import { flightLabsConfig } from '../config/flightlabs.config';

// Initialize service
const service = new FlightLabsService({
  ...flightLabsConfig,
  cacheEnabled: true,
});

/**
 * Example 1: Get routes between two airports
 */
async function getRoutesBetweenAirports(depIata: string, arrIata: string) {
  console.log(`\n=== Routes from ${depIata} to ${arrIata} ===`);
  
  try {
    const result = await service.getRoutesBetweenAirportsAnalysis(depIata, arrIata);
    
    console.log(`\nTotal Routes: ${result.statistics.totalRoutes}`);
    console.log(`Airlines Operating: ${result.statistics.uniqueAirlines}`);
    console.log(`Average Duration: ${result.statistics.averageDuration} minutes`);
    
    console.log('\nCompetition Analysis:');
    console.log(`  Competition Level: ${result.competition.competitionLevel}`);
    console.log(`  Airlines Competing: ${result.competition.airlines.length}`);
    
    result.competition.airlines.forEach(airline => {
      console.log(`\n  ${airline.airline}:`);
      console.log(`    Market Share: ${airline.marketShare}%`);
      console.log(`    Flights: ${airline.flights.length}`);
      console.log(`    Avg Duration: ${airline.avgDuration} minutes`);
      console.log(`    Days: ${airline.daysOfOperation.join(', ')}`);
      console.log(`    Has Codeshare: ${airline.hasCodeshare ? 'Yes' : 'No'}`);
    });
    
    console.log('\nDirect Routes:');
    result.directOnly.slice(0, 5).forEach(route => {
      console.log(`  ${route.flight_iata} (${route.airline_iata}) - ${route.dep_time} to ${route.arr_time}`);
      console.log(`    Days: ${route.days.join(', ')}`);
    });
    
    if (result.codeshareOnly.length > 0) {
      console.log('\nCodeshare Routes:');
      result.codeshareOnly.slice(0, 3).forEach(route => {
        console.log(`  ${route.flight_iata} → ${route.cs_airline_iata} ${route.cs_flight_iata}`);
      });
    }
    
  } catch (error) {
    console.error('Error fetching routes:', error);
  }
}

/**
 * Example 2: Get all routes from an airport
 */
async function getRoutesFromAirport(depIata: string) {
  console.log(`\n=== Routes from ${depIata} ===`);
  
  try {
    const result = await service.getRoutesFromAirportAnalysis(depIata);
    
    console.log(`\nTotal Routes: ${result.statistics.totalRoutes}`);
    console.log(`Destinations: ${result.destinations.length}`);
    console.log(`Airlines: ${result.statistics.uniqueAirlines}`);
    
    console.log('\nRoute Categories:');
    console.log(`  Short-haul (< 3h): ${result.shortHaul.length}`);
    console.log(`  Medium-haul (3-6h): ${result.mediumHaul.length}`);
    console.log(`  Long-haul (> 6h): ${result.longHaul.length}`);
    
    console.log('\nTop 10 Destinations by Frequency:');
    result.destinations.slice(0, 10).forEach((dest, idx) => {
      console.log(`  ${idx + 1}. ${dest.airport} - ${dest.frequency} operations`);
      console.log(`     Airlines: ${dest.airlines.join(', ')}`);
    });
    
    console.log('\nUnique Route Pairs:');
    result.uniqueRoutePairs.slice(0, 5).forEach(pair => {
      console.log(`  ${pair.route}: ${pair.flights} flights`);
      console.log(`    Airlines: ${pair.airlines.join(', ')}`);
      console.log(`    Duration: ${pair.minDuration}-${pair.maxDuration} min (avg: ${pair.avgDuration})`);
    });
    
  } catch (error) {
    console.error('Error fetching routes:', error);
  }
}

/**
 * Example 3: Get all routes to an airport
 */
async function getRoutesToAirport(arrIata: string) {
  console.log(`\n=== Routes to ${arrIata} ===`);
  
  try {
    const result = await service.getRoutesToAirportAnalysis(arrIata);
    
    console.log(`\nTotal Routes: ${result.statistics.totalRoutes}`);
    console.log(`Origin Airports: ${result.origins.length}`);
    console.log(`Airlines: ${result.statistics.uniqueAirlines}`);
    
    console.log('\nTop 10 Origins by Frequency:');
    result.origins.slice(0, 10).forEach((origin, idx) => {
      console.log(`  ${idx + 1}. ${origin.airport} - ${origin.frequency} operations`);
      console.log(`     Airlines: ${origin.airlines.join(', ')}`);
    });
    
    // Terminal analysis
    if (result.terminalAnalysis.arrival.size > 0) {
      console.log('\nArrival Terminal Usage:');
      result.terminalAnalysis.arrival.forEach((data, key) => {
        console.log(`  ${data.terminal}:`);
        console.log(`    Routes: ${data.routes}`);
        console.log(`    Airlines: ${Array.from(data.airlines).join(', ')}`);
      });
    }
    
  } catch (error) {
    console.error('Error fetching routes:', error);
  }
}

/**
 * Example 4: Analyze airline route network
 */
async function analyzeAirlineRoutes(airlineIata: string) {
  console.log(`\n=== Route Network Analysis for ${airlineIata} ===`);
  
  try {
    const result = await service.getRoutesByAirlineAnalysis(airlineIata);
    
    console.log(`\nTotal Routes: ${result.statistics.totalRoutes}`);
    console.log(`Unique Airports: ${result.statistics.uniqueAirports}`);
    console.log(`Average Duration: ${result.statistics.averageDuration} minutes`);
    console.log(`Routes with Terminal Info: ${result.statistics.routesWithTerminals}`);
    console.log(`Routes with Aircraft Info: ${result.statistics.routesWithAircraft}`);
    
    console.log('\nHub Analysis:');
    const hubs = result.hubAnalysis.filter(h => h.type === 'hub');
    const focusCities = result.hubAnalysis.filter(h => h.type === 'focus');
    
    console.log(`  Major Hubs (10+ connections): ${hubs.length}`);
    hubs.slice(0, 5).forEach(hub => {
      console.log(`    ${hub.airport}: ${hub.connections} connections`);
    });
    
    console.log(`\n  Focus Cities (5-9 connections): ${focusCities.length}`);
    focusCities.slice(0, 5).forEach(city => {
      console.log(`    ${city.airport}: ${city.connections} connections`);
    });
    
    console.log('\nRoute Frequency by Day:');
    Array.from(result.statistics.byDayOfWeek.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([day, count]) => {
        console.log(`  ${day}: ${count} routes`);
      });
    
    console.log('\nTop 10 Route Pairs:');
    result.routePairs.slice(0, 10).forEach((pair, idx) => {
      console.log(`  ${idx + 1}. ${pair.route} - ${pair.flights} flights`);
    });
    
  } catch (error) {
    console.error('Error analyzing routes:', error);
  }
}

/**
 * Example 5: Get routes for a specific flight number
 */
async function getFlightNumberRoutes(flightNumber: string, airlineIata?: string) {
  console.log(`\n=== Routes for Flight ${flightNumber} ===`);
  
  try {
    const result = await service.getRoutesByFlightNumber(flightNumber, airlineIata);
    
    if (result.routes.length === 0) {
      console.log('No routes found for this flight number');
      return;
    }
    
    console.log(`\nTotal Route Variants: ${result.variants.length}`);
    console.log(`Operating Days: ${result.operatingDays.join(', ')}`);
    
    console.log('\nRoute Variants:');
    result.variants.forEach((variant, idx) => {
      console.log(`\n  ${idx + 1}. ${variant.route}`);
      console.log(`     Duration: ${variant.duration}`);
      console.log(`     Days: ${variant.days.join(', ')}`);
      if (variant.aircraft) {
        console.log(`     Aircraft: ${variant.aircraft}`);
      }
      if (variant.terminals.departure.length > 0) {
        console.log(`     Departure Terminal: ${variant.terminals.departure.join(', ')}`);
      }
      if (variant.terminals.arrival.length > 0) {
        console.log(`     Arrival Terminal: ${variant.terminals.arrival.join(', ')}`);
      }
    });
    
    console.log('\nSchedule by Day:');
    result.byDayOfWeek.forEach((routes, day) => {
      console.log(`  ${day}: ${routes.length} flight(s)`);
      routes.forEach(route => {
        console.log(`    ${route.dep_iata} ${route.dep_time} → ${route.arr_iata} ${route.arr_time}`);
      });
    });
    
  } catch (error) {
    console.error('Error fetching flight routes:', error);
  }
}

/**
 * Example 6: Find connecting routes
 */
async function findConnections(origin: string, destination: string) {
  console.log(`\n=== Finding Routes from ${origin} to ${destination} ===`);
  
  try {
    const result = await service.findConnectingRoutes(origin, destination, {
      maxLayoverMinutes: 240, // 4 hours max layover
    });
    
    console.log(`\nDirect Routes Available: ${result.analysis.directAvailable ? 'Yes' : 'No'}`);
    
    if (result.directRoutes.length > 0) {
      console.log(`Direct Flights: ${result.directRoutes.length}`);
      result.directRoutes.slice(0, 3).forEach(route => {
        console.log(`  ${route.airline_iata} ${route.flight_iata} - ${route.dep_time} to ${route.arr_time}`);
        console.log(`    Duration: ${route.duration} min, Days: ${route.days.join(', ')}`);
      });
    }
    
    if (result.connections.length > 0) {
      console.log(`\nConnection Options: ${result.connections.length}`);
      console.log('\nTop 5 Connections by Duration:');
      
      result.connections.slice(0, 5).forEach((conn, idx) => {
        console.log(`\n  ${idx + 1}. Via ${conn.connection} (${conn.totalDuration} min total)`);
        console.log(`     Outbound: ${conn.outbound.airline_iata} ${conn.outbound.flight_iata}`);
        console.log(`     ${conn.outbound.dep_iata} ${conn.outbound.dep_time} → ${conn.outbound.arr_iata} ${conn.outbound.arr_time}`);
        console.log(`     Layover: ${conn.layoverTime} minutes`);
        console.log(`     Inbound: ${conn.inbound.airline_iata} ${conn.inbound.flight_iata}`);
        console.log(`     ${conn.inbound.dep_iata} ${conn.inbound.dep_time} → ${conn.inbound.arr_iata} ${conn.inbound.arr_time}`);
        console.log(`     Operating Days: ${conn.operatingDays.join(', ')}`);
      });
      
      console.log('\nConnection Points Summary:');
      result.analysis.connectionPoints.slice(0, 5).forEach(point => {
        console.log(`  ${point.airport}: ${point.options} options via ${point.airlines.join(', ')}`);
      });
    }
    
  } catch (error) {
    console.error('Error finding connections:', error);
  }
}

/**
 * Example 7: Weekly route schedule
 */
async function getWeeklySchedule(depIata: string, arrIata: string) {
  console.log(`\n=== Weekly Schedule ${depIata} to ${arrIata} ===`);
  
  try {
    const result = await service.getWeeklyRouteSchedule(depIata, arrIata);
    
    console.log(`\nTotal Weekly Flights: ${result.statistics.totalWeeklyFlights}`);
    console.log(`Average per Day: ${result.statistics.averageFlightsPerDay}`);
    console.log(`Airlines Operating: ${result.statistics.airlines.join(', ')}`);
    
    console.log('\nWeekly Schedule:');
    result.weekSchedule.forEach((flights, day) => {
      console.log(`\n${day} (${flights.length} flights):`);
      flights.forEach(flight => {
        console.log(`  ${flight.departure} - ${flight.airline} ${flight.flight}`);
        console.log(`    Arr: ${flight.arrival} (${flight.duration})`);
        if (flight.aircraft) {
          console.log(`    Aircraft: ${flight.aircraft}`);
        }
      });
    });
    
    console.log('\nFlights per Day Distribution:');
    result.statistics.flightsPerDay.forEach((count, day) => {
      const bar = '█'.repeat(count);
      console.log(`  ${day.padEnd(9)}: ${bar} ${count}`);
    });
    
  } catch (error) {
    console.error('Error fetching schedule:', error);
  }
}

/**
 * Example 8: Search routes with multiple criteria
 */
async function searchRoutesAdvanced() {
  console.log('\n=== Advanced Route Search ===');
  
  try {
    const result = await service.searchRoutesComprehensive({
      departure: { iata: 'JFK' },
      operatingDays: ['Monday', 'Friday'],
      maxDuration: 180, // Max 3 hours
      directOnly: true,
    });
    
    console.log(`\nMatching Routes: ${result.routes.length}`);
    console.log(`Airlines: ${result.statistics.uniqueAirlines}`);
    console.log(`Destinations: ${result.statistics.uniqueAirports - 1}`); // Minus departure airport
    
    console.log('\nDuration Distribution:');
    result.grouped.byDuration.forEach((routes, category) => {
      console.log(`  ${category}: ${routes.length} routes`);
    });
    
    console.log('\nSample Routes:');
    result.routes.slice(0, 5).forEach(route => {
      console.log(`  ${route.airline_iata} ${route.flight_iata}: ${route.dep_iata} → ${route.arr_iata}`);
      console.log(`    Time: ${route.dep_time} - ${route.arr_time} (${route.duration} min)`);
      console.log(`    Days: ${route.days.join(', ')}`);
    });
    
  } catch (error) {
    console.error('Error searching routes:', error);
  }
}

/**
 * Example 9: Analyze airline network
 */
async function analyzeAirlineNetwork(airlineIata: string) {
  console.log(`\n=== Network Analysis for ${airlineIata} ===`);
  
  try {
    const result = await service.analyzeAirlineNetwork(airlineIata);
    
    console.log(`\nNetwork Statistics:`);
    console.log(`  Total Routes: ${result.totalRoutes}`);
    console.log(`  Unique Airports: ${result.uniqueAirports}`);
    console.log(`  Major Hubs: ${result.hubs.length}`);
    
    console.log('\nTop 5 Hubs:');
    result.hubs.slice(0, 5).forEach((hub, idx) => {
      const connections = result.connectivity.get(hub) || 0;
      console.log(`  ${idx + 1}. ${hub}: ${connections} connections`);
    });
    
    console.log('\nAirport Connectivity (Top 10):');
    const sortedConnectivity = Array.from(result.connectivity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sortedConnectivity.forEach(([airport, connections]) => {
      console.log(`  ${airport}: ${connections} destinations`);
    });
    
  } catch (error) {
    console.error('Error analyzing network:', error);
  }
}

/**
 * Example 10: Export routes to CSV
 */
async function exportRoutesToCSV(airlineIata: string) {
  console.log(`\n=== Exporting Routes for ${airlineIata} ===`);
  
  try {
    const result = await service.getRoutesByAirlineAnalysis(airlineIata);
    
    // Save CSV to file (in a real app)
    console.log('\nCSV Preview (first 5 lines):');
    const csvLines = result.csv.split('\n');
    csvLines.slice(0, 6).forEach(line => {
      console.log(line);
    });
    
    console.log(`\n... ${csvLines.length - 6} more lines`);
    console.log(`\nTotal routes exported: ${result.routes.length}`);
    
    // In a real application, you would save this to a file:
    // fs.writeFileSync(`${airlineIata}_routes.csv`, result.csv);
    
  } catch (error) {
    console.error('Error exporting routes:', error);
  }
}

/**
 * Main function to run examples
 */
async function main() {
  console.log('FlightLabs Routes API Examples\n');
  
  // Example 1: Routes between airports
  await getRoutesBetweenAirports('SIN', 'LHR');
  await getRoutesBetweenAirports('JFK', 'LAX');
  
  // Example 2: Routes from airport
  await getRoutesFromAirport('DXB');
  await getRoutesFromAirport('ATL');
  
  // Example 3: Routes to airport
  await getRoutesToAirport('NRT');
  await getRoutesToAirport('CDG');
  
  // Example 4: Airline route analysis
  await analyzeAirlineRoutes('AA'); // American Airlines
  await analyzeAirlineRoutes('EK'); // Emirates
  
  // Example 5: Flight number routes
  await getFlightNumberRoutes('100', 'AA');
  await getFlightNumberRoutes('1');
  
  // Example 6: Find connections
  await findConnections('LAX', 'JFK');
  await findConnections('SFO', 'LHR');
  
  // Example 7: Weekly schedule
  await getWeeklySchedule('LHR', 'JFK');
  
  // Example 8: Advanced search
  await searchRoutesAdvanced();
  
  // Example 9: Network analysis
  await analyzeAirlineNetwork('DL'); // Delta
  
  // Example 10: Export to CSV
  await exportRoutesToCSV('UA'); // United
}

// Run examples
main().catch(console.error); 