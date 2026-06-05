// Google Places API response types
export interface AddressPrediction {
  place_id: string;
  description: string;
}

export interface AddressAutocompleteResponse {
  predictions: AddressPrediction[];
  error?: string;
}

export interface AddressDetails {
  streetNumber: string;
  route: string;
  streetAddress: string;
  city: string;
  state: string;
  stateShort: string;
  country: string;
  postalCode: string;
  formattedAddress: string;
}

export interface AddressDetailsResponse {
  details: AddressDetails | null;
  error?: string;
}

type ClientLocationBias = { lat: number; lng: number };

// Proper Singleton implementation
export class AddressService {
  private static instance: AddressService;
  private sessionToken: string;
  private clientLocationBias: ClientLocationBias | null | undefined;
  private clientLocationBiasPromise: Promise<ClientLocationBias | null> | null = null;

  private constructor() {
    this.sessionToken = crypto.randomUUID();
  }

  public static getInstance(): AddressService {
    if (!AddressService.instance) {
      AddressService.instance = new AddressService();
    }
    return AddressService.instance;
  }

  private async getClientLocationBias(): Promise<ClientLocationBias | null> {
    if (this.clientLocationBias !== undefined) {
      return this.clientLocationBias;
    }

    if (this.clientLocationBiasPromise) {
      return this.clientLocationBiasPromise;
    }

    this.clientLocationBiasPromise = (async () => {
      try {
        const cached = sessionStorage.getItem("addressClientLocationBias");
        if (cached) {
          const parsed = JSON.parse(cached) as ClientLocationBias & { expiresAt?: number };
          if (
            typeof parsed.lat === "number" &&
            typeof parsed.lng === "number" &&
            typeof parsed.expiresAt === "number" &&
            parsed.expiresAt > Date.now()
          ) {
            this.clientLocationBias = { lat: parsed.lat, lng: parsed.lng };
            return this.clientLocationBias;
          }
        }

        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 800);
        const response = await fetch("https://ipapi.co/json/", { signal: ctrl.signal });
        clearTimeout(timeout);

        if (!response.ok) {
          this.clientLocationBias = null;
          return null;
        }

        const geo = (await response.json()) as { latitude?: number; longitude?: number };
        if (typeof geo.latitude !== "number" || typeof geo.longitude !== "number") {
          this.clientLocationBias = null;
          return null;
        }

        this.clientLocationBias = { lat: geo.latitude, lng: geo.longitude };
        sessionStorage.setItem(
          "addressClientLocationBias",
          JSON.stringify({ ...this.clientLocationBias, expiresAt: Date.now() + 24 * 60 * 60 * 1000 })
        );
        return this.clientLocationBias;
      } catch {
        this.clientLocationBias = null;
        return null;
      } finally {
        this.clientLocationBiasPromise = null;
      }
    })();

    return this.clientLocationBiasPromise;
  }

  /**
   * Fetch address predictions based on user input
   */
  async fetchPredictions(
    input: string,
    countryCode?: string,
    regionCode?: string
  ): Promise<AddressPrediction[]> {
    if (input.length < 3) {
      return [];
    }

    try {
      const clientLocationBias = await this.getClientLocationBias();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/address-autocomplete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            input,
            sessionToken: this.sessionToken,
            country: countryCode,
            regionCode,
            clientLocationBias,
          }),
        }
      );

      const data: AddressAutocompleteResponse = await response.json();

      if (data.error) {
        console.error("Address autocomplete error:", data.error);
        return [];
      }

      return data.predictions || [];
    } catch (error) {
      console.error("Error fetching address predictions:", error);
      return [];
    }
  }

  /**
   * Fetch detailed address information for a place ID
   */
  async fetchAddressDetails(placeId: string): Promise<AddressDetails | null> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/address-details`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            placeId,
            sessionToken: this.sessionToken,
          }),
        }
      );

      const data: AddressDetailsResponse = await response.json();

      if (data.error || !data.details) {
        console.error("Address details error:", data.error);
        return null;
      }

      return data.details;
    } catch (error) {
      console.error("Error fetching place details:", error);
      return null;
    }
  }

  /**
   * Create a new session token (useful for new form instances)
   */
  refreshSession(): void {
    this.sessionToken = crypto.randomUUID();
  }

  /**
   * Get current session token
   */
  getSessionToken(): string {
    return this.sessionToken;
  }
}

// Export singleton instance
export const addressService = AddressService.getInstance();
