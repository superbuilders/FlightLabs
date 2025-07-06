import { FlightLabsServiceConfig } from '../utils/flightlabs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * FlightLabs API configuration
 * Uses environment variables with sensible defaults
 */
export const flightLabsConfig: FlightLabsServiceConfig = {
  // Required: API access key
  accessKey: process.env.FLIGHTLABS_ACCESS_KEY || '',
  
  // Optional: API endpoint
  baseURL: process.env.FLIGHTLABS_BASE_URL || 'https://app.goflightlabs.com',
  
  // Request configuration
  timeout: parseInt(process.env.API_TIMEOUT || '30000'),
  maxRetries: parseInt(process.env.API_MAX_RETRIES || '3'),
  retryDelay: parseInt(process.env.API_RETRY_DELAY || '1000'),
  
  // Cache configuration
  cacheEnabled: process.env.CACHE_ENABLED !== 'false',
  cacheTTL: parseInt(process.env.CACHE_TTL_SECONDS || '60'),
  cacheMaxEntries: parseInt(process.env.CACHE_MAX_ENTRIES || '100'),
  autoCleanupInterval: parseInt(process.env.CACHE_CLEANUP_INTERVAL || '300'),
};

/**
 * Validate configuration
 */
export function validateConfig(): void {
  if (!flightLabsConfig.accessKey) {
    throw new Error('FLIGHTLABS_ACCESS_KEY environment variable is required');
  }
} 