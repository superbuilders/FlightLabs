/**
 * FlightLabs API Types
 * Type definitions for real-time flight data API
 */

/**
 * Base query parameters that must include access_key
 */
export interface BaseFlightQueryParams {
  access_key: string;
  limit?: number; // Max 10000
}

/**
 * Flight query parameters for the real-time flights endpoint
 */
export interface FlightQueryParams extends BaseFlightQueryParams {
  flightIata?: string;
  flightIcao?: string;
  flightNum?: string;
  airlineIata?: string;
  airlineIcao?: string;
  depIata?: string;
  depIcao?: string;
  arrIata?: string;
  arrIcao?: string;
  regNum?: string;
  hex?: string;
}

/**
 * Individual flight data object in the API response
 */
export interface FlightData {
  hex: string;              // ICAO24 Hex address
  reg_number: string;       // Aircraft Registration Number
  flag: string;             // ISO 2 country code
  lat: number;              // Aircraft Geo-Latitude
  lng: number;              // Aircraft Geo-Longitude
  alt: number;              // Aircraft elevation (meters)
  dir: number;              // Aircraft head direction
  speed: number;            // Aircraft horizontal speed (km)
  v_speed: number;          // Aircraft vertical speed (km)
  squawk?: string;          // Aircraft squawk signal code
  airline_icao: string;     // Airline ICAO code
  airline_iata: string;     // Airline IATA code
  aircraft_icao: string;    // Aircraft ICAO type
  flight_icao: string;      // Flight ICAO code-number
  flight_iata: string;      // Flight IATA code-number
  flight_number: string;    // Flight number only
  dep_icao: string;         // Departure Airport ICAO code
  dep_iata: string;         // Departure Airport IATA code
  arr_icao: string;         // Arrival Airport ICAO code
  arr_iata: string;         // Arrival Airport IATA code
  updated: number;          // UNIX timestamp of last aircraft signal
  status: FlightStatus;     // Current flight status
  type: SignalType;         // Type of aircraft signal
}

/**
 * Flight status enum
 */
export enum FlightStatus {
  SCHEDULED = 'scheduled',
  EN_ROUTE = 'en-route',
  LANDED = 'landed'
}

/**
 * Signal type enum
 */
export enum SignalType {
  ADSB = 'adsb',
  MODE_S = 'mode-s'
}

/**
 * API response structure
 */
export interface FlightLabsResponse {
  success: boolean;
  data: FlightData[];
}

/**
 * Error response structure
 */
export interface FlightLabsError {
  success: false;
  error: {
    code: number;
    type: string;
    info: string;
  };
}

/**
 * Type guard to check if response is an error
 */
export function isFlightLabsError(response: any): response is FlightLabsError {
  return response && response.success === false && 'error' in response;
}

/**
 * Query parameters for flights-with-call-sign endpoint
 */
export interface CallSignQueryParams extends BaseFlightQueryParams {
  callsign?: string;
  airline_icao?: string;
}

/**
 * Query parameters for flights-by-airline endpoint
 */
export interface FlightsByAirlineQueryParams extends BaseFlightQueryParams {
  airline_icao: string;  // Airline ICAO code (required)
}

/**
 * Flight data from the call sign endpoint
 */
export interface CallSignFlightData {
  id: string;                        // Unique ID for the flight
  icao_24bit: string;                // Unique 24-bit identifier of the aircraft
  latitude: number;                  // Latitude position
  longitude: number;                 // Longitude position
  heading: number;                   // Direction heading
  altitude: number;                  // Distance to ground in meters
  ground_speed: number;              // Ground speed in knots
  squawk: string;                    // Squawk code
  aircraft_code: string;             // Aircraft code
  registration: string;              // Aircraft registration
  time: number;                      // UNIX timestamp
  origin_airport_iata: string;       // Departure airport IATA
  destination_airport_iata: string;  // Arrival airport IATA
  number: string;                    // Flight number
  airline_iata: string;              // Airline IATA code
  on_ground: number;                 // 0 if flying, 1 if on ground
  vertical_speed: number;            // Vertical speed in knots
  callsign: string;                  // Flight callsign
  airline_icao: string;              // Airline ICAO code
}

/**
 * Response structure for call sign endpoint
 */
export interface CallSignFlightResponse {
  success: boolean;
  data: CallSignFlightData[];
}

/**
 * Response structure for flights-by-airline endpoint (same as call sign response)
 */
export type FlightsByAirlineResponse = CallSignFlightResponse;

/**
 * Type guard to check if flight is on ground
 */
export function isOnGround(flight: CallSignFlightData): boolean {
  return flight.on_ground === 1;
}

/**
 * Query parameters for historical flights endpoint
 */
export interface HistoricalFlightQueryParams {
  code: string;           // Airport IATA code (required)
  type: 'departure' | 'arrival';  // Query type (required)
  date_from?: string;     // Start date/time (YYYY-MM-DDTHH:MM)
  date_to?: string;       // End date/time (YYYY-MM-DDTHH:MM)
  date?: string;          // Specific date (YYYY-MM-DD) - overrides date_from/date_to
  dep_iataCode?: string;  // Filter by departure airport (when type=arrival)
  arr_iataCode?: string;  // Filter by arrival airport (when type=departure)
  airline_iata?: string;  // Filter by airline IATA code
  flight_num?: string;    // Filter by flight number
  limit?: number;         // Max results
}

/**
 * Historical flight data structure
 */
export interface HistoricalFlightData {
  movement: {
    airport: {
      name: string;
    };
    scheduledTime: {
      utc: string;
      local: string;
    };
    terminal?: string;
    quality: string[];
  };
  number: string;
  status: string;
  codeshareStatus: string;
  isCargo: boolean;
  aircraft: {
    model: string;
  };
  airline: {
    name: string;
    iata: string;
    icao: string;
  };
}

/**
 * Response structure for historical flights endpoint
 */
export interface HistoricalFlightResponse {
  status: number;
  success: boolean;
  data: HistoricalFlightData[];
}

/**
 * Type guard to check if response is historical flight response
 */
export function isHistoricalFlightResponse(response: any): response is HistoricalFlightResponse {
  return response && 
         typeof response.status === 'number' && 
         typeof response.success === 'boolean' && 
         Array.isArray(response.data);
}

/**
 * Query parameters for flight schedules endpoint
 */
export interface FlightScheduleQueryParams {
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

/**
 * Flight schedule data structure
 */
export interface FlightScheduleData {
  airline_iata: string;
  airline_icao: string;
  flight_iata: string;
  flight_icao: string;
  flight_number: string;
  dep_iata: string;
  dep_icao: string;
  dep_terminal: string | null;
  dep_gate: string | null;
  dep_time: string;
  dep_time_utc: string;
  dep_estimated: string | null;
  dep_estimated_utc: string | null;
  dep_actual: string | null;
  dep_actual_utc: string | null;
  arr_iata: string;
  arr_icao: string;
  arr_terminal: string | null;
  arr_gate: string | null;
  arr_baggage: string | null;
  arr_time: string;
  arr_time_utc: string;
  arr_estimated: string | null;
  arr_estimated_utc: string | null;
  arr_actual: string | null;
  arr_actual_utc: string | null;
  cs_airline_iata: string | null;
  cs_flight_number: string | null;
  cs_flight_iata: string | null;
  status: 'scheduled' | 'cancelled' | 'active' | 'landed';
  duration: number;              // In minutes
  delayed: number | null;        // Deprecated
  dep_delayed: number | null;    // Departure delay in minutes
  arr_delayed: number | null;    // Arrival delay in minutes
  aircraft_icao: string | null;
  arr_time_ts: number;
  dep_time_ts: number;
  arr_estimated_ts: number | null;
  dep_estimated_ts: number | null;
  arr_actual_ts: number | null;
  dep_actual_ts: number | null;
}

/**
 * Response structure for flight schedules endpoint
 */
export interface FlightScheduleResponse {
  success: boolean;
  type: 'departure' | 'arrival';
  data: FlightScheduleData[];
  limit?: number;         // Present when using pagination
  skip?: number;          // Present when using pagination
  total_items?: number;   // Present when using pagination
  has_more?: boolean;     // Present when using pagination
}

/**
 * Type guard to check if response has pagination info
 */
export function hasPaginationInfo(response: FlightScheduleResponse): response is FlightScheduleResponse & {
  limit: number;
  skip: number;
  total_items: number;
  has_more: boolean;
} {
  return response && 
         typeof response.limit === 'number' && 
         typeof response.skip === 'number' &&
         typeof response.total_items === 'number' &&
         typeof response.has_more === 'boolean';
}

/**
 * Query parameters for future flights endpoint
 */
export interface FutureFlightQueryParams {
  iataCode: string;              // Airport IATA code (required)
  type: 'departure' | 'arrival'; // Query type (required)
  date: string;                  // Future date in YYYY-MM-DD format (required)
  limit?: number;                // Max results
}

/**
 * Future flight data structure
 */
export interface FutureFlightData {
  sortTime: string;              // ISO 8601 format sorting time
  departureTime: {
    timeAMPM: string;            // 12-hour format (e.g., "6:00AM")
    time24: string;              // 24-hour format (e.g., "06:00")
  };
  arrivalTime: {
    timeAMPM: string;            // 12-hour format (e.g., "7:40AM")
    time24: string;              // 24-hour format (e.g., "07:40")
  };
  carrier: {
    fs: string;                  // Flight status code
    name: string;                // Carrier name
    flightNumber: string;        // Flight number
  };
  operatedBy: string;            // Operator information
  airport: {
    fs: string;                  // Airport flight status code
    city: string;                // Airport city
  };
}

/**
 * Response structure for future flights endpoint
 */
export interface FutureFlightResponse {
  success: boolean;
  data: FutureFlightData[];
}

/**
 * Query parameters for flight delays endpoint
 */
export interface FlightDelayQueryParams {
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

/**
 * Flight delay data structure
 */
export interface FlightDelayData {
  airline_iata: string;
  airline_icao: string;
  flight_iata: string;
  flight_icao: string;
  flight_number: string;
  dep_iata: string;
  dep_icao: string;
  dep_terminal: string | null;
  dep_gate: string | null;
  dep_time: string;
  dep_time_utc: string;
  dep_estimated: string | null;
  dep_estimated_utc: string | null;
  dep_actual: string | null;
  dep_actual_utc: string | null;
  arr_iata: string;
  arr_icao: string;
  arr_terminal: string | null;
  arr_gate: string | null;
  arr_baggage: string | null;
  arr_time: string;
  arr_time_utc: string;
  arr_estimated: string | null;
  arr_estimated_utc: string | null;
  cs_airline_iata: string | null;
  cs_flight_number: string | null;
  cs_flight_iata: string | null;
  status: 'scheduled' | 'cancelled' | 'active' | 'landed';
  duration: number;              // Flight duration in minutes
  delayed: number;               // Total delay in minutes
  dep_delayed: number | null;    // Departure delay in minutes
  arr_delayed: number | null;    // Arrival delay in minutes
  aircraft_icao: string | null;
  arr_time_ts: number;
  dep_time_ts: number;
  arr_estimated_ts: number | null;
  dep_estimated_ts: number | null;
  dep_actual_ts: number | null;
}

/**
 * Response structure for flight delays endpoint
 */
export interface FlightDelayResponse {
  status: number;
  success: boolean;
  data: FlightDelayData[];
}

/**
 * Query parameters for flight by number endpoint
 */
export interface FlightByNumberQueryParams {
  access_key: string;        // API access key (required)
  flight_number: string;     // Flight number (required, e.g., "3o375")
  date?: string;             // Date in YYYY-MM-DD format (optional)
}

/**
 * Flight by number data structure
 */
export interface FlightByNumberData {
  DATE: string;              // Date in "DD Mon YYYY" format (e.g., "20 Mar 2024")
  FROM: string;              // Departure location with IATA code (e.g., "Nador (NDR)")
  TO: string;                // Arrival location with IATA code (e.g., "Barcelona (BCN)")
  AIRCRAFT: string;          // Aircraft type/model (e.g., "320")
  'FLIGHT TIME': string;     // Flight duration or "—" if not available
  STD: string;               // Scheduled departure time in HH:mm format
  ATD: string;               // Actual departure time or "—" if not available
  STA: string;               // Scheduled arrival time in HH:mm format
  STATUS: string;            // Flight status (e.g., "Scheduled", "Landed", "Cancelled")
}

/**
 * Response structure for flight by number endpoint
 */
export interface FlightByNumberResponse {
  success: boolean;
  data: FlightByNumberData[];
}

/**
 * Type guard to check if flight time is available
 */
export function hasFlightTime(flight: FlightByNumberData): boolean {
  return flight['FLIGHT TIME'] !== '—' && flight['FLIGHT TIME'] !== '';
}

/**
 * Type guard to check if actual departure time is available
 */
export function hasActualDepartureTime(flight: FlightByNumberData): boolean {
  return flight.ATD !== '—' && flight.ATD !== '';
}

/**
 * Query parameters for retrieveFlights (flight prices) endpoint
 */
export interface FlightPriceQueryParams {
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

/**
 * Flight price object structure
 */
export interface FlightPrice {
  raw: number;                  // Raw price value
  formatted: string;            // Formatted price string (e.g., "$283")
  pricingOptionId: string;      // Unique pricing option identifier
}

/**
 * Airport location structure
 */
export interface FlightAirport {
  id: string;                   // Airport IATA code
  name: string;                 // Airport full name
  displayCode: string;          // Display code (usually IATA)
  city: string;                 // City name
  country: string;              // Country name
  isHighlighted: boolean;       // Whether airport is highlighted
}

/**
 * Flight location with parent info
 */
export interface FlightLocation {
  flightPlaceId: string;        // Place identifier (airport or city code)
  displayCode: string;          // Display code
  parent?: {
    flightPlaceId: string;      // Parent place ID (e.g., city for airport)
    displayCode: string;        // Parent display code
    name: string;               // Parent name
    type: 'City' | 'Country';   // Parent type
  };
  name: string;                 // Location name
  type: 'Airport' | 'City';     // Location type
  country: string;              // Country name
}

/**
 * Carrier (airline) information
 */
export interface CarrierInfo {
  id: number;                   // Carrier ID
  name: string;                 // Carrier full name
  alternateId?: string;         // Alternate identifier
  allianceId?: number;          // Alliance ID
  displayCode?: string;         // Display code
  logoUrl?: string;             // Logo URL (for marketing carriers)
}

/**
 * Flight segment structure
 */
export interface FlightSegment {
  id: string;                   // Segment identifier
  origin: FlightLocation;       // Origin location details
  destination: FlightLocation;  // Destination location details
  departure: string;            // Departure datetime ISO string
  arrival: string;              // Arrival datetime ISO string
  durationInMinutes: number;    // Segment duration in minutes
  flightNumber: string;         // Flight number
  marketingCarrier: CarrierInfo; // Marketing carrier details
  operatingCarrier: CarrierInfo; // Operating carrier details
}

/**
 * Flight carriers structure
 */
export interface FlightCarriers {
  marketing: Array<{
    id: number;
    logoUrl: string;
    name: string;
  }>;
  operationType: string;        // e.g., "fully_operated"
}

/**
 * Flight leg structure
 */
export interface FlightLeg {
  id: string;                   // Leg identifier
  origin: FlightAirport;        // Origin airport details
  destination: FlightAirport;   // Destination airport details
  durationInMinutes: number;    // Total leg duration in minutes
  stopCount: number;            // Number of stops
  isSmallestStops: boolean;     // Whether this has the smallest stops
  departure: string;            // Departure datetime ISO string
  arrival: string;              // Arrival datetime ISO string
  timeDeltaInDays: number;      // Time difference in days
  carriers: FlightCarriers;     // Carrier information
  segments: FlightSegment[];    // Array of segments in this leg
}

/**
 * Fare policy structure
 */
export interface FarePolicy {
  isChangeAllowed: boolean;
  isPartiallyChangeable: boolean;
  isCancellationAllowed: boolean;
  isPartiallyRefundable: boolean;
}

/**
 * Flight itinerary structure
 */
export interface FlightItinerary {
  id: string;                   // Itinerary identifier
  price: FlightPrice;           // Price information
  legs: FlightLeg[];            // Array of flight legs
  isSelfTransfer: boolean;
  isProtectedSelfTransfer: boolean;
  farePolicy: FarePolicy;       // Fare rules
  eco?: {
    ecoContenderDelta: number;  // Eco score delta
  };
  fareAttributes: string[];     // Array of fare attributes
  tags?: string[];              // Tags like "cheapest"
  isMashUp: boolean;
  hasFlexibleOptions: boolean;
  score: number;                // Itinerary score (0-1)
}

/**
 * Context information in the response
 */
export interface FlightPriceContext {
  status: string;               // e.g., "complete"
  totalResults: number;         // Total number of results
}

/**
 * Response structure for retrieveFlights endpoint
 */
export interface FlightPriceResponse {
  context: FlightPriceContext;
  itineraries: FlightItinerary[];
}

/**
 * Type guard to check if itinerary is direct (no stops)
 */
export function isDirectFlight(leg: FlightLeg): boolean {
  return leg.stopCount === 0;
}

/**
 * Type guard to check if itinerary is roundtrip
 */
export function isRoundTrip(itinerary: FlightItinerary): boolean {
  return itinerary.legs.length > 1;
}

/**
 * Helper to check if itinerary has a specific tag
 */
export function hasTag(itinerary: FlightItinerary, tag: string): boolean {
  return itinerary.tags?.includes(tag) || false;
}

/**
 * Query parameters for retrieveAirport endpoint
 */
export interface AirportSearchQueryParams {
  access_key: string;      // API access key (required)
  query: string;           // Location name to search for (required)
}

/**
 * Airport search result presentation data
 */
export interface AirportPresentation {
  title: string;           // Main display title (e.g., "New York")
  suggestionTitle: string; // Suggestion display (e.g., "New York (Any)")
  subtitle: string;        // Additional info (e.g., "United States")
}

/**
 * Relevant parameters for flight searches
 */
export interface RelevantFlightParams {
  skyId: string;           // Sky ID for flight searches
  entityId: string;        // Entity ID for flight searches
  flightPlaceType: 'CITY' | 'AIRPORT';  // Type of place
  localizedName: string;   // Localized name
}

/**
 * Relevant parameters for hotel searches
 */
export interface RelevantHotelParams {
  entityId: string;        // Entity ID for hotel searches
  entityType: 'CITY' | 'AIRPORT';  // Type of entity
  localizedName: string;   // Localized name
}

/**
 * Navigation data for search results
 */
export interface AirportNavigation {
  entityId: string;        // Entity identifier
  entityType: 'CITY' | 'AIRPORT';  // Type of entity
  localizedName: string;   // Localized name
  relevantFlightParams: RelevantFlightParams;
  relevantHotelParams: RelevantHotelParams;
}

/**
 * Airport search result structure
 */
export interface AirportSearchResult {
  skyId: string;           // Sky ID (e.g., "NYCA")
  entityId: string;        // Entity ID (e.g., "27537542")
  presentation: AirportPresentation;
  navigation: AirportNavigation;
}

/**
 * Response structure for retrieveAirport endpoint
 */
export interface AirportSearchResponse {
  success: boolean;
  data: AirportSearchResult[];
}

/**
 * Type guard to check if result is an airport
 */
export function isAirport(result: AirportSearchResult): boolean {
  return result.navigation.entityType === 'AIRPORT';
}

/**
 * Type guard to check if result is a city
 */
export function isCity(result: AirportSearchResult): boolean {
  return result.navigation.entityType === 'CITY';
}

/**
 * Query parameters for airports by filter endpoint
 */
export interface AirportsByFilterQueryParams {
  access_key: string;           // API access key (required)
  iata_code?: string;           // Filter by Airport IATA code (at least one filter required)
  icao_code?: string;           // Filter by Airport ICAO code
  city_code?: string;           // Filter by IATA City code
  country_code?: string;        // Filter by Country ISO 2 code
}

/**
 * Airport names in different languages
 */
export interface AirportNames {
  uk?: string;                  // Ukrainian
  cs?: string;                  // Czech
  pnb?: string;                 // Punjabi
  es?: string;                  // Spanish
  fr?: string;                  // French
  sv?: string;                  // Swedish
  ko?: string;                  // Korean
  th?: string;                  // Thai
  hu?: string;                  // Hungarian
  da?: string;                  // Danish
  ja?: string;                  // Japanese
  ru?: string;                  // Russian
  fa?: string;                  // Persian
  el?: string;                  // Greek
  sc?: string;                  // Sardinian
  id?: string;                  // Indonesian
  zh?: string;                  // Chinese
  no?: string;                  // Norwegian
  az?: string;                  // Azerbaijani
  lv?: string;                  // Latvian
  fi?: string;                  // Finnish
  nl?: string;                  // Dutch
  pl?: string;                  // Polish
  tl?: string;                  // Tagalog
  ar?: string;                  // Arabic
  hak?: string;                 // Hakka
  tt?: string;                  // Tatar
  de?: string;                  // German
  it?: string;                  // Italian
  pt?: string;                  // Portuguese
  en?: string;                  // English
  he?: string;                  // Hebrew
  hi?: string;                  // Hindi
  hr?: string;                  // Croatian
  hy?: string;                  // Armenian
  jp?: string;                  // Japanese (alternative)
  ro?: string;                  // Romanian
  sk?: string;                  // Slovak
  sr?: string;                  // Serbian
  sl?: string;                  // Slovenian
  tr?: string;                  // Turkish
  vi?: string;                  // Vietnamese
  ka?: string;                  // Georgian
  ms?: string;                  // Malay
  [key: string]: string | undefined;  // Allow other language codes
}

/**
 * Airport filter result data structure
 */
export interface AirportFilterData {
  name: string;                 // Public name
  names: AirportNames;          // Alternative names in different languages
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
  is_major: 0 | 1;              // Major airport in metropolitan area (1=yes, 0=no)
  is_international: 0 | 1;      // Provides international flights (1=yes, 0=no)
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
  with_schedules: 0 | 1;        // Has scheduled flights (1=yes, 0=no)
  type: 'airport' | 'heliport' | 'closed'; // Airport type
  fir_code: string | null;      // Flight Information Region code
  fir_name: string | null;      // Flight Information Region name
  size: 'small' | 'medium' | 'large'; // Airport size
  status: 'active' | 'inactive' | 'closed'; // Airport status
  popularity: number;           // Popularity score
}

/**
 * Response structure for airports by filter endpoint
 */
export interface AirportsByFilterResponse {
  success: boolean;
  data: AirportFilterData[];
}

/**
 * Type guard to check if airport is major
 */
export function isMajorAirport(airport: AirportFilterData): boolean {
  return airport.is_major === 1;
}

/**
 * Type guard to check if airport is international
 */
export function isInternationalAirport(airport: AirportFilterData): boolean {
  return airport.is_international === 1;
}

/**
 * Type guard to check if airport has schedules
 */
export function hasSchedules(airport: AirportFilterData): boolean {
  return airport.with_schedules === 1;
}

/**
 * Type guard to check if airport is active
 */
export function isActiveAirport(airport: AirportFilterData): boolean {
  return airport.status === 'active' && airport.type === 'airport';
}

/**
 * Helper to get airport name in specific language
 */
export function getAirportNameInLanguage(airport: AirportFilterData, languageCode: string): string {
  return airport.names[languageCode] || airport.name;
}

/**
 * Country names in different languages
 */
export interface CountryNames {
  hu?: string;                  // Hungarian
  bg?: string;                  // Bulgarian
  is?: string;                  // Icelandic
  de?: string;                  // German
  ku?: string;                  // Kurdish
  eo?: string;                  // Esperanto
  lt?: string;                  // Lithuanian
  ga?: string;                  // Irish
  af?: string;                  // Afrikaans
  tr?: string;                  // Turkish
  hi?: string;                  // Hindi
  nn?: string;                  // Norwegian Nynorsk
  id?: string;                  // Indonesian
  cy?: string;                  // Welsh
  pl?: string;                  // Polish
  ka?: string;                  // Georgian
  ru?: string;                  // Russian
  sl?: string;                  // Slovenian
  eu?: string;                  // Basque
  sv?: string;                  // Swedish
  ms?: string;                  // Malay
  ar?: string;                  // Arabic
  uz?: string;                  // Uzbek
  hy?: string;                  // Armenian
  ca?: string;                  // Catalan
  om?: string;                  // Oromo
  it?: string;                  // Italian
  dz?: string;                  // Dzongkha
  sq?: string;                  // Albanian
  fi?: string;                  // Finnish
  uk?: string;                  // Ukrainian
  nb?: string;                  // Norwegian Bokmål
  hr?: string;                  // Croatian
  be?: string;                  // Belarusian
  zh?: string;                  // Chinese
  no?: string;                  // Norwegian
  da?: string;                  // Danish
  pt?: string;                  // Portuguese
  ko?: string;                  // Korean
  en?: string;                  // English
  lo?: string;                  // Lao
  fa?: string;                  // Persian
  aa?: string;                  // Afar
  mt?: string;                  // Maltese
  he?: string;                  // Hebrew
  bn?: string;                  // Bengali
  vi?: string;                  // Vietnamese
  nl?: string;                  // Dutch
  cs?: string;                  // Czech
  ja?: string;                  // Japanese
  km?: string;                  // Khmer
  ro?: string;                  // Romanian
  et?: string;                  // Estonian
  sk?: string;                  // Slovak
  sr?: string;                  // Serbian
  lv?: string;                  // Latvian
  fo?: string;                  // Faroese
  th?: string;                  // Thai
  am?: string;                  // Amharic
  ur?: string;                  // Urdu
  nd?: string;                  // Ndebele
  bs?: string;                  // Bosnian
  zu?: string;                  // Zulu
  oc?: string;                  // Occitan
  kk?: string;                  // Kazakh
  rm?: string;                  // Romansh
  sg?: string;                  // Sango
  so?: string;                  // Somali
  ff?: string;                  // Fulah
  ta?: string;                  // Tamil
  ml?: string;                  // Malayalam
  my?: string;                  // Burmese
  az?: string;                  // Azerbaijani
  bo?: string;                  // Tibetan
  yo?: string;                  // Yoruba
  kn?: string;                  // Kannada
  el?: string;                  // Greek
  ln?: string;                  // Lingala
  mg?: string;                  // Malagasy
  fr?: string;                  // French
  ti?: string;                  // Tigrinya
  ha?: string;                  // Hausa
  ne?: string;                  // Nepali
  bm?: string;                  // Bambara
  kl?: string;                  // Kalaallisut
  rn?: string;                  // Rundi
  kw?: string;                  // Cornish
  es?: string;                  // Spanish
  si?: string;                  // Sinhala
  lu?: string;                  // Luba-Katanga
  te?: string;                  // Telugu
  mn?: string;                  // Mongolian
  gl?: string;                  // Galician
  ak?: string;                  // Akan
  br?: string;                  // Breton
  ii?: string;                  // Sichuan Yi
  ki?: string;                  // Kikuyu
  se?: string;                  // Northern Sami
  sn?: string;                  // Shona
  sw?: string;                  // Swahili
  mk?: string;                  // Macedonian
  fy?: string;                  // Western Frisian
  to?: string;                  // Tongan
  as?: string;                  // Assamese
  ia?: string;                  // Interlingua
  or?: string;                  // Odia
  ee?: string;                  // Ewe
  lg?: string;                  // Ganda
  mr?: string;                  // Marathi
  gu?: string;                  // Gujarati
  [key: string]: string | undefined;  // Allow other language codes
}

/**
 * Detailed country data from countries endpoint
 */
export interface CountryDetailedData {
  country_code: string;         // ISO 2 country code (e.g., "US")
  code3: string;                // ISO 3 country code (e.g., "USA")
  name: string;                 // Country name (e.g., "United States")
  population: number;           // Population count
  continent: string;            // Continent code (e.g., "NA" for North America)
  currency: string;             // Currency code (e.g., "USD")
  names: CountryNames;          // Country names in different languages
}

/**
 * Query parameters for countries endpoint
 */
export interface CountryByCodeQueryParams {
  access_key: string;           // API access key (required)
  codeIso2Country: string;      // ISO 2 country code (required)
}

/**
 * Response structure for countries by code endpoint
 */
export interface CountryByCodeResponse {
  success?: boolean;
  data?: CountryDetailedData[];
}

/**
 * Type guard to check if response contains detailed country data
 */
export function isCountryDetailedData(data: any): data is CountryDetailedData {
  return data && 
         typeof data.country_code === 'string' &&
         typeof data.code3 === 'string' &&
         typeof data.name === 'string' &&
         typeof data.population === 'number' &&
         typeof data.continent === 'string' &&
         typeof data.currency === 'string' &&
         typeof data.names === 'object';
}

/**
 * Country data structure from retrieveCountries endpoint
 */
export interface CountryData {
  country: string;              // Country name (e.g., "United States")
  countryCode: string;          // ISO 2 country code (e.g., "US")
  market: string;               // Default market locale (e.g., "en-US")
  currencyTitle: string;        // Full currency name (e.g., "United States Dollar")
  currency: string;             // Currency code (e.g., "USD")
  currencySymbol: string;       // Currency symbol (e.g., "$")
}

/**
 * Response structure for retrieveCountries endpoint
 */
export interface CountriesResponse {
  success: boolean;
  data: CountryData[];
}

/**
 * Type guard to check if response is countries response
 */
export function isCountriesResponse(response: any): response is CountriesResponse {
  return response && 
         typeof response.success === 'boolean' && 
         Array.isArray(response.data) &&
         response.data.every((item: any) => 
           typeof item.country === 'string' &&
           typeof item.countryCode === 'string' &&
           typeof item.market === 'string' &&
           typeof item.currency === 'string'
         );
}

/**
 * Airline data structure from airlines endpoint
 */
export interface AirlineData {
  name: string;                    // Name of the airline
  slug: string;                    // URL-friendly slug
  country_code: string;            // Country code of the airline
  iata_code: string;               // IATA code of the airline
  iata_prefix: number;             // IATA prefix
  iata_accounting: number;         // IATA accounting code
  icao_code: string;               // ICAO code of the airline
  callsign: string;                // Callsign of the airline
  is_international: 0 | 1;         // International airline (1=yes, 0=no)
  iosa_registered: 0 | 1;          // IOSA registered (1=yes, 0=no)
  iosa_expiry: string | null;      // IOSA registration expiry date
  is_passenger: 0 | 1;             // Operates passenger flights (1=yes, 0=no)
  is_cargo: 0 | 1;                 // Operates cargo flights (1=yes, 0=no)
  is_scheduled: 0 | 1;             // Operates scheduled flights (1=yes, 0=no)
  total_aircrafts: number;         // Total number of aircraft
  average_fleet_age: number;       // Average fleet age in years
  accidents_last_5y: number;       // Accidents in last 5 years
  crashes_last_5y: number;         // Crashes in last 5 years
  website: string | null;          // Airline website
  twitter: string | null;          // Twitter handle
  facebook: string | null;         // Facebook page
  instagram: string | null;        // Instagram handle
  linkedin: string | null;         // LinkedIn page
}

/**
 * Query parameters for airlines endpoint
 */
export interface AirlineQueryParams {
  access_key: string;              // API access key (required)
  codeIataAirline?: string;        // Filter by IATA airline code
  codeIso2Country?: string;        // Filter by country ISO 2 code
}

/**
 * Response structure for airlines endpoint
 */
export interface AirlineResponse {
  success: boolean;
  data: AirlineData[];
}

/**
 * Type guard to check if airline is international
 */
export function isInternationalAirline(airline: AirlineData): boolean {
  return airline.is_international === 1;
}

/**
 * Type guard to check if airline is IOSA registered
 */
export function isIosaRegistered(airline: AirlineData): boolean {
  return airline.iosa_registered === 1;
}

/**
 * Type guard to check if airline operates passenger flights
 */
export function isPassengerAirline(airline: AirlineData): boolean {
  return airline.is_passenger === 1;
}

/**
 * Type guard to check if airline operates cargo flights
 */
export function isCargoAirline(airline: AirlineData): boolean {
  return airline.is_cargo === 1;
}

/**
 * Type guard to check if airline operates scheduled flights
 */
export function isScheduledAirline(airline: AirlineData): boolean {
  return airline.is_scheduled === 1;
}

/**
 * Type guard to check if response contains airline data
 */
export function isAirlineData(data: any): data is AirlineData {
  return data && 
         typeof data.name === 'string' &&
         typeof data.iata_code === 'string' &&
         typeof data.icao_code === 'string' &&
         typeof data.country_code === 'string' &&
         typeof data.total_aircrafts === 'number';
}

/**
 * Route data structure from routes endpoint
 */
export interface RouteData {
  airline_iata: string;               // Airline IATA code
  airline_icao: string;               // Airline ICAO code
  flight_number: string;              // Flight number only
  flight_iata: string;                // Flight IATA code-number
  flight_icao: string;                // Flight ICAO code-number
  cs_airline_iata: string | null;     // Codeshared airline IATA code
  cs_flight_iata: string | null;      // Codeshared flight IATA code-number
  cs_flight_number: string | null;    // Codeshared flight number
  dep_iata: string;                   // Departure airport IATA code
  dep_icao: string;                   // Departure airport ICAO code
  dep_terminals: string[] | null;     // Estimated departure terminals
  dep_time: string;                   // Departure time (local) HH:mm
  dep_time_utc: string;               // Departure time (UTC) HH:mm
  arr_iata: string;                   // Arrival airport IATA code
  arr_icao: string;                   // Arrival airport ICAO code
  arr_terminals: string[] | null;     // Estimated arrival terminals
  arr_time: string;                   // Arrival time (local) HH:mm
  arr_time_utc: string;               // Arrival time (UTC) HH:mm
  duration: number;                   // Flight duration in minutes
  aircraft_icao: string | null;       // Aircraft ICAO type
  counter: number;                    // Numerical counter (frequency indicator)
  updated: string;                    // Timestamp of last update (ISO format)
  days: string[];                     // Days of operation (e.g., ["mon", "tue"])
}

/**
 * Query parameters for routes endpoint
 */
export interface RouteQueryParams {
  access_key: string;                 // API access key (required)
  dep_iata?: string;                  // Departure airport IATA code
  dep_icao?: string;                  // Departure airport ICAO code
  arr_iata?: string;                  // Arrival airport IATA code
  arr_icao?: string;                  // Arrival airport ICAO code
  airline_icao?: string;              // Airline ICAO code
  airline_iata?: string;              // Airline IATA code
  flight_icao?: string;               // Flight ICAO code-number
  flight_iata?: string;               // Flight IATA code-number
  flight_number?: string;             // Flight number only
  _fields?: string;                   // Fields to return (comma-separated)
  limit?: number;                     // Max results (max 500)
  offset?: number;                    // Pagination offset
}

/**
 * Response structure for routes endpoint
 */
export interface RouteResponse {
  success: boolean;
  data: RouteData[];
  has_more?: boolean;                 // Indicates if more results available
}

/**
 * Type guard to check if route is codeshare
 */
export function isCodeshareRoute(route: RouteData): boolean {
  return route.cs_airline_iata !== null && route.cs_flight_iata !== null;
}

/**
 * Type guard to check if route has terminals info
 */
export function hasTerminalInfo(route: RouteData): boolean {
  return (route.dep_terminals !== null && route.dep_terminals.length > 0) ||
         (route.arr_terminals !== null && route.arr_terminals.length > 0);
}

/**
 * Type guard to check if route has aircraft info
 */
export function hasAircraftInfo(route: RouteData): boolean {
  return route.aircraft_icao !== null;
}

/**
 * Helper to check if route operates on specific day
 */
export function operatesOnDay(route: RouteData, day: string): boolean {
  return route.days.includes(day.toLowerCase().substring(0, 3));
}

/**
 * Helper to get day names from abbreviations
 */
export function getDayNames(days: string[]): string[] {
  const dayMap: { [key: string]: string } = {
    'mon': 'Monday',
    'tue': 'Tuesday',
    'wed': 'Wednesday',
    'thu': 'Thursday',
    'fri': 'Friday',
    'sat': 'Saturday',
    'sun': 'Sunday',
  };
  return days.map(day => dayMap[day] || day);
}

/**
 * City names in different languages
 */
export interface CityNames {
  de?: string;                  // German
  hi?: string;                  // Hindi
  fi?: string;                  // Finnish
  ru?: string;                  // Russian
  lo?: string;                  // Lao
  pt?: string;                  // Portuguese
  yue?: string;                 // Cantonese
  fr?: string;                  // French
  hak?: string;                 // Hakka
  gan?: string;                 // Gan
  wuu?: string;                 // Wu
  uk?: string;                  // Ukrainian
  km?: string;                  // Khmer
  sv?: string;                  // Swedish
  ko?: string;                  // Korean
  mr?: string;                  // Marathi
  el?: string;                  // Greek
  en?: string;                  // English
  it?: string;                  // Italian
  my?: string;                  // Burmese
  ta?: string;                  // Tamil
  es?: string;                  // Spanish
  zh?: string;                  // Chinese
  pa?: string;                  // Punjabi
  ar?: string;                  // Arabic
  th?: string;                  // Thai
  ja?: string;                  // Japanese
  fa?: string;                  // Persian
  da?: string;                  // Danish
  he?: string;                  // Hebrew
  [key: string]: string | undefined;  // Allow other language codes
}

/**
 * City data structure from cities endpoint
 */
export interface CityData {
  name: string;                 // City name
  iata_city_code: string;       // IATA city code
  un_locode: string;            // UN/LOCODE
  lat: number;                  // Latitude
  lng: number;                  // Longitude
  alt: number;                  // Altitude (meters)
  timezone: string;             // Timezone (e.g., "Asia/Singapore")
  country_code: string;         // ISO 2 country code
  population: number;           // City population
  names: CityNames;             // City names in different languages
  wikipedia: string;            // Wikipedia URL
  slug: string;                 // URL-friendly slug
}

/**
 * Query parameters for cities endpoint
 */
export interface CityQueryParams {
  access_key: string;           // API access key (required)
  codeIataCity: string;         // IATA city code (required)
}

/**
 * Response structure for cities endpoint
 */
export interface CityResponse {
  success: boolean;
  data: CityData[];
}

/**
 * Type guard to check if response contains city data
 */
export function isCityData(data: any): data is CityData {
  return data && 
         typeof data.name === 'string' &&
         typeof data.iata_city_code === 'string' &&
         typeof data.un_locode === 'string' &&
         typeof data.lat === 'number' &&
         typeof data.lng === 'number' &&
         typeof data.population === 'number' &&
         typeof data.country_code === 'string' &&
         typeof data.names === 'object';
}

/**
 * Helper to get city name in specific language
 */
export function getCityNameInLanguage(city: CityData, languageCode: string): string {
  return city.names[languageCode] || city.name;
} 