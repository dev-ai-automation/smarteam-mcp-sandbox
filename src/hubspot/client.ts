import axios, { AxiosInstance } from 'axios';
import { HubSpotError } from '../utils/errors.js';

export interface HubSpotAuthConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accessToken?: string; // Puede ser PAT o OAuth Access Token
}

export class HubSpotClient {
  private client: AxiosInstance;

  constructor(config: HubSpotAuthConfig) {
    const token = config.accessToken;
    this.client = axios.create({
      baseURL: 'https://api.hubapi.com',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // Método centralizado para peticiones (escalable para pipelines)
  async request(method: string, path: string, data?: any) {
    try {
      const response = await this.client({ method, url: path, data });
      return response.data;
    } catch (error: any) {
      throw new HubSpotError(
        error.response?.status || 500,
        error.response?.data?.message || error.message
      );
    }
  }

  // Soporte para todos los objetos CRM + E-commerce (Carts)
  async getObject(objectType: string, id: string, properties?: string[]) {
    const props = properties ? `?properties=${properties.join(',')}` : '';
    return this.request('GET', `/crm/v3/objects/${objectType}/${id}${props}`);
  }

  async searchObjects(objectType: string, filters: any[], properties?: string[]) {
    return this.request('POST', `/crm/v3/objects/${objectType}/search`, {
      filterGroups: [{ filters }],
      properties: properties || []
    });
  }

  async createObject(objectType: string, properties: any) {
    return this.request('POST', `/crm/v3/objects/${objectType}`, { properties });
  }

  async updateObject(objectType: string, id: string, properties: any) {
    return this.request('PATCH', `/crm/v3/objects/${objectType}/${id}`, { properties });
  }
}
