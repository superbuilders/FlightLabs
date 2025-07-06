# FlightLabs API Utilities

Comprehensive TypeScript utilities for interacting with the FlightLabs real-time flight data API.

## Features

- **Type-safe API client** with full TypeScript support
- **Automatic retry logic** for failed requests
- **Response caching** to reduce API calls and improve performance
- **Data processing utilities** for common transformations
- **Enhanced service layer** with convenient methods
- **Error handling** with custom error types

## Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create a `.env` file in the backend directory:
```env
# FlightLabs API Configuration
FLIGHTLABS_ACCESS_KEY=your_access_key_here

# Optional configurations
CACHE_ENABLED=true
CACHE_TTL_SECONDS=60
CACHE_MAX_ENTRIES=100
API_TIMEOUT=30000
API_MAX_RETRIES=3
```

## Core Components

### 1. FlightLabsClient
Low-level API client for direct API interactions.

```typescript
import { FlightLabsClient } from './utils/flightlabs';

const client = new FlightLabsClient({
  accessKey: 'your_api_key',
  timeout: 30000,
  maxRetries: 3
});

// Get flights by airline
const flights = await client.getFlightsByAirline('AA');

// Search with multiple criteria
const results = await client.searchFlights({
  airline: { iata: 'DL' },
  departure: { iata: 'JFK' },
  limit: 50
});
```

### 2. FlightLabsService
High-level service with caching and enhanced features.

```typescript
import FlightLabsService from './utils/flightlabs';

const service = new FlightLabsService({
  accessKey: 'your_api_key',
  cacheEnabled: true,
  cacheTTL: 60
});

// Get active flights only
const activeFlights = await service.getActiveFlights({ airlineIata: 'UA' });

// Track a specific flight
const tracking = await service.trackFlight('AA100');

// Get airport activity
const activity = await service.getAirportActivity('LAX');
```

### 3. FlightDataProcessor
Utilities for processing and transforming flight data.

```typescript
import { FlightDataProcessor } from './utils/flightlabs';

// Convert units
const feet = FlightDataProcessor.metersToFeet(10000);
const knots = FlightDataProcessor.kmhToKnots(800);

// Format flight information
const formatted = FlightDataProcessor.formatFlightInfo(flightData);

// Filter and sort
const cruisingFlights = FlightDataProcessor.filterByAltitude(flights, 9000, 15000);
const sorted = FlightDataProcessor.sortFlights(flights, 'altitude', 'desc');
```

### 4. CallSignDataProcessor
Utilities for processing call sign flight data.

```typescript
import { CallSignDataProcessor } from './utils/flightlabs';

// Convert units specific to call sign data
const mph = CallSignDataProcessor.knotsToMph(150);
const kmh = CallSignDataProcessor.knotsToKmh(150);

// Format call sign flight information
const formatted = CallSignDataProcessor.formatCallSignFlight(callSignData);

// Filter by ground status
const airborne = CallSignDataProcessor.getAirborneFlights(flights);
const grounded = CallSignDataProcessor.getGroundedFlights(flights);

// Check for emergency flights
const emergencies = CallSignDataProcessor.getEmergencyFlights(flights);
```

### 5. HistoricalDataProcessor
Utilities for processing historical flight data.

```typescript
import { HistoricalDataProcessor } from './utils/flightlabs';

// Parse time strings
const utcDate = HistoricalDataProcessor.parseUTCTime('2023-10-04 12:13Z');
const localTime = HistoricalDataProcessor.parseLocalTime('2023-10-04 08:13-04:00');

// Format historical flight data
const formatted = HistoricalDataProcessor.formatHistoricalFlight(historicalData);

// Sort and filter
const sorted = HistoricalDataProcessor.sortByScheduledTime(flights, 'asc');
const cargoOnly = HistoricalDataProcessor.filterCargoFlights(flights);

// Analyze data
const peakHours = HistoricalDataProcessor.getPeakHours(flights);
const frequency = HistoricalDataProcessor.calculateAirlineFrequency(flights);
```

### 6. ScheduleDataProcessor
Utilities for processing flight schedule data.

```typescript
import { ScheduleDataProcessor } from './utils/flightlabs';

// Parse time strings
const localTime = ScheduleDataProcessor.parseLocalTime('2024-03-12 07:30');
const utcTime = ScheduleDataProcessor.parseUTCTime('2024-03-12 11:30');

// Format schedule data
const formatted = ScheduleDataProcessor.formatScheduledFlight(scheduleData);

// Filter and sort
const delayed = ScheduleDataProcessor.filterDelayedFlights(flights, 15);
const sorted = ScheduleDataProcessor.sortByDepartureTime(flights, 'asc');

// Analyze performance
const onTime = ScheduleDataProcessor.calculateOnTimePerformance(flights);
const gateAssignments = ScheduleDataProcessor.getGateAssignments(flights);

// Get upcoming flights
const upcoming = ScheduleDataProcessor.getUpcomingDepartures(flights, new Date(), 4);
```

### 7. FutureFlightDataProcessor
Utilities for processing future flight prediction data.

```typescript
import { FutureFlightDataProcessor } from './utils/flightlabs';

// Parse time data
const sortTime = FutureFlightDataProcessor.parseSortTime('2025-07-14T05:00:00+00:00');
const depTime = FutureFlightDataProcessor.parseTime24('06:00');

// Format future flight data
const formatted = FutureFlightDataProcessor.formatFutureFlight(futureData);

// Sort and filter
const sorted = FutureFlightDataProcessor.sortByDepartureTime(flights, 'asc');
const morning = FutureFlightDataProcessor.getMorningFlights(flights);

// Analyze carrier operations
const carrierStats = FutureFlightDataProcessor.getCarrierStatistics(flights);
const popularRoutes = FutureFlightDataProcessor.getPopularRoutes(flights, 3);

// Get time distribution
const hourlyDist = FutureFlightDataProcessor.getHourlyDistribution(flights);
```

### 8. DelayDataProcessor
Utilities for processing flight delay data.

```typescript
import { DelayDataProcessor } from './utils/flightlabs';

// Parse time strings
const localTime = DelayDataProcessor.parseLocalTime('2024-03-15 19:10');
const utcTime = DelayDataProcessor.parseUTCTime('2024-03-15 11:10');

// Categorize delay severity
const category = DelayDataProcessor.categorizeDelay(75); // Returns 'major'

// Format delayed flight data
const formatted = DelayDataProcessor.formatDelayedFlight(delayData);

// Sort and filter
const sorted = DelayDataProcessor.sortByDelayTime(flights, 'desc');
const severe = DelayDataProcessor.filterBySeverity(flights, 60, 120);
const active = DelayDataProcessor.getActiveDelays(flights);

// Group and analyze
const byAirline = DelayDataProcessor.groupByAirline(flights);
const byCategory = DelayDataProcessor.groupByDelayCategory(flights);
const statistics = DelayDataProcessor.calculateDelayStatistics(flights);

// Performance analysis
const airlinePerf = DelayDataProcessor.calculateAirlineDelayPerformance(flights);
const worstDelays = DelayDataProcessor.getWorstDelays(flights, 10);

// Cost estimation
const cost = DelayDataProcessor.estimateDelayCost(120, 200); // 120min delay, 200 passengers

// Format utilities
const duration = DelayDataProcessor.formatDelayDuration(185); // "3h 5m"
const trend = DelayDataProcessor.getDelayTrend(flight); // 'improving' | 'worsening' | 'stable'
```

### 9. AirportSearchProcessor
Utilities for processing airport search results.

```typescript
import { AirportSearchProcessor } from './utils/flightlabs';

// Group results by type
const grouped = AirportSearchProcessor.groupByType(results);
const cities = grouped.cities;
const airports = grouped.airports;

// Sort and rank results
const sorted = AirportSearchProcessor.sortByRelevance(results);
const ranked = AirportSearchProcessor.rankResults(results);

// Filter results
const usAirports = AirportSearchProcessor.filterByCountry(results, 'United States');
const exactMatches = AirportSearchProcessor.findExactMatches(results, 'JFK');
const partialMatches = AirportSearchProcessor.findPartialMatches(results, 'new');

// Format for display
const formatted = AirportSearchProcessor.formatSearchResult(result);
const table = AirportSearchProcessor.formatResultsTable(results);

// Get flight parameters
const params = AirportSearchProcessor.getFlightSearchParams(result);
// Returns: { skyId, entityId, name, type }

// Check hub status
const isHub = AirportSearchProcessor.isMajorHub(result);

// Get statistics
const stats = AirportSearchProcessor.getStatistics(results);
// Returns: { total, cities, airports, countries, majorHubs, byCountry }

// Create summary
const summary = AirportSearchProcessor.createSearchSummary('London', results);
```

### 10. Cities API
Get detailed city information by IATA city code.

```typescript
import { FlightLabsService } from './utils/flightlabs';

const service = new FlightLabsService(config);

// Get city information by IATA city code
const result = await service.getCityByIataCode('SIN');

// Result includes:
// - City data with population, timezone, coordinates
// - Country information
// - All airports in the city
// - Name translations in multiple languages
// - Wikipedia link and slug

console.log(result.city.name); // "Singapore"
console.log(result.city.population); // 3547809
console.log(result.timezone); // "Asia/Singapore"
console.log(result.city.un_locode); // "SGSIN"
console.log(result.location.lat); // 1.28967
console.log(result.location.lng); // 103.85007
console.log(result.airports.length); // Number of airports in the city

// Get city names in different languages
console.log(result.city.names.zh); // "新加坡"
console.log(result.city.names.ja); // "シンガポール"
console.log(result.city.names.ar); // "سنغافورة"

// Access airport information
result.airports.forEach(airport => {
  console.log(`${airport.name} (${airport.iata_code})`);
  console.log(`  Type: ${airport.type}, Size: ${airport.size}`);
  console.log(`  Annual Departures: ${airport.departures}`);
});

// Helper functions for city data
import { getCityNameInLanguage } from './utils/flightlabs';

// Get city name in specific language
const frenchName = getCityNameInLanguage(result.city, 'fr'); // "Singapour"
```

**City Query Parameters:**

```typescript
interface CityQueryParams {
  access_key: string;      // API access key (required)
  codeIataCity: string;    // IATA city code (required)
}
```

**City Response Structure:**

```typescript
interface CityData {
  name: string;            // City name
  iata_city_code: string;  // IATA city code
  un_locode: string;       // UN/LOCODE
  lat: number;             // Latitude
  lng: number;             // Longitude
  alt: number;             // Altitude (meters)
  timezone: string;        // Timezone (e.g., "Asia/Singapore")
  country_code: string;    // ISO 2 country code
  population: number;      // City population
  names: CityNames;        // City names in different languages
  wikipedia: string;       // Wikipedia URL
  slug: string;            // URL-friendly slug
}

interface CityNames {
  [languageCode: string]: string; // Language code to name mapping
  // Common languages include:
  de?: string;   // German
  hi?: string;   // Hindi
  fi?: string;   // Finnish
  ru?: string;   // Russian
  lo?: string;   // Lao
  pt?: string;   // Portuguese
  yue?: string;  // Cantonese
  fr?: string;   // French
  hak?: string;  // Hakka
  gan?: string;  // Gan
  wuu?: string;  // Wu
  uk?: string;   // Ukrainian
  km?: string;   // Khmer
  sv?: string;   // Swedish
  ko?: string;   // Korean
  mr?: string;   // Marathi
  el?: string;   // Greek
  en?: string;   // English
  it?: string;   // Italian
  my?: string;   // Burmese
  ta?: string;   // Tamil
  es?: string;   // Spanish
  zh?: string;   // Chinese
  pa?: string;   // Punjabi
  ar?: string;   // Arabic
  th?: string;   // Thai
  ja?: string;   // Japanese
  fa?: string;   // Persian
  da?: string;   // Danish
  he?: string;   // Hebrew
  // ... and many more
}

interface CityResponse {
  success: boolean;
  data: CityData[];
}
```

### 11. CountryDataProcessor
Utilities for processing country data.

```typescript
import { CountryDataProcessor } from './utils/flightlabs';

// Sort countries
const sorted = CountryDataProcessor.sortByName(countries);
const byCurrency = CountryDataProcessor.sortByCurrency(countries);

// Group countries
const grouped = CountryDataProcessor.groupCountries();
const euroZone = grouped.byCurrency.get('EUR');
const englishMarkets = grouped.byLanguage.get('en');

// Get region for country
const region = CountryDataProcessor.getRegionFromCountryCode('JP'); // 'Asia'

// Filter by region
const grouped = processor.groupCountries();
const europeanCountries = grouped.byRegion.get('Europe');

// Search countries
const matches = CountryDataProcessor.searchByName('United');

// Format country data
const formatted = CountryDataProcessor.formatCountry(country);

// Export to CSV
const csv = CountryDataProcessor.exportToCSV();
```

### 12. Country Details by Code
Get detailed country information using ISO 2 country codes.

```typescript
import { FlightLabsService } from './utils/flightlabs';

const service = new FlightLabsService(config);

// Get detailed country information by ISO 2 code
const result = await service.getCountryDetailsByCode('SG');

// Result includes:
// - Detailed country data with population, continent, currency
// - Name translations in 100+ languages
// - Currency information with other countries using the same currency
// - Formatted population and continent name

console.log(result.country.name); // "Singapore"
console.log(result.country.population); // 5638676
console.log(result.country.continent); // "AS"
console.log(result.continentName); // "Asia"
console.log(result.country.names.zh); // "新加坡"
console.log(result.country.names.ja); // "シンガポール"

// Get comprehensive country summary with airports
const summary = await service.getCountrySummary('GB');

// Summary includes:
// - Basic country info (currency, market, etc.)
// - Detailed info (population, continent, languages)
// - Airport statistics (total, major, international)
// - Top major airports with details
// - Countries with similar markets

console.log(summary.airports.total); // Total number of airports
console.log(summary.airports.topAirports); // Array of top airports
console.log(summary.languages); // Available language codes
console.log(summary.neighboringMarkets); // Similar market countries
```

### 13. Airlines API
Get comprehensive airline information including fleet details, safety records, and operational status.

```typescript
import { FlightLabsService } from './utils/flightlabs';

const service = new FlightLabsService(config);

// Get airline by IATA code
const airline = await service.getAirlineByIataCode('AA');

// Get airlines by country
const usAirlines = await service.getAirlinesByCountry('US');

// Search airlines by name
const searchResults = await service.searchAirlines('American');

// Compare multiple airlines
const comparison = await service.compareAirlines(['AA', 'DL', 'UA']);

// Get global safety analysis
const safetyAnalysis = await service.getAirlineSafetyAnalysis();

// Check airline operational status with real-time flights
const status = await service.checkAirlineOperationalStatus('AA');
```

### 14. AirlineDataProcessor
Utilities for processing and analyzing airline data.

```typescript
import { AirlineDataProcessor } from './utils/flightlabs';

// Sort airlines
const sorted = AirlineDataProcessor.sortByFleetSize(airlines);
const byName = AirlineDataProcessor.sortByName(airlines);

// Group airlines
const grouped = AirlineDataProcessor.groupAirlines(airlines);
const usCarriers = grouped.byCountry.get('US');
const passengerAirlines = grouped.byType.passenger;

// Fleet size analysis
const category = AirlineDataProcessor.getFleetSizeCategory(500); // 'Very Large'

// Safety analysis
const safety = AirlineDataProcessor.getSafetyRating(airline);
console.log(`Safety: ${safety.rating} (${safety.score}/100)`);

// Search airlines
const matches = AirlineDataProcessor.searchAirlines(airlines, 'American');

// Export data
const csv = AirlineDataProcessor.exportToCSV(airlines);
const json = AirlineDataProcessor.exportToJSON(airlines);
```

### 14. RouteDataProcessor
Comprehensive route data processing utilities.

```typescript
import { RouteDataProcessor } from './utils/flightlabs';

// Get statistics
const stats = RouteDataProcessor.getStatistics(routes);
console.log(`Total routes: ${stats.totalRoutes}`);
console.log(`Average duration: ${stats.averageDuration} minutes`);

// Group routes
const grouped = RouteDataProcessor.groupRoutes(routes);
const deltaRoutes = grouped.byAirline.get('DL');
const shortFlights = grouped.byDuration.get('Short (<3h)');

// Filter routes
const directOnly = RouteDataProcessor.filterDirectRoutes(routes);
const codeshareOnly = RouteDataProcessor.filterCodeshareRoutes(routes);
const shortHaul = RouteDataProcessor.filterShortHaul(routes);
const mediumHaul = RouteDataProcessor.filterMediumHaul(routes);
const longHaul = RouteDataProcessor.filterLongHaul(routes);

// Duration filtering
const quickFlights = RouteDataProcessor.filterByDuration(routes, 0, 120); // < 2 hours
const longFlights = RouteDataProcessor.filterByDuration(routes, 360); // > 6 hours

// Daily schedules
const mondayFlights = RouteDataProcessor.getDailySchedule(routes, 'Monday');
const weekendFlights = RouteDataProcessor.getDailySchedule(routes, 'sat');

// Route analysis
const competition = RouteDataProcessor.getRouteCompetition(routes, 'JFK', 'LAX');
console.log(`Competition level: ${competition.competitionLevel}`);
console.log(`Airlines competing: ${competition.airlines.length}`);

// Terminal analysis
const terminals = RouteDataProcessor.getTerminalAnalysis(routes);
terminals.departure.forEach((info, key) => {
  console.log(`Terminal ${info.terminal}: ${info.routes} routes`);
});

// Unique route pairs
const pairs = RouteDataProcessor.getUniqueRoutePairs(routes);
pairs.forEach(pair => {
  console.log(`${pair.route}: ${pair.flights} flights by ${pair.airlines.length} airlines`);
});

// Find connections
const connections = RouteDataProcessor.findConnectingRoutes(allRoutes, 'LAX', 'LHR', 240);
connections.forEach(conn => {
  console.log(`Via ${conn.connection}: ${conn.totalDuration} min total`);
});

// Sort routes
const byDepartureTime = RouteDataProcessor.sortByDepartureTime(routes);
const byDuration = RouteDataProcessor.sortByDuration(routes);
const byFrequency = RouteDataProcessor.sortByFrequency(routes);

// Search routes
const searchResults = RouteDataProcessor.searchRoutes(routes, 'LAX');

// Format utilities
const formatted = RouteDataProcessor.formatRoute(route);
const duration = RouteDataProcessor.formatDuration(180); // "3h 0m"
const timeRange = RouteDataProcessor.formatTimeRange(route); // "10:30 - 14:45"

// Export routes
const csv = RouteDataProcessor.exportToCSV(routes);
const json = RouteDataProcessor.exportToJSON(routes);
```

### 15. Routes API
Comprehensive route information including airline schedules, codeshares, and connections.

```typescript
import { FlightLabsService } from './utils/flightlabs';

const service = new FlightLabsService(config);

// Get routes between two airports
const result = await service.getRoutesBetweenAirportsAnalysis('SIN', 'LHR');
// Returns: routes, statistics, competition analysis, formatted data

// Get all routes from an airport
const fromAirport = await service.getRoutesFromAirportAnalysis('DXB');
// Returns: routes, destinations, statistics, route categories (short/medium/long haul)

// Get all routes to an airport
const toAirport = await service.getRoutesToAirportAnalysis('JFK');
// Returns: routes, origins, statistics, terminal analysis

// Analyze airline route network
const airlineRoutes = await service.getRoutesByAirlineAnalysis('AA');
// Returns: routes, network map, hub analysis, daily schedules, CSV export

// Get routes by flight number
const flightRoutes = await service.getRoutesByFlightNumber('100', 'DL');
// Returns: route variants, operating days, schedule by day

// Find connecting routes
const connections = await service.findConnectingRoutes('LAX', 'LHR', {
  maxLayoverMinutes: 240,
  preferredAirlines: ['AA', 'BA']
});
// Returns: direct routes, connections via hubs, best options

// Get weekly schedule
const schedule = await service.getWeeklyRouteSchedule('LHR', 'JFK');
// Returns: daily flight schedules, statistics, frequency analysis

// Advanced route search
const searchResults = await service.searchRoutesComprehensive({
  departure: { iata: 'JFK' },
  operatingDays: ['Monday', 'Friday'],
  maxDuration: 180,
  directOnly: true
});

// Analyze airline network coverage
const network = await service.analyzeAirlineNetwork('EK');
// Returns: hubs, connectivity map, unique airports, route statistics

// Paginated route retrieval (for large datasets)
for await (const batch of service.getAllRoutesPaginated({ airline_iata: 'UA' })) {
  console.log(`Processing ${batch.length} routes`);
  // Process batch of routes
}
```

## Query Parameters

All methods accept these optional parameters:

```typescript
interface FlightQueryParams {
  limit?: number;          // Max results (max: 10000)
  flightIata?: string;     // Flight IATA code
  flightIcao?: string;     // Flight ICAO code
  flightNum?: string;      // Flight number
  airlineIata?: string;    // Airline IATA code
  airlineIcao?: string;    // Airline ICAO code
  depIata?: string;        // Departure airport IATA
  depIcao?: string;        // Departure airport ICAO
  arrIata?: string;        // Arrival airport IATA
  arrIcao?: string;        // Arrival airport ICAO
  regNum?: string;         // Aircraft registration
  hex?: string;            // Aircraft ICAO24 hex
}
```

**Call Sign Query Parameters:**

```typescript
interface CallSignQueryParams {
  access_key: string;      // Required API key
  callsign?: string;       // Flight call sign
  airline_icao?: string;   // Airline ICAO code
  limit?: number;          // Max results
}
```

**Flights by Airline Query Parameters:**

```typescript
interface FlightsByAirlineQueryParams {
  access_key: string;      // Required API key
  airline_icao: string;    // Airline ICAO code (required)
  limit?: number;          // Max results
}
```

**Historical Query Parameters:**

```typescript
interface HistoricalFlightQueryParams {
  code: string;           // Airport IATA code (required)
  type: 'departure' | 'arrival';  // Query type (required)
  date_from?: string;     // Start date/time (YYYY-MM-DDTHH:MM)
  date_to?: string;       // End date/time (YYYY-MM-DDTHH:MM)
  date?: string;          // Specific date (YYYY-MM-DD) - overrides date_from/date_to
  dep_iataCode?: string;  // Filter by departure airport (when type=arrival)
  arr_iataCode?: string;  // Filter by arrival airport (when type=departure)
  airline_iata?: string;  // Filter by airline IATA code
  flight_num?: string;    // Filter by flight number
}
```

**Schedule Query Parameters:**

```typescript
interface FlightScheduleQueryParams {
  iataCode: string;              // Airport IATA code (required)
  type?: 'departure' | 'arrival'; // Query type (defaults to 'arrival')
  airline_iata?: string;         // Filter by airline IATA
  airline_icao?: string;         // Filter by airline ICAO
  flight_iata?: string;          // Filter by flight IATA
  flight_icao?: string;          // Filter by flight ICAO
  arr_actual?: string;           // Filter by actual arrival time
  arr_actual_utc?: string;       // Filter by actual arrival UTC
  arr_actual_ts?: number;        // Filter by actual arrival timestamp
  limit?: number;                // Limit results
  skip?: number;                 // Skip results for pagination
}
```

**Future Flight Query Parameters:**

```typescript
interface FutureFlightQueryParams {
  iataCode: string;              // Airport IATA code (required)
  type: 'departure' | 'arrival'; // Query type (required)
  date: string;                  // Future date in YYYY-MM-DD format (required)
}
```

**Delay Query Parameters:**

```typescript
interface FlightDelayQueryParams {
  delay: number;                 // Minimum delay time in minutes (required)
  type: 'departures' | 'arrivals'; // Type of flights (required)
  arr_iata?: string;            // Arrival airport IATA code filter
  arr_icao?: string;            // Arrival airport ICAO code filter
  dep_iata?: string;            // Departure airport IATA code filter
  dep_icao?: string;            // Departure airport ICAO code filter
  airline_iata?: string;        // Airline IATA code filter
  airline_icao?: string;        // Airline ICAO code filter
  flight_iata?: string;         // Flight IATA code-number filter
  flight_icao?: string;         // Flight ICAO code-number filter
  flight_number?: string;       // Flight number filter
  limit?: number;               // Max results
}
```

**Flight By Number Query Parameters:**

```typescript
interface FlightByNumberQueryParams {
  flight_number: string;   // Flight number (required, e.g., "3o375")
  date?: string;           // Date in YYYY-MM-DD format (optional)
}
```

**Airport Search Query Parameters:**

```typescript
interface AirportSearchQueryParams {
  access_key: string;      // API access key (required)
  query: string;           // Location name to search for (required)
}
```

**Flight Prices Query Parameters:**

```typescript
interface FlightPriceQueryParams {
  access_key: string;           // API access key (required)
  originSkyId: string;          // Origin Sky ID from retrieveAirport endpoint (required)
  destinationSkyId: string;     // Destination Sky ID from retrieveAirport endpoint (required)
  originEntityId: string;       // Origin Entity ID from retrieveAirport endpoint (required)
  destinationEntityId: string;  // Destination Entity ID from retrieveAirport endpoint (required)
  date: string;                 // Date of departure in YYYY-MM-DD format (required)
  returnDate?: string;          // Date of return in YYYY-MM-DD format (optional)
  adults?: number;              // Number of adults (18+), default: 1
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
  sortBy?: 'best' | 'price_high' | 'fastest' | 'outbound_take_off_time' | 
           'outbound_landing_time' | 'return_take_off_time' | 'return_landing_time';
  childrens?: number;           // Number of children (2-12 years)
  infants?: number;             // Number of infants (under 2 years)
  currency?: string;            // Desired currency (e.g., "USD")
  market?: string;              // Market code (e.g., "en-US")
  countryCode?: string;         // Country code (e.g., "US")
}
```

## Response Data Structure

```typescript
interface FlightData {
  hex: string;              // ICAO24 hex address
  reg_number: string;       // Aircraft registration
  flag: string;             // Country code
  lat: number;              // Latitude
  lng: number;              // Longitude
  alt: number;              // Altitude in meters
  dir: number;              // Heading direction
  speed: number;            // Speed in km/h
  v_speed: number;          // Vertical speed
  flight_iata: string;      // Flight IATA code
  flight_icao: string;      // Flight ICAO code
  airline_iata: string;     // Airline IATA
  airline_icao: string;     // Airline ICAO
  aircraft_icao: string;    // Aircraft type
  dep_iata: string;         // Departure IATA
  dep_icao: string;         // Departure ICAO
  arr_iata: string;         // Arrival IATA
  arr_icao: string;         // Arrival ICAO
  status: 'scheduled' | 'en-route' | 'landed';
  updated: number;          // Unix timestamp
  type: string;             // Signal type
}
```

**Call Sign Response Structure:**

```typescript
interface CallSignFlightData {
  id: string;                        // Unique flight ID
  icao_24bit: string;                // 24-bit ICAO identifier
  latitude: number;                  // Latitude position
  longitude: number;                 // Longitude position
  heading: number;                   // Direction heading
  altitude: number;                  // Altitude in meters
  ground_speed: number;              // Ground speed in knots
  squawk: string;                    // Squawk code
  aircraft_code: string;             // Aircraft code
  registration: string;              // Aircraft registration
  time: number;                      // Unix timestamp
  origin_airport_iata: string;       // Origin IATA
  destination_airport_iata: string;  // Destination IATA
  number: string;                    // Flight number
  airline_iata: string;              // Airline IATA
  on_ground: number;                 // 0=flying, 1=grounded
  vertical_speed: number;            // Vertical speed in knots
  callsign: string;                  // Flight call sign
  airline_icao: string;              // Airline ICAO
}
```

**Historical Response Structure:**

```typescript
interface HistoricalFlightData {
  movement: {
    airport: {
      name: string;              // Airport name
    };
    scheduledTime: {
      utc: string;               // UTC time (e.g., "2023-10-04 12:13Z")
      local: string;             // Local time (e.g., "2023-10-04 08:13-04:00")
    };
    terminal?: string;           // Terminal (if available)
    quality: string[];           // Data quality indicators
  };
  number: string;                // Flight number (e.g., "DL 4094")
  status: string;                // Flight status
  codeshareStatus: string;       // Codeshare status
  isCargo: boolean;              // Cargo flight indicator
  aircraft: {
    model: string;               // Aircraft model (e.g., "Bombardier CRJ900")
  };
  airline: {
    name: string;                // Airline name
    iata: string;                // Airline IATA code
    icao: string;                // Airline ICAO code
  };
}
```

**Schedule Response Structure:**

```typescript
interface FlightScheduleData {
  airline_iata: string;          // Airline IATA code
  airline_icao: string;          // Airline ICAO code
  flight_iata: string;           // Flight IATA code
  flight_icao: string;           // Flight ICAO code
  flight_number: string;         // Flight number only
  dep_iata: string;              // Departure airport IATA
  dep_icao: string;              // Departure airport ICAO
  dep_terminal: string | null;   // Departure terminal
  dep_gate: string | null;       // Departure gate
  dep_time: string;              // Scheduled departure (local)
  dep_time_utc: string;          // Scheduled departure (UTC)
  dep_estimated: string | null;  // Estimated departure (local)
  dep_estimated_utc: string | null; // Estimated departure (UTC)
  dep_actual: string | null;     // Actual departure (local)
  dep_actual_utc: string | null; // Actual departure (UTC)
  dep_delayed: number | null;    // Departure delay in minutes
  arr_iata: string;              // Arrival airport IATA
  arr_icao: string;              // Arrival airport ICAO
  arr_terminal: string | null;   // Arrival terminal
  arr_gate: string | null;       // Arrival gate
  arr_baggage: string | null;    // Baggage claim carousel
  arr_time: string;              // Scheduled arrival (local)
  arr_time_utc: string;          // Scheduled arrival (UTC)
  arr_estimated: string | null;  // Estimated arrival (local)
  arr_estimated_utc: string | null; // Estimated arrival (UTC)
  arr_actual: string | null;     // Actual arrival (local)
  arr_actual_utc: string | null; // Actual arrival (UTC)
  arr_delayed: number | null;    // Arrival delay in minutes
  cs_airline_iata: string | null; // Codeshare airline IATA
  cs_flight_number: string | null; // Codeshare flight number
  cs_flight_iata: string | null; // Codeshare flight IATA
  status: 'scheduled' | 'cancelled' | 'active' | 'landed';
  duration: number;              // Flight duration in minutes
  aircraft_icao: string | null;  // Aircraft ICAO code
  dep_time_ts: number;           // Departure Unix timestamp
  arr_time_ts: number;           // Arrival Unix timestamp
  dep_estimated_ts: number | null; // Estimated departure timestamp
  arr_estimated_ts: number | null; // Estimated arrival timestamp
  dep_actual_ts: number | null;  // Actual departure timestamp
  arr_actual_ts: number | null;  // Actual arrival timestamp
}

// Pagination response includes additional fields:
interface FlightScheduleResponse {
  success: boolean;
  type: 'departure' | 'arrival';
  data: FlightScheduleData[];
  limit?: number;         // Present when using pagination
  skip?: number;          // Present when using pagination
  total_items?: number;   // Total items available
  has_more?: boolean;     // More pages available
}
```

**Future Flight Response Structure:**

```typescript
interface FutureFlightData {
  sortTime: string;              // ISO 8601 format (e.g., "2025-07-14T05:00:00+00:00")
  departureTime: {
    timeAMPM: string;            // 12-hour format (e.g., "6:00AM")
    time24: string;              // 24-hour format (e.g., "06:00")
  };
  arrivalTime: {
    timeAMPM: string;            // 12-hour format (e.g., "7:40AM")
    time24: string;              // 24-hour format (e.g., "07:40")
  };
  carrier: {
    fs: string;                  // Carrier flight status code
    name: string;                // Carrier name
    flightNumber: string;        // Flight number
  };
  operatedBy: string;            // Operator information
  airport: {
    fs: string;                  // Airport flight status code
    city: string;                // Destination/origin city
  };
}

interface FutureFlightResponse {
  success: boolean;
  data: FutureFlightData[];
}
```

**Delay Response Structure:**

```typescript
interface FlightDelayData {
  airline_iata: string;          // Airline IATA code
  airline_icao: string;          // Airline ICAO code
  flight_iata: string;           // Flight IATA code-number
  flight_icao: string;           // Flight ICAO code-number
  flight_number: string;         // Flight number only
  dep_iata: string;              // Departure airport IATA
  dep_icao: string;              // Departure airport ICAO
  dep_terminal: string | null;   // Departure terminal
  dep_gate: string | null;       // Departure gate
  dep_time: string;              // Scheduled departure (local)
  dep_time_utc: string;          // Scheduled departure (UTC)
  dep_estimated: string | null;  // Estimated departure (local)
  dep_estimated_utc: string | null; // Estimated departure (UTC)
  dep_actual: string | null;     // Actual departure (local)
  dep_actual_utc: string | null; // Actual departure (UTC)
  arr_iata: string;              // Arrival airport IATA
  arr_icao: string;              // Arrival airport ICAO
  arr_terminal: string | null;   // Arrival terminal
  arr_gate: string | null;       // Arrival gate
  arr_baggage: string | null;    // Baggage claim carousel
  arr_time: string;              // Scheduled arrival (local)
  arr_time_utc: string;          // Scheduled arrival (UTC)
  arr_estimated: string | null;  // Estimated arrival (local)
  arr_estimated_utc: string | null; // Estimated arrival (UTC)
  cs_airline_iata: string | null; // Codeshare airline IATA
  cs_flight_number: string | null; // Codeshare flight number
  cs_flight_iata: string | null; // Codeshare flight IATA
  status: 'scheduled' | 'cancelled' | 'active' | 'landed';
  duration: number;              // Flight duration in minutes
  delayed: number;               // Total delay in minutes
  dep_delayed: number | null;    // Departure delay in minutes
  arr_delayed: number | null;    // Arrival delay in minutes
  aircraft_icao: string | null;  // Aircraft ICAO code
  arr_time_ts: number;           // Arrival Unix timestamp
  dep_time_ts: number;           // Departure Unix timestamp
  arr_estimated_ts: number | null; // Estimated arrival timestamp
  dep_estimated_ts: number | null; // Estimated departure timestamp
  dep_actual_ts: number | null;  // Actual departure timestamp
}

interface FlightDelayResponse {
  status: number;
  success: boolean;
  data: FlightDelayData[];
}
```

**Flight By Number Response Structure:**

```typescript
interface FlightByNumberData {
  DATE: string;              // Date in "DD Mon YYYY" format (e.g., "20 Mar 2024")
  FROM: string;              // Departure location with IATA (e.g., "Nador (NDR)")
  TO: string;                // Arrival location with IATA (e.g., "Barcelona (BCN)")
  AIRCRAFT: string;          // Aircraft type/model (e.g., "320")
  'FLIGHT TIME': string;     // Flight duration or "—" if not available
  STD: string;               // Scheduled departure time in HH:mm format
  ATD: string;               // Actual departure time or "—" if not available
  STA: string;               // Scheduled arrival time in HH:mm format
  STATUS: string;            // Flight status (e.g., "Scheduled", "Landed", "Cancelled")
}

interface FlightByNumberResponse {
  success: boolean;
  data: FlightByNumberData[];
}
```

**Flight Prices Response Structure:**

```typescript
interface FlightPriceResponse {
  context: {
    status: string;            // e.g., "complete"
    totalResults: number;      // Total number of results
  };
  itineraries: FlightItinerary[];
}

interface FlightItinerary {
  id: string;                  // Itinerary identifier
  price: {
    raw: number;               // Raw price value
    formatted: string;         // Formatted price (e.g., "$283")
    pricingOptionId: string;   // Pricing option ID
  };
  legs: FlightLeg[];           // Array of flight legs
  isSelfTransfer: boolean;
  isProtectedSelfTransfer: boolean;
  farePolicy: {
    isChangeAllowed: boolean;
    isPartiallyChangeable: boolean;
    isCancellationAllowed: boolean;
    isPartiallyRefundable: boolean;
  };
  eco?: {
    ecoContenderDelta: number; // Eco score delta
  };
  fareAttributes: string[];    // Fare attributes
  tags?: string[];             // Tags like "cheapest"
  isMashUp: boolean;
  hasFlexibleOptions: boolean;
  score: number;               // Itinerary score (0-1)
}

interface FlightLeg {
  id: string;                  // Leg identifier
  origin: {
    id: string;                // Airport IATA code
    name: string;              // Airport full name
    displayCode: string;       // Display code
    city: string;              // City name
    country: string;           // Country name
    isHighlighted: boolean;
  };
  destination: {
    id: string;
    name: string;
    displayCode: string;
    city: string;
    country: string;
    isHighlighted: boolean;
  };
  durationInMinutes: number;   // Total leg duration
  stopCount: number;           // Number of stops
  isSmallestStops: boolean;
  departure: string;           // Departure datetime ISO string
  arrival: string;             // Arrival datetime ISO string
  timeDeltaInDays: number;     // Time difference in days
  carriers: {
    marketing: Array<{
      id: number;
      logoUrl: string;
      name: string;
    }>;
    operationType: string;     // e.g., "fully_operated"
  };
  segments: FlightSegment[];   // Array of segments
}

interface FlightSegment {
  id: string;                  // Segment identifier
  origin: {
    flightPlaceId: string;     // Place ID
    displayCode: string;       // Display code
    parent?: {
      flightPlaceId: string;
      displayCode: string;
      name: string;
      type: 'City' | 'Country';
    };
    name: string;              // Location name
    type: 'Airport' | 'City';  // Location type
    country: string;           // Country name
  };
  destination: {
    // Same structure as origin
  };
  departure: string;           // Departure datetime ISO
  arrival: string;             // Arrival datetime ISO
  durationInMinutes: number;   // Segment duration
  flightNumber: string;        // Flight number
  marketingCarrier: {
    id: number;
    name: string;
    alternateId?: string;
    allianceId?: number;
    displayCode?: string;
  };
  operatingCarrier: {
    // Same structure as marketingCarrier
  };
}
```

**Airport Search Response Structure:**

```typescript
interface AirportSearchResult {
  skyId: string;           // Sky ID (e.g., "NYCA")
  entityId: string;        // Entity ID (e.g., "27537542")
  presentation: {
    title: string;         // Display title (e.g., "New York")
    suggestionTitle: string; // Suggestion (e.g., "New York (Any)")
    subtitle: string;      // Country (e.g., "United States")
  };
  navigation: {
    entityId: string;      // Entity identifier
    entityType: 'CITY' | 'AIRPORT';  // Type of entity
    localizedName: string; // Localized name
    relevantFlightParams: {
      skyId: string;       // Sky ID for flight searches
      entityId: string;    // Entity ID for flight searches
      flightPlaceType: 'CITY' | 'AIRPORT';
      localizedName: string;
    };
    relevantHotelParams: {
      entityId: string;
      entityType: 'CITY' | 'AIRPORT';
      localizedName: string;
    };
  };
}

interface AirportSearchResponse {
  success: boolean;
  data: AirportSearchResult[];
}
```

**Airports By Filter Response Structure:**

```typescript
interface AirportsByFilterQueryParams {
  access_key: string;           // API access key (required)
  iata_code?: string;           // Filter by Airport IATA code (at least one filter required)
  icao_code?: string;           // Filter by Airport ICAO code
  city_code?: string;           // Filter by IATA City code
  country_code?: string;        // Filter by Country ISO 2 code
}

interface AirportFilterData {
  name: string;                 // Public name
  names: {                      // Alternative names in different languages
    [languageCode: string]: string;
  };
  iata_code: string;            // IATA code
  icao_code: string;            // ICAO code
  faa_code: string | null;      // FAA code (US airports)
  un_locode: string | null;     // United Nations location code
  timezone: string;             // Airport location timezone
  lat: number;                  // Geo Latitude
  lng: number;                  // Geo Longitude
  alt: number;                  // Airport Runway Elevation (feet)
  city_code: string;            // Metropolitan 3-letter city code
  city: string;                 // Metropolitan city name
  country_code: string;         // ISO 2 country code
  state: string | null;         // State/Province code
  departures_intl: number;      // International departures per year
  departures_dom: number;       // Domestic departures per year
  connections_intl: number;     // International connections
  connections_dom: number;      // Domestic connections
  is_major: 0 | 1;              // Major airport in metropolitan area
  is_international: 0 | 1;      // Provides international flights
  runways: number;              // Total airport runways
  connections: number;          // Total connections with other airports
  departures: number;           // Total departures per year
  website: string | null;       // Airport official website
  twitter: string | null;       // Airport official Twitter account
  facebook: string | null;      // Airport official Facebook page
  instagram: string | null;     // Airport official Instagram profile
  linkedin: string | null;      // Airport official LinkedIn profile
  youtube: string | null;       // Airport official YouTube channel
  phone: string | null;         // Phone number
  phone_formatted: string | null; // Formatted phone number
  email: string | null;         // Contact email
  postal_code: string | null;   // Postal code
  with_schedules: 0 | 1;        // Has scheduled flights
  type: 'airport' | 'heliport' | 'closed'; // Airport type
  fir_code: string | null;      // Flight Information Region code
  fir_name: string | null;      // Flight Information Region name
  size: 'small' | 'medium' | 'large'; // Airport size
  status: 'active' | 'inactive' | 'closed'; // Airport status
  popularity: number;           // Popularity score
}

interface AirportsByFilterResponse {
  success: boolean;
  data: AirportFilterData[];
}
```

**Airlines Query Parameters:**

```typescript
interface AirlineQueryParams {
  access_key: string;              // API access key (required)
  codeIataAirline?: string;        // Filter by IATA airline code
  codeIso2Country?: string;        // Filter by country ISO 2 code
}
```

**Airlines Response Structure:**

```typescript
interface AirlineData {
  name: string;                    // Name of the airline
  slug: string;                    // URL-friendly slug
  country_code: string;            // Country code of the airline
  iata_code: string;               // IATA code of the airline
  iata_prefix: number;             // IATA prefix
  iata_accounting: number;         // IATA accounting code
  icao_code: string;               // ICAO code of the airline
  callsign: string;                // Callsign of the airline
  is_international: 0 | 1;         // Indicates if the airline is international
  iosa_registered: 0 | 1;          // Indicates if the airline is registered with IOSA
  iosa_expiry: string | null;      // Expiry date of IOSA registration (ISO format)
  is_passenger: 0 | 1;             // Indicates if the airline operates passenger flights
  is_cargo: 0 | 1;                 // Indicates if the airline operates cargo flights
  is_scheduled: 0 | 1;             // Indicates if the airline operates scheduled flights
  total_aircrafts: number;         // Total number of aircraft operated by the airline
  average_fleet_age: number;       // Average age of the fleet in years
  accidents_last_5y: number;       // Number of accidents in the last 5 years
  crashes_last_5y: number;         // Number of crashes in the last 5 years
  website: string | null;          // Website of the airline
  twitter: string | null;          // Twitter handle of the airline
  facebook: string | null;         // Facebook page of the airline
  instagram: string | null;        // Instagram handle of the airline
  linkedin: string | null;         // LinkedIn page of the airline
}

interface AirlineResponse {
  success: boolean;
  data: AirlineData[];
}
```

**Routes Query Parameters:**

```typescript
interface RouteQueryParams {
  access_key: string;            // API access key (required)
  dep_iata?: string;             // Departure airport IATA code filter
  dep_icao?: string;             // Departure airport ICAO code filter
  arr_iata?: string;             // Arrival airport IATA code filter
  arr_icao?: string;             // Arrival airport ICAO code filter
  airline_icao?: string;         // Airline ICAO code filter
  airline_iata?: string;         // Airline IATA code filter
  flight_icao?: string;          // Flight ICAO code-number filter
  flight_iata?: string;          // Flight IATA code-number filter
  flight_number?: string;        // Flight number filter only
  _fields?: string;              // Fields to return (comma-separated)
  limit?: number;                // Maximum number of rows (max: 500)
  offset?: number;               // Pagination offset (0+ until has_more is false)
}
```

**Routes Response Structure:**

```typescript
interface RouteData {
  airline_iata: string;          // Airline IATA code
  airline_icao: string;          // Airline ICAO code
  flight_number: string;         // Flight number only
  flight_iata: string;           // Flight IATA code-number
  flight_icao: string;           // Flight ICAO code-number
  cs_airline_iata: string | null; // Codeshared airline IATA code
  cs_flight_iata: string | null;  // Codeshared flight IATA code-number
  cs_flight_number: string | null; // Codeshared flight number
  dep_iata: string;              // Departure airport IATA code
  dep_icao: string;              // Departure airport ICAO code
  dep_terminals: string[] | null; // Estimated departure terminals
  dep_time: string;              // Departure time in airport timezone (HH:mm)
  dep_time_utc: string;          // Departure time in UTC (HH:mm)
  arr_iata: string;              // Arrival airport IATA code
  arr_icao: string;              // Arrival airport ICAO code
  arr_terminals: string[] | null; // Estimated arrival terminals
  arr_time: string;              // Arrival time in airport timezone (HH:mm)
  arr_time_utc: string;          // Arrival time in UTC (HH:mm)
  duration: number;              // Flight duration in minutes
  aircraft_icao: string | null;  // Aircraft ICAO code
  counter: number;               // Route frequency counter
  updated: string;               // Last updated timestamp (ISO format)
  days: string[];                // Operating days (e.g., ["mon", "tue", "wed"])
}

interface RouteResponse {
  success: boolean;
  data: RouteData[];
  request?: {                   // Present when using pagination
    limit: number;
    offset: number;
    has_more: boolean;
  };
}
```

**Countries Response Structure:**

```typescript
interface CountryData {
  country: string;              // Country name (e.g., "United States")
  countryCode: string;          // ISO 2 country code (e.g., "US")
  market: string;               // Default market locale (e.g., "en-US")
  currencyTitle: string;        // Full currency name (e.g., "United States Dollar")
  currency: string;             // Currency code (e.g., "USD")
  currencySymbol: string;       // Currency symbol (e.g., "$")
}

interface CountriesResponse {
  success: boolean;
  data: CountryData[];
}
```

**Country Details Response Structure:**

```typescript
interface CountryDetailedData {
  country_code: string;         // ISO 2 country code
  code3: string;                // ISO 3 country code
  name: string;                 // Country name
  population: number;           // Population count
  continent: string;            // Continent code (e.g., "NA" for North America)
  currency: string;             // Currency code
  names: CountryNames;          // Country names in different languages
}

interface CountryByCodeResponse {
  success: boolean;
  data: CountryDetailedData[];
}
```

## Error Handling

```typescript
import { FlightLabsApiError } from './utils/flightlabs';

try {
  const flights = await service.getFlights({ airlineIata: 'AA' });
} catch (error) {
  if (error instanceof FlightLabsApiError) {
    console.error('API Error:', error.message);
    console.error('Error Code:', error.code);
    console.error('Error Type:', error.type);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Cache Management

```typescript
// Get cache statistics
const stats = service.getCacheStats();
console.log(`Cache entries: ${stats.size}/${stats.maxSize}`);

// Clear specific cache entry
service.clearCache({ airlineIata: 'AA' });

// Clear all cache
service.clearCache();

// Cleanup expired entries
const removed = cache.cleanup();
```

## Best Practices

1. **Use the service layer** for most use cases - it includes caching and convenience methods
2. **Enable caching** to reduce API calls and improve performance
3. **Handle errors properly** - check for FlightLabsApiError type
4. **Clean up resources** - call `service.destroy()` when done
5. **Respect rate limits** - use caching and limit concurrent requests
6. **Filter server-side** - use query parameters instead of filtering results client-side

## Examples

See `examples/flightlabs-usage.ts` for comprehensive usage examples including:

- Getting flights by airline
- Tracking specific flights
- Airport activity monitoring
- Geographic area searches
- Airline fleet status
- Advanced search queries
- Cache utilization
- Flight progress calculations
- **Call sign tracking** (Examples 9-12)
- **Emergency flight monitoring**
- **Endpoint comparison**
- **Historical data analysis** (Example 13)
- **Flight schedules** (Example 14)
- **Future flight predictions** (Example 15)
- **Flight delay monitoring** (Example 16)
- **Flight by number tracking** (Example 17)

Additional example files:

- `examples/callsign-examples.ts` - Detailed call sign endpoint examples
- `examples/flights-by-airline-examples.ts` - Airline fleet tracking and operations analysis
- `examples/historical-examples.ts` - Historical flight data analysis examples
- `examples/schedule-examples.ts` - Flight schedule endpoint examples with pagination
- `examples/future-flights-examples.ts` - Future flight predictions and analysis
- `examples/delay-examples.ts` - Flight delay analysis and monitoring examples
- `examples/flight-by-number-examples.ts` - Flight by number endpoint examples
- `examples/flightPricesExample.ts` - Flight prices search and analysis examples
- `examples/airportSearchExample.ts` - Airport search and Sky ID/Entity ID retrieval examples
- `examples/example-airports-filter.ts` - Comprehensive airport filter endpoint examples with detailed analytics
- `examples/city-examples.ts` - City information retrieval by IATA code with population, timezone, and language data
- `examples/example-countries.ts` - Countries API endpoint examples with currency zones and regional analysis
- `examples/country-details-example.ts` - Country details by code endpoint examples
- `examples/airline-examples.ts` - Comprehensive airline API examples including safety analysis and comparisons
- `examples/route-examples.ts` - Comprehensive route endpoint examples including connections, competition analysis, and network coverage

## License

This utility is part of the RouteMatrix project.