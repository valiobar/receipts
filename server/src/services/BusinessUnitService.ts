import logger from '../config/winston';

/**
 * Business Unit Service
 * Fetches and caches business units from BRP API
 * Stores them in memory as Record<number, string> (id -> name)
 */
class BusinessUnitService {
  private businessUnits: Record<number, string> = {};
  private brpApiUrl?: string;
  private brpApiKey?: string;
  private initialized: boolean = false;

  constructor() {
    this.brpApiUrl = process.env.BRP_API_URL;
    this.brpApiKey = process.env.BRP_API_KEY;
  }

  /**
   * Initialize business units cache by fetching from BRP API
   * Should be called on application startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug('Business units already initialized');
      return;
    }

    // Skip initialization if not configured
    if (!this.brpApiUrl) {
      logger.info('Business units initialization skipped - BRP_API_URL not configured');
      return;
    }

    try {
      logger.info('Fetching business units from BRP API...', {
        apiUrl: this.brpApiUrl,
      });

      const businessUnits = await this.fetchBusinessUnits();
      
      // Store in memory as Record<number, string>
      this.businessUnits = businessUnits.reduce(
        (acc, unit) => {
          if (unit.id && unit.name) {
            acc[unit.id] = unit.name;
          }
          return acc;
        },
        {} as Record<number, string>
      );

      this.initialized = true;

      logger.info('Business units initialized successfully', {
        count: Object.keys(this.businessUnits).length,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error initializing business units', {
        error: errorMessage,
      });
      // Don't throw - allow server to start even if fetch fails
      // Business units will remain empty, and we'll use 'unknown' as fallback
    }
  }

  /**
   * Fetch business units from BRP API
   * Based on API documentation: https://pulse.brpsystems.com/brponline/external/documentation/api3
   */
  private async fetchBusinessUnits(): Promise<Array<{ id: number; name: string }>> {
    if (!this.brpApiUrl) {
      throw new Error('BRP API URL not configured');
    }

    const endpoint = `${this.brpApiUrl}/api/ver3/businessunits`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
  
 logger.info('Fetching business units', {
  endpoint,
  headers,
 });
    const response = await fetch(endpoint, {
      method: 'GET',
     headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to fetch business units: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as
      | Array<{ id: number; name: string }>
    
    
    // Handle different response formats
    // Could be array directly, or wrapped in a data property
    let units: Array<{ id: number; name: string }> = [];
    
    if (Array.isArray(data)) {
      units = data;
    }

    // Validate and transform units
    const validUnits = units
      .filter((unit) => unit && typeof unit.id === 'number' && typeof unit.name === 'string')
      .map((unit) => ({
        id: unit.id,
        name: unit.name,
      }));

    logger.info('Successfully fetched business units', {
      endpoint,
      count: validUnits,
    });

    return validUnits;
  }

  /**
   * Get business unit name by ID
   * @param id Business unit ID
   * @returns Business unit name or 'unknown' if not found
   */
  getNameById(id: number | string | undefined): string {
    if (id === undefined || id === null || id === 'unknown') {
      return 'unknown';
    }

    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    if (isNaN(numericId)) {
      return 'unknown';
    }

    return this.businessUnits[numericId] || 'unknown';
  }

  /**
   * Get all cached business units
   * @returns Record of business unit IDs to names
   */
  getAll(): Record<number, string> {
    return { ...this.businessUnits };
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const businessUnitService = new BusinessUnitService();
export { BusinessUnitService };
export default businessUnitService;

