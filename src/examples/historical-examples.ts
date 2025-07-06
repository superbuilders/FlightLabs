/**
 * FlightLabs Historical Flights Endpoint Examples
 * 
 * Demonstrates usage of the historical flights endpoint
 */

import FlightLabsService, { 
  HistoricalDataProcessor,
  HistoricalFlightData,
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
 * Example 1: Get historical departures for a specific time range
 */
async function getHistoricalDepartures() {
  const service = await initializeService();
  
  try {
    // Get departures from JFK for a 6-hour window
    const analysis = await service.getHistoricalDeparturesAnalysis(
      'JFK',
      '2023-10-04T06:00',
      '2023-10-04T12:00'
    );
    
    console.log('JFK Departures Analysis (2023-10-04 06:00-12:00):');
    console.log(`  Total flights: ${analysis.statistics.total}`);
    console.log(`  Cargo flights: ${analysis.statistics.cargo}`);
    console.log(`  Codeshare flights: ${analysis.statistics.codeshare}`);
    console.log(`  Airlines: ${analysis.statistics.airlines}`);
    console.log(`  Aircraft types: ${analysis.statistics.aircraftTypes}`);
    
    // Show top airlines
    console.log('\nTop 5 Airlines:');
    const topAirlines = Array.from(analysis.byAirline.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);
    
    topAirlines.forEach(([iata, flights]) => {
      const airline = flights[0].airline.name;
      console.log(`  ${airline} (${iata}): ${flights.length} flights`);
    });
    
    // Show terminal distribution
    console.log('\nTerminal Distribution:');
    analysis.byTerminal.forEach((flights, terminal) => {
      console.log(`  Terminal ${terminal}: ${flights.length} flights`);
    });
  } catch (error) {
    console.error('Historical departures error:', error);
  }
}

/**
 * Example 2: Get full day historical data
 */
async function getFullDayHistory() {
  const service = await initializeService();
  
  try {
    // Get all departures from LAX for October 1, 2023
    const flights = await service.getHistoricalFlightsByDate(
      'LAX',
      'departure',
      '2023-10-01'
    );
    
    console.log(`LAX Departures on 2023-10-01: ${flights.length} flights`);
    
    // Group by hour
    const hourlyDistribution = HistoricalDataProcessor.getPeakHours(flights);
    const sortedHours = Array.from(hourlyDistribution.entries()).sort((a, b) => a[0] - b[0]);
    
    console.log('\nHourly Distribution:');
    sortedHours.forEach(([hour, count]) => {
      const bar = '■'.repeat(Math.floor(count / 2));
      console.log(`  ${hour.toString().padStart(2, '0')}:00  ${bar} ${count}`);
    });
    
    // Find peak hours
    const peakHour = sortedHours.reduce((max, curr) => 
      curr[1] > max[1] ? curr : max
    );
    console.log(`\nPeak hour: ${peakHour[0]}:00 with ${peakHour[1]} flights`);
  } catch (error) {
    console.error('Full day history error:', error);
  }
}

/**
 * Example 3: Airline frequency analysis
 */
async function analyzeAirlineFrequency() {
  const service = await initializeService();
  
  try {
    // Analyze airline frequency at ORD for a morning period
    const { sorted } = await service.getAirlineFrequencyAnalysis(
      'ORD',
      'departure',
      '2023-10-02T05:00',
      '2023-10-02T09:00'
    );
    
    console.log('ORD Morning Departure Analysis (05:00-09:00):');
    console.log('Airline Market Share:\n');
    
    sorted.slice(0, 10).forEach(([iata, data], index) => {
      const bar = '█'.repeat(Math.floor(data.percentage / 2));
      console.log(`${(index + 1).toString().padStart(2)}. ${data.airline} (${iata})`);
      console.log(`    ${bar} ${data.percentage.toFixed(1)}% (${data.count} flights)\n`);
    });
  } catch (error) {
    console.error('Airline frequency error:', error);
  }
}

/**
 * Example 4: Track specific flight history
 */
async function trackFlightHistory() {
  const service = await initializeService();
  
  try {
    // Track Delta flight 100 departures from ATL
    const flights = await service.getHistoricalFlights({
      code: 'ATL',
      type: 'departure',
      date_from: '2023-10-01T00:00',
      date_to: '2023-10-01T23:59',
      airline_iata: 'DL',
      flight_num: '100'
    });
    
    console.log(`Delta Flight 100 History from ATL on 2023-10-01:`);
    
    if (flights.length === 0) {
      console.log('No flights found');
      return;
    }
    
    flights.forEach(flight => {
      const formatted = HistoricalDataProcessor.formatHistoricalFlight(flight);
      console.log(`\n${formatted.flightNumber}`);
      console.log(`  Scheduled: ${formatted.schedule.formattedLocal}`);
      console.log(`  Aircraft: ${formatted.aircraft.model}`);
      console.log(`  Terminal: ${formatted.airport.terminal || 'N/A'}`);
      console.log(`  Status: ${formatted.status.flight}`);
      console.log(`  Codeshare: ${formatted.status.codeshare}`);
    });
  } catch (error) {
    console.error('Flight history error:', error);
  }
}

/**
 * Example 5: Compare arrivals and departures
 */
async function compareArrivalsAndDepartures() {
  const service = await initializeService();
  
  try {
    const airport = 'DFW';
    const dateFrom = '2023-10-03T12:00';
    const dateTo = '2023-10-03T14:00';
    
    // Get both arrivals and departures
    const [departures, arrivals] = await Promise.all([
      service.getHistoricalDeparturesAnalysis(airport, dateFrom, dateTo),
      service.getHistoricalArrivalsAnalysis(airport, dateFrom, dateTo)
    ]);
    
    console.log(`${airport} Operations (${dateFrom} to ${dateTo}):`);
    console.log(`\nDepartures: ${departures.statistics.total}`);
    console.log(`Arrivals: ${arrivals.statistics.total}`);
    console.log(`Total movements: ${departures.statistics.total + arrivals.statistics.total}`);
    
    // Compare airlines
    const allAirlines = new Set([
      ...departures.byAirline.keys(),
      ...arrivals.byAirline.keys()
    ]);
    
    console.log(`\nAirline Operations (${allAirlines.size} airlines):`);
    console.log('Airline          Departures  Arrivals  Total');
    console.log('─'.repeat(45));
    
    Array.from(allAirlines).sort().forEach(iata => {
      const depCount = departures.byAirline.get(iata)?.length || 0;
      const arrCount = arrivals.byAirline.get(iata)?.length || 0;
      const total = depCount + arrCount;
      
      if (total >= 5) { // Only show airlines with 5+ movements
        console.log(
          `${iata.padEnd(15)} ${depCount.toString().padStart(10)} ${arrCount.toString().padStart(9)} ${total.toString().padStart(7)}`
        );
      }
    });
  } catch (error) {
    console.error('Comparison error:', error);
  }
}

/**
 * Example 6: Analyze aircraft utilization
 */
async function analyzeAircraftUtilization() {
  const service = await initializeService();
  
  try {
    // Get all United Airlines flights from SFO
    const flights = await service.getHistoricalFlights({
      code: 'SFO',
      type: 'departure',
      date_from: '2023-10-02T00:00',
      date_to: '2023-10-02T23:59',
      airline_iata: 'UA'
    });
    
    console.log('United Airlines Aircraft Utilization at SFO (2023-10-02):');
    
    // Group by aircraft model
    const byAircraft = HistoricalDataProcessor.groupByAircraftModel(flights);
    const sorted = Array.from(byAircraft.entries())
      .sort((a, b) => b[1].length - a[1].length);
    
    console.log(`\nTotal flights: ${flights.length}`);
    console.log(`Aircraft types: ${sorted.length}\n`);
    
    sorted.forEach(([model, flights]) => {
      const percentage = (flights.length / flights.length * 100).toFixed(1);
      const bar = '▓'.repeat(Math.floor(flights.length / 2));
      console.log(`${model.padEnd(25)} ${bar} ${flights.length} flights`);
    });
    
    // Show cargo vs passenger
    const cargoFlights = HistoricalDataProcessor.filterCargoFlights(flights);
    const passengerFlights = flights.length - cargoFlights.length;
    
    console.log('\nFlight Types:');
    console.log(`  Passenger: ${passengerFlights} (${(passengerFlights / flights.length * 100).toFixed(1)}%)`);
    console.log(`  Cargo: ${cargoFlights.length} (${(cargoFlights.length / flights.length * 100).toFixed(1)}%)`);
  } catch (error) {
    console.error('Aircraft utilization error:', error);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('FlightLabs Historical Flights Examples\n');
  
  const args = process.argv.slice(2);
  const example = args[0];
  
  switch (example) {
    case 'departures':
      await getHistoricalDepartures();
      break;
    case 'fullday':
      await getFullDayHistory();
      break;
    case 'frequency':
      await analyzeAirlineFrequency();
      break;
    case 'history':
      await trackFlightHistory();
      break;
    case 'compare':
      await compareArrivalsAndDepartures();
      break;
    case 'aircraft':
      await analyzeAircraftUtilization();
      break;
    default:
      console.log('Usage: npm run dev src/examples/historical-examples.ts [example]');
      console.log('\nExamples:');
      console.log('  departures  - Analyze historical departures');
      console.log('  fullday     - Get full day history with hourly breakdown');
      console.log('  frequency   - Airline frequency analysis');
      console.log('  history     - Track specific flight history');
      console.log('  compare     - Compare arrivals and departures');
      console.log('  aircraft    - Analyze aircraft utilization');
      console.log('\nNote: Examples use October 2023 dates. Update dates as needed.');
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