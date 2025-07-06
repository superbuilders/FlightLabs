# RouteMatrix

Comprehensive FlightLabs API implementation.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the backend directory:
   ```env
   # Required
   FLIGHTLABS_ACCESS_KEY=your_flightlabs_api_key_here
   
   # Optional (defaults shown)
   CACHE_ENABLED=true
   CACHE_TTL_SECONDS=60
   CACHE_MAX_ENTRIES=100
   API_TIMEOUT=30000
   API_MAX_RETRIES=3
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

## FlightLabs API Integration

This backend includes comprehensive utilities for working with the FlightLabs real-time flight data API:

### Features

- **Type-safe API client** with full TypeScript support
- **Automatic retry logic** for handling transient failures
- **Response caching** to reduce API calls and costs
- **Data processing utilities** for unit conversions and formatting
- **Enhanced service layer** with business logic methods
- **Comprehensive error handling**

### Main Components

1. **FlightLabsClient** - Low-level API client
2. **FlightLabsService** - High-level service with caching
3. **FlightDataProcessor** - Data transformation utilities
4. **FlightLabsCache** - Smart caching system

### Usage Example

```typescript
import FlightLabsService from './utils/flightlabs';
import { flightLabsConfig } from './config/flightlabs.config';

// Initialize service
const flightService = new FlightLabsService(flightLabsConfig);

// Get flights by airline
const flights = await flightService.getFlightsByAirline('AA');

// Track a specific flight
const tracking = await flightService.trackFlight('AA100');

// Get airport activity
const activity = await flightService.getAirportActivity('JFK');

// Clean up when done
flightService.destroy();
```

### Available Methods

- Flight queries by airline, flight number, route, airport
- Real-time flight tracking
- Geographic area searches
- Airport departure/arrival information
- Airline fleet status
- Advanced search with multiple criteria

See `/src/utils/flightlabs/README.md` for detailed API documentation.

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility modules
│   │   └── flightlabs/   # FlightLabs API utilities
│   └── examples/         # Usage examples
├── dist/                 # Compiled JavaScript (generated)
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Run production build
- `npm test` - Run tests

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FLIGHTLABS_ACCESS_KEY` | Yes | - | Your FlightLabs API key |
| `FLIGHTLABS_BASE_URL` | No | https://app.goflightlabs.com | API base URL |
| `CACHE_ENABLED` | No | true | Enable/disable caching |
| `CACHE_TTL_SECONDS` | No | 60 | Cache time-to-live |
| `CACHE_MAX_ENTRIES` | No | 100 | Maximum cache entries |
| `API_TIMEOUT` | No | 30000 | API request timeout (ms) |
| `API_MAX_RETRIES` | No | 3 | Maximum retry attempts |

## Development

### Prerequisites

- Node.js 16+ 
- npm or yarn
- FlightLabs API key (get one at https://flightlabs.io)

### Testing

Run the example scripts to test the FlightLabs integration:

```bash
# Run all examples
npm run dev src/examples/flightlabs-usage.ts

# Or run specific functions by uncommenting them in the main() function
```

### Error Handling

The utilities include comprehensive error handling:

```typescript
try {
  const flights = await flightService.getFlights({ airlineIata: 'AA' });
} catch (error) {
  if (error instanceof FlightLabsApiError) {
    // Handle API-specific errors
    console.error('API Error:', error.message);
  } else {
    // Handle other errors
    console.error('Unexpected error:', error);
  }
}
```

## License

Part of the RouteMatrix project. 
