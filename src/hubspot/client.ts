import axios, { AxiosInstance } from 'axios';
import { HubSpotError } from '../utils/errors.js';

export class HubSpotClient {
  private client: AxiosInstance;

  constructor(token: string) {
    // Detectamos si es un PAT (suele empezar con pat-) o un token de OAuth
    this.client = axios.create({
      baseURL: 'https://api.hubapi.com',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async request(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, data?: any) {
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

  // Métodos genéricos para CRUD de objetos CRM
  async getObject(objectType: string, id: string, idProperty?: string) {
    const query = idProperty ? `?idProperty=${idProperty}` : '';
    return this.request('GET', `/crm/v3/objects/${objectType}/${id}${query}`);
  }

  async searchObjects(objectType: string, filters: any[]) {
    return this.request('POST', `/crm/v3/objects/${objectType}/search`, {
      filterGroups: [{ filters }],
    });
  }

  async createObject(objectType: string, properties: any) {
    return this.request('POST', `/crm/v3/objects/${objectType}`, { properties });
  }

  async updateObject(objectType: string, id: string, properties: any) {
    return this.request('PATCH', `/crm/v3/objects/${objectType}/${id}`, { properties });
  }
}