import { z } from 'zod';
import { HubSpotClient } from '../hubspot/client.js';

// Schemas
const IdSchema = z.object({ id: z.string() });
const SearchSchema = z.object({ query: z.string(), property: z.string().default('name') });
const CreateSchema = z.object({ properties: z.record(z.any()) });

export const defineTools = (hubspot: HubSpotClient) => {
  const objects = [
    { type: 'contacts', name: 'contact', searchProp: 'email' },
    { type: 'companies', name: 'company', searchProp: 'name' },
    { type: 'deals', name: 'deal', searchProp: 'dealname' },
    { type: 'tickets', name: 'ticket', searchProp: 'subject' },
    { type: 'products', name: 'product', searchProp: 'name' },
    { type: 'line_items', name: 'line_item', searchProp: 'name' },
    { type: 'quotes', name: 'quote', searchProp: 'hs_title' },
  ];

  const tools: any[] = [];

  objects.forEach((obj) => {
    // Tool: Get Object
    tools.push({
      name: `get_${obj.name}`,
      description: `Obtener un ${obj.name} por su ID interno de HubSpot`,
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      handler: async (args: any) => {
        const { id } = IdSchema.parse(args);
        const result = await hubspot.getObject(obj.type, id);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      },
    });

    // Tool: Search Object
    tools.push({
      name: `search_${obj.type}`,
      description: `Buscar ${obj.type} basándose en una propiedad específica`,
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          property: { type: 'string', description: `Propiedad a buscar (default: ${obj.searchProp})` },
        },
        required: ['query'],
      },
      handler: async (args: any) => {
        const { query, property } = SearchSchema.parse(args);
        const searchProp = property || obj.searchProp;
        const result = await hubspot.searchObjects(obj.type, [
          { propertyName: searchProp, operator: 'CONTAINS_TOKEN', value: query },
        ]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      },
    });

    // Tool: Create Object
    tools.push({
      name: `create_${obj.name}`,
      description: `Crear un nuevo ${obj.name} en HubSpot`,
      inputSchema: {
        type: 'object',
        properties: {
          properties: { type: 'object', description: 'Mapa de propiedades y sus valores' },
        },
        required: ['properties'],
      },
      handler: async (args: any) => {
        const { properties } = CreateSchema.parse(args);
        const result = await hubspot.createObject(obj.type, properties);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      },
    });
  });

  return tools;
};