/**
 * Flight Price Data Processor
 * Utilities for processing and analyzing flight price data
 */

import {
  FlightItinerary,
  FlightPriceResponse,
  FlightLeg,
  FlightSegment,
  isDirectFlight,
  isRoundTrip,
  hasTag
} from '../../types/flightlabs.types';

export class FlightPriceProcessor {
  /**
   * Sort itineraries by price (lowest first)
   */
  static sortByPrice(itineraries: FlightItinerary[], ascending = true): FlightItinerary[] {
    return [...itineraries].sort((a, b) => {
      const diff = a.price.raw - b.price.raw;
      return ascending ? diff : -diff;
    });
  }

  /**
   * Sort itineraries by total duration (shortest first)
   */
  static sortByDuration(itineraries: FlightItinerary[], ascending = true): FlightItinerary[] {
    return [...itineraries].sort((a, b) => {
      const aDuration = this.getTotalDuration(a);
      const bDuration = this.getTotalDuration(b);
      const diff = aDuration - bDuration;
      return ascending ? diff : -diff;
    });
  }

  /**
   * Sort itineraries by number of stops (fewest first)
   */
  static sortByStops(itineraries: FlightItinerary[], ascending = true): FlightItinerary[] {
    return [...itineraries].sort((a, b) => {
      const aStops = this.getTotalStops(a);
      const bStops = this.getTotalStops(b);
      const diff = aStops - bStops;
      return ascending ? diff : -diff;
    });
  }

  /**
   * Get total duration of an itinerary in minutes
   */
  static getTotalDuration(itinerary: FlightItinerary): number {
    return itinerary.legs.reduce((total, leg) => total + leg.durationInMinutes, 0);
  }

  /**
   * Get total number of stops in an itinerary
   */
  static getTotalStops(itinerary: FlightItinerary): number {
    return itinerary.legs.reduce((total, leg) => total + leg.stopCount, 0);
  }

  /**
   * Filter itineraries by maximum price
   */
  static filterByMaxPrice(itineraries: FlightItinerary[], maxPrice: number): FlightItinerary[] {
    return itineraries.filter(itinerary => itinerary.price.raw <= maxPrice);
  }

  /**
   * Filter itineraries by maximum duration
   */
  static filterByMaxDuration(itineraries: FlightItinerary[], maxDurationMinutes: number): FlightItinerary[] {
    return itineraries.filter(itinerary => this.getTotalDuration(itinerary) <= maxDurationMinutes);
  }

  /**
   * Filter itineraries by maximum stops
   */
  static filterByMaxStops(itineraries: FlightItinerary[], maxStops: number): FlightItinerary[] {
    return itineraries.filter(itinerary => this.getTotalStops(itinerary) <= maxStops);
  }

  /**
   * Filter for direct flights only
   */
  static filterDirectFlightsOnly(itineraries: FlightItinerary[]): FlightItinerary[] {
    return itineraries.filter(itinerary => 
      itinerary.legs.every(leg => isDirectFlight(leg))
    );
  }

  /**
   * Filter itineraries by specific airline
   */
  static filterByAirline(itineraries: FlightItinerary[], airlineName: string): FlightItinerary[] {
    return itineraries.filter(itinerary =>
      itinerary.legs.some(leg =>
        leg.carriers.marketing.some(carrier =>
          carrier.name.toLowerCase().includes(airlineName.toLowerCase())
        )
      )
    );
  }

  /**
   * Filter itineraries by departure time range
   */
  static filterByDepartureTime(
    itineraries: FlightItinerary[],
    earliestTime: string,
    latestTime: string
  ): FlightItinerary[] {
    return itineraries.filter(itinerary => {
      const firstLeg = itinerary.legs[0];
      const departureTime = new Date(firstLeg.departure).toTimeString().slice(0, 5);
      return departureTime >= earliestTime && departureTime <= latestTime;
    });
  }

  /**
   * Get statistics for a set of itineraries
   */
  static getStatistics(itineraries: FlightItinerary[]) {
    if (itineraries.length === 0) {
      return {
        count: 0,
        priceRange: { min: 0, max: 0, average: 0 },
        durationRange: { min: 0, max: 0, average: 0 },
        stopsRange: { min: 0, max: 0, average: 0 },
        directFlights: 0,
        airlines: []
      };
    }

    const prices = itineraries.map(i => i.price.raw);
    const durations = itineraries.map(i => this.getTotalDuration(i));
    const stops = itineraries.map(i => this.getTotalStops(i));
    const airlines = new Set<string>();

    itineraries.forEach(itinerary => {
      itinerary.legs.forEach(leg => {
        leg.carriers.marketing.forEach(carrier => {
          airlines.add(carrier.name);
        });
      });
    });

    return {
      count: itineraries.length,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
        average: prices.reduce((a, b) => a + b, 0) / prices.length
      },
      durationRange: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        average: durations.reduce((a, b) => a + b, 0) / durations.length
      },
      stopsRange: {
        min: Math.min(...stops),
        max: Math.max(...stops),
        average: stops.reduce((a, b) => a + b, 0) / stops.length
      },
      directFlights: this.filterDirectFlightsOnly(itineraries).length,
      airlines: Array.from(airlines).sort()
    };
  }

  /**
   * Find the best value itinerary (balancing price and duration)
   */
  static findBestValue(itineraries: FlightItinerary[]): FlightItinerary | null {
    if (itineraries.length === 0) return null;

    // Calculate scores based on price and duration
    const stats = this.getStatistics(itineraries);
    
    const scored = itineraries.map(itinerary => {
      const priceScore = 1 - (itinerary.price.raw - stats.priceRange.min) / 
                        (stats.priceRange.max - stats.priceRange.min || 1);
      const durationScore = 1 - (this.getTotalDuration(itinerary) - stats.durationRange.min) / 
                           (stats.durationRange.max - stats.durationRange.min || 1);
      const stopsScore = 1 - (this.getTotalStops(itinerary) - stats.stopsRange.min) / 
                        (stats.stopsRange.max - stats.stopsRange.min || 1);
      
      // Weighted score: 40% price, 40% duration, 20% stops
      const totalScore = (priceScore * 0.4 + durationScore * 0.4 + stopsScore * 0.2);
      
      return { itinerary, score: totalScore };
    });

    // Return the itinerary with the highest score
    return scored.reduce((best, current) => 
      current.score > best.score ? current : best
    ).itinerary;
  }

  /**
   * Format duration in human-readable format
   */
  static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  /**
   * Format itinerary summary
   */
  static formatItinerarySummary(itinerary: FlightItinerary): string {
    const duration = this.formatDuration(this.getTotalDuration(itinerary));
    const stops = this.getTotalStops(itinerary);
    const stopsText = stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`;
    
    const outbound = itinerary.legs[0];
    const airlines = outbound.carriers.marketing.map(c => c.name).join(', ');
    
    let summary = `${itinerary.price.formatted} - ${duration} - ${stopsText}`;
    summary += `\n${airlines}`;
    summary += `\n${outbound.origin.displayCode} → ${outbound.destination.displayCode}`;
    summary += `\n${new Date(outbound.departure).toLocaleString()} - ${new Date(outbound.arrival).toLocaleString()}`;
    
    if (isRoundTrip(itinerary)) {
      const returnLeg = itinerary.legs[1];
      summary += `\n\nReturn:`;
      summary += `\n${returnLeg.origin.displayCode} → ${returnLeg.destination.displayCode}`;
      summary += `\n${new Date(returnLeg.departure).toLocaleString()} - ${new Date(returnLeg.arrival).toLocaleString()}`;
    }
    
    return summary;
  }

  /**
   * Get layover information for connecting flights
   */
  static getLayoverInfo(leg: FlightLeg): Array<{ airport: string; duration: string }> {
    const layovers: Array<{ airport: string; duration: string }> = [];
    
    if (leg.segments.length <= 1) return layovers;
    
    for (let i = 0; i < leg.segments.length - 1; i++) {
      const arrival = new Date(leg.segments[i].arrival);
      const departure = new Date(leg.segments[i + 1].departure);
      const layoverMinutes = (departure.getTime() - arrival.getTime()) / (1000 * 60);
      
      layovers.push({
        airport: leg.segments[i].destination.displayCode,
        duration: this.formatDuration(Math.round(layoverMinutes))
      });
    }
    
    return layovers;
  }

  /**
   * Check if itinerary has overnight layovers
   */
  static hasOvernightLayover(itinerary: FlightItinerary): boolean {
    return itinerary.legs.some(leg => {
      for (let i = 0; i < leg.segments.length - 1; i++) {
        const arrival = new Date(leg.segments[i].arrival);
        const departure = new Date(leg.segments[i + 1].departure);
        const layoverHours = (departure.getTime() - arrival.getTime()) / (1000 * 60 * 60);
        
        // Consider it overnight if layover is more than 8 hours or crosses midnight
        if (layoverHours > 8 || arrival.getDate() !== departure.getDate()) {
          return true;
        }
      }
      return false;
    });
  }

  /**
   * Group itineraries by airline alliance
   */
  static groupByAlliance(itineraries: FlightItinerary[]): Map<string, FlightItinerary[]> {
    const grouped = new Map<string, FlightItinerary[]>();
    
    // Alliance mappings (simplified - in production, use a comprehensive mapping)
    const allianceMap: { [key: string]: string } = {
      'United Airlines': 'Star Alliance',
      'Lufthansa': 'Star Alliance',
      'Air Canada': 'Star Alliance',
      'American Airlines': 'Oneworld',
      'British Airways': 'Oneworld',
      'Cathay Pacific': 'Oneworld',
      'Delta Air Lines': 'SkyTeam',
      'Air France': 'SkyTeam',
      'KLM': 'SkyTeam',
      // Add more airlines as needed
    };
    
    itineraries.forEach(itinerary => {
      const airlines = new Set<string>();
      itinerary.legs.forEach(leg => {
        leg.carriers.marketing.forEach(carrier => {
          airlines.add(carrier.name);
        });
      });
      
      // Determine alliance (simplified logic)
      let alliance = 'Other';
      for (const airline of airlines) {
        if (allianceMap[airline]) {
          alliance = allianceMap[airline];
          break;
        }
      }
      
      if (!grouped.has(alliance)) {
        grouped.set(alliance, []);
      }
      grouped.get(alliance)!.push(itinerary);
    });
    
    return grouped;
  }

  /**
   * Calculate total carbon emissions estimate (simplified)
   */
  static estimateCarbonEmissions(itinerary: FlightItinerary): number {
    // Simplified calculation: ~90g CO2 per passenger km
    // Actual calculation would need distance data
    let totalEmissions = 0;
    
    itinerary.legs.forEach(leg => {
      // Rough estimate based on duration
      // Average flight speed ~800 km/h
      const distanceKm = (leg.durationInMinutes / 60) * 800;
      const emissionsKg = (distanceKm * 90) / 1000;
      totalEmissions += emissionsKg;
    });
    
    return Math.round(totalEmissions);
  }
} 