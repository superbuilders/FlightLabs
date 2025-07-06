/**
 * FlightLabs Airlines API Examples
 * Demonstrates retrieving and analyzing airline information
 */

import { FlightLabsService } from '../utils/flightlabs';
import { flightLabsConfig } from '../config/flightlabs.config';

// Initialize service
const service = new FlightLabsService({
  ...flightLabsConfig,
  cacheEnabled: true,
});

/**
 * Example 1: Get specific airline by IATA code
 */
async function getAirlineByCode(iataCode: string) {
  console.log(`\n=== Airline Details for ${iataCode} ===`);
  
  try {
    const airline = await service.getAirlineByIataCode(iataCode);
    
    if (!airline) {
      console.log(`No airline found with code: ${iataCode}`);
      return;
    }
    
    console.log('\nBasic Information:');
    console.log(`  Name: ${airline.name}`);
    console.log(`  IATA/ICAO: ${airline.iata_code}/${airline.icao_code}`);
    console.log(`  Country: ${airline.country_code}`);
    console.log(`  Callsign: ${airline.callsign}`);
    
    console.log('\nFleet Information:');
    console.log(`  Total Aircraft: ${airline.total_aircrafts}`);
    console.log(`  Average Fleet Age: ${airline.average_fleet_age} years`);
    
    console.log('\nOperational Status:');
    const types = [];
    if (airline.is_international) types.push('International');
    if (airline.is_passenger) types.push('Passenger');
    if (airline.is_cargo) types.push('Cargo');
    if (airline.is_scheduled) types.push('Scheduled');
    console.log(`  Types: ${types.join(', ')}`);
    
    console.log('\nSafety Record (Last 5 Years):');
    console.log(`  Accidents: ${airline.accidents_last_5y}`);
    console.log(`  Crashes: ${airline.crashes_last_5y}`);
    
    if (airline.iosa_registered) {
      console.log(`\nIOSA Status: Registered`);
      console.log(`  Expires: ${new Date(airline.iosa_expiry!).toLocaleDateString()}`);
    } else {
      console.log('\nIOSA Status: Not Registered');
    }
    
    console.log('\nOnline Presence:');
    if (airline.website) console.log(`  Website: ${airline.website}`);
    if (airline.twitter) console.log(`  Twitter: ${airline.twitter}`);
    if (airline.facebook) console.log(`  Facebook: ${airline.facebook}`);
    
  } catch (error) {
    console.error('Error fetching airline:', error);
  }
}

/**
 * Example 2: Get airlines by country
 */
async function getAirlinesByCountryCode(countryCode: string) {
  console.log(`\n=== Airlines from ${countryCode} ===`);
  
  try {
    const result = await service.getAirlinesByCountry(countryCode);
    
    console.log(`\nTotal Airlines: ${result.statistics.totalAirlines}`);
    console.log(`  International: ${result.statistics.internationalAirlines}`);
    console.log(`  Domestic: ${result.statistics.domesticAirlines}`);
    console.log(`  IOSA Registered: ${result.statistics.iosaRegistered}`);
    
    console.log('\nFleet Statistics:');
    console.log(`  Total Aircraft: ${result.statistics.totalAircraft}`);
    console.log(`  Average Fleet Size: ${result.statistics.avgFleetSize}`);
    console.log(`  Average Fleet Age: ${result.statistics.avgFleetAge} years`);
    
    console.log('\nTop 5 Airlines by Fleet Size:');
    result.topByFleet.forEach((airline, idx) => {
      console.log(`  ${idx + 1}. ${airline.name} (${airline.iata_code}) - ${airline.total_aircrafts} aircraft`);
    });
    
    console.log('\nSafest Airlines:');
    result.safestAirlines.forEach((airline, idx) => {
      console.log(`  ${idx + 1}. ${airline.name} - ${airline.accidents_last_5y} accidents, ${airline.crashes_last_5y} crashes`);
    });
    
  } catch (error) {
    console.error('Error fetching airlines:', error);
  }
}

/**
 * Example 3: Search airlines by name
 */
async function searchAirlinesByName(searchTerm: string) {
  console.log(`\n=== Searching for "${searchTerm}" ===`);
  
  try {
    const result = await service.searchAirlines(searchTerm);
    
    if (result.exactMatch) {
      console.log('\nExact Match Found:');
      console.log(`  ${result.exactMatch.name} (${result.exactMatch.iata_code}/${result.exactMatch.icao_code})`);
      console.log(`  Country: ${result.exactMatch.country_code}`);
      console.log(`  Fleet Size: ${result.exactMatch.total_aircrafts}`);
    }
    
    if (result.partialMatches.length > 0) {
      console.log(`\nPartial Matches (${result.partialMatches.length}):`);
      result.partialMatches.slice(0, 5).forEach(airline => {
        console.log(`  - ${airline.name} (${airline.iata_code}) - ${airline.country_code}`);
      });
    }
    
    if (result.results.length === 0) {
      console.log('No airlines found matching the search term.');
    }
    
  } catch (error) {
    console.error('Error searching airlines:', error);
  }
}

/**
 * Example 4: Compare multiple airlines
 */
async function compareAirlines(iataCodes: string[]) {
  console.log(`\n=== Comparing Airlines: ${iataCodes.join(', ')} ===`);
  
  try {
    const result = await service.compareAirlines(iataCodes);
    
    console.log('\nComparison Results:');
    console.log('Rank | Airline | Fleet | Safety | Age | Score');
    console.log('-----|---------|-------|--------|-----|------');
    
    result.comparison.forEach((item, idx) => {
      const safetyInfo = result.statistics.safetyComparison.get(item.airline.iata_code);
      console.log(
        `${(idx + 1).toString().padEnd(4)} | ` +
        `${item.airline.name.padEnd(7).substring(0, 7)} | ` +
        `#${item.fleetRank.toString().padEnd(5)} | ` +
        `#${item.safetyRank.toString().padEnd(6)} | ` +
        `#${item.ageRank.toString().padEnd(3)} | ` +
        `${item.overallScore}%`
      );
    });
    
    console.log('\nSafety Ratings:');
    result.statistics.safetyComparison.forEach((safety, iata) => {
      const airline = result.comparison.find(c => c.airline.iata_code === iata)?.airline;
      if (airline) {
        console.log(`  ${airline.name}: ${safety.rating} (${safety.score}/10)`);
      }
    });
    
    console.log('\nAggregated Statistics:');
    console.log(`  Average Fleet Size: ${result.statistics.avgFleetSize}`);
    console.log(`  Average Fleet Age: ${result.statistics.avgFleetAge} years`);
    console.log(`  Total Accidents (5y): ${result.statistics.totalAccidents}`);
    console.log(`  Total Crashes (5y): ${result.statistics.totalCrashes}`);
    
  } catch (error) {
    console.error('Error comparing airlines:', error);
  }
}

/**
 * Example 5: Global airline safety analysis
 */
async function getGlobalSafetyAnalysis() {
  console.log('\n=== Global Airline Safety Analysis ===');
  
  try {
    const result = await service.getAirlineSafetyAnalysis();
    
    console.log(`\nTotal Airlines Analyzed: ${result.totalAirlines}`);
    console.log('\nSafety Distribution:');
    console.log(`  Safe (0 crashes): ${result.statistics.safe} airlines (${result.statistics.percentageSafe}%)`);
    console.log(`  Caution (accidents only): ${result.statistics.caution} airlines`);
    console.log(`  Risk (has crashes): ${result.statistics.risk} airlines`);
    
    console.log('\nGlobal Statistics:');
    console.log(`  Total Accidents (5y): ${result.statistics.totalAccidents}`);
    console.log(`  Total Crashes (5y): ${result.statistics.totalCrashes}`);
    
    console.log('\nTop 10 Safest Airlines (min 20 aircraft):');
    result.bestAirlines.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.airline.name} (${item.airline.iata_code}) - ${item.airline.country_code}`);
      console.log(`     Rating: ${item.safetyRating.rating} (${item.safetyRating.score}/10)`);
      console.log(`     Fleet: ${item.airline.total_aircrafts} aircraft`);
    });
    
    console.log('\nAirlines Requiring Attention:');
    result.worstAirlines.slice(0, 5).forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.airline.name} (${item.airline.iata_code})`);
      console.log(`     Accidents: ${item.airline.accidents_last_5y}, Crashes: ${item.airline.crashes_last_5y}`);
      console.log(`     Rating: ${item.safetyRating.rating} (${item.safetyRating.score}/10)`);
    });
    
  } catch (error) {
    console.error('Error analyzing safety:', error);
  }
}

/**
 * Example 6: Get airlines by type
 */
async function getAirlinesByType(type: 'passenger' | 'cargo' | 'international' | 'domestic') {
  console.log(`\n=== ${type.charAt(0).toUpperCase() + type.slice(1)} Airlines ===`);
  
  try {
    const result = await service.getAirlinesByType(type);
    
    console.log(`\nTotal ${type} airlines: ${result.statistics.totalAirlines}`);
    console.log(`Average Fleet Size: ${result.statistics.avgFleetSize}`);
    console.log(`Countries Represented: ${result.statistics.byCountry.size}`);
    
    console.log(`\nTop 10 by Fleet Size:`);
    result.topByFleet.forEach((airline, idx) => {
      console.log(`  ${idx + 1}. ${airline.name} (${airline.iata_code}) - ${airline.country_code}`);
      console.log(`     Fleet: ${airline.total_aircrafts} aircraft, Age: ${airline.average_fleet_age}y`);
    });
    
    // Show top countries
    const countriesArray = Array.from(result.byCountry.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);
    
    console.log('\nTop Countries:');
    countriesArray.forEach(([country, airlines]) => {
      console.log(`  ${country}: ${airlines.length} airlines`);
    });
    
  } catch (error) {
    console.error('Error fetching airlines by type:', error);
  }
}

/**
 * Example 7: Major carriers analysis
 */
async function analyzeMajorCarriers() {
  console.log('\n=== Major Carriers Analysis (100+ aircraft) ===');
  
  try {
    const result = await service.getMajorCarriersAnalysis(100);
    
    console.log(`\nTotal Major Carriers: ${result.statistics.totalAirlines}`);
    console.log(`Combined Fleet: ${result.statistics.totalAircraft} aircraft`);
    console.log(`Average Fleet Size: ${result.statistics.avgFleetSize}`);
    
    console.log('\nRegional Distribution:');
    result.byRegion.forEach((airlines, region) => {
      console.log(`  ${region}: ${airlines.length} carriers`);
    });
    
    console.log('\nTop 10 by Market Share:');
    result.marketShare.slice(0, 10).forEach(item => {
      console.log(`  ${item.rank}. ${item.airline.name} (${item.airline.iata_code})`);
      console.log(`     Fleet: ${item.airline.total_aircrafts} (${item.fleetPercentage}% of total)`);
    });
    
    // Note: Alliance data would require additional information
    console.log('\nNote: Alliance groupings require additional data not available in this API');
    
  } catch (error) {
    console.error('Error analyzing major carriers:', error);
  }
}

/**
 * Example 8: Check airline operational status
 */
async function checkAirlineStatus(iataCode: string) {
  console.log(`\n=== Operational Status for ${iataCode} ===`);
  
  try {
    const result = await service.checkAirlineOperationalStatus(iataCode);
    
    if (!result.airline) {
      console.log('Airline not found');
      return;
    }
    
    console.log(`\nAirline: ${result.airline.name}`);
    console.log(`Operational: ${result.isOperational ? 'Yes' : 'No'}`);
    
    console.log('\nServices:');
    const details = result.operationalDetails;
    console.log(`  Passenger Service: ${details.hasPassengerService ? 'Yes' : 'No'}`);
    console.log(`  Cargo Service: ${details.hasCargoService ? 'Yes' : 'No'}`);
    console.log(`  Scheduled Service: ${details.hasScheduledService ? 'Yes' : 'No'}`);
    console.log(`  International: ${details.isInternational ? 'Yes' : 'No'}`);
    
    console.log('\nFleet Status:');
    console.log(`  Category: ${details.fleetStatus}`);
    console.log(`  Total Aircraft: ${result.airline.total_aircrafts}`);
    console.log(`  Average Age: ${result.airline.average_fleet_age} years`);
    
    console.log('\nSafety Status:');
    console.log(`  Rating: ${details.safetyStatus.rating} (${details.safetyStatus.score}/10)`);
    console.log(`  Description: ${details.safetyStatus.description}`);
    
    console.log('\nIOSA Status:');
    console.log(`  Registered: ${details.iosaStatus.registered ? 'Yes' : 'No'}`);
    if (details.iosaStatus.registered) {
      console.log(`  Expiring Soon: ${details.iosaStatus.expiringSoon ? 'Yes' : 'No'}`);
      if (details.iosaStatus.expiryDate) {
        console.log(`  Expiry Date: ${new Date(details.iosaStatus.expiryDate).toLocaleDateString()}`);
      }
    }
    
    console.log('\nReal-time Flight Activity:');
    console.log(`  Total Flights: ${result.realtimeFlights.total}`);
    console.log(`  En Route: ${result.realtimeFlights.enRoute}`);
    console.log(`  Scheduled: ${result.realtimeFlights.scheduled}`);
    console.log(`  Landed: ${result.realtimeFlights.landed}`);
    
  } catch (error) {
    console.error('Error checking airline status:', error);
  }
}

/**
 * Main function to run examples
 */
async function main() {
  console.log('FlightLabs Airlines API Examples\n');
  
  // Example 1: Get specific airlines
  await getAirlineByCode('AA'); // American Airlines
  await getAirlineByCode('DL'); // Delta Air Lines
  await getAirlineByCode('EK'); // Emirates
  
  // Example 2: Get airlines by country
  await getAirlinesByCountryCode('US'); // United States
  await getAirlinesByCountryCode('GB'); // United Kingdom
  await getAirlinesByCountryCode('AE'); // United Arab Emirates
  
  // Example 3: Search airlines
  await searchAirlinesByName('American');
  await searchAirlinesByName('Emirates');
  await searchAirlinesByName('cargo');
  
  // Example 4: Compare airlines
  await compareAirlines(['AA', 'DL', 'UA', 'WN']); // Major US carriers
  await compareAirlines(['EK', 'QR', 'EY']); // Middle East carriers
  
  // Example 5: Global safety analysis
  await getGlobalSafetyAnalysis();
  
  // Example 6: Airlines by type
  await getAirlinesByType('cargo');
  await getAirlinesByType('international');
  
  // Example 7: Major carriers
  await analyzeMajorCarriers();
  
  // Example 8: Check operational status
  await checkAirlineStatus('AA');
  await checkAirlineStatus('FX'); // FedEx
}

// Run examples
main().catch(console.error); 