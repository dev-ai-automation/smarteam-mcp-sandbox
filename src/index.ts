import { FastMCP } from "fastmcp";
import { z } from "zod";
import dotenv from "dotenv";
import { HubSpotClient } from "./hubspot/client.js";
import { MCPConfigError } from "./utils/errors.js";

dotenv.config();

// Configuración flexible para MCP Auth Apps
const authConfig = {
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN, // Token obtenido del flujo OAuth de tu HubSpot App
  clientId: process.env.HUBSPOT_CLIENT_ID,
  clientSecret: process.env.HUBSPOT_CLIENT_SECRET,
};

if (!authConfig.accessToken) {
  throw new MCPConfigError("HUBSPOT_ACCESS_TOKEN (OAuth o PAT) es requerido para la HubSpot Auth App");
}

const hubspot = new HubSpotClient(authConfig);

const server = new FastMCP({
  name: "HubSpot Senior Automation MCP",
  version: "1.1.0",
});

// Lista completa de objetos según documentación oficial (incluye Carts y nuevos objetos)
const CRM_OBJECTS = [
  { type: "contacts", name: "contact", searchProp: "email" },
  { type: "companies", name: "company", searchProp: "name" },
  { type: "deals", name: "deal", searchProp: "dealname" },
  { type: "tickets", name: "ticket", searchProp: "subject" },
  { type: "products", name: "product", searchProp: "name" },
  { type: "line_items", name: "line_item", searchProp: "name" },
  { type: "quotes", name: "quote", searchProp: "hs_title" },
  { type: "carts", name: "cart", searchProp: "hs_external_id" }, // E-commerce crucial
  { type: "invoices", name: "invoice", searchProp: "invoice_number" },
  { type: "subscriptions", name: "subscription", searchProp: "name" },
];

CRM_OBJECTS.forEach((obj) => {
  // Lógica de obtención (Read)
  server.addTool({
    name: `hubspot_get_${obj.name}`,
    description: `Obtiene detalles de ${obj.name} con propiedades opcionales.`,
    parameters: z.object({
      id: z.string(),
      properties: z.array(z.string()).optional(),
    }),
    execute: async (args) => {
      const result = await hubspot.getObject(obj.type, args.id, args.properties);
      return JSON.stringify(result, null, 2);
    },
  });

  // Lógica de búsqueda (Search)
  server.addTool({
    name: `hubspot_search_${obj.type}`,
    description: `Busca ${obj.type} usando filtros avanzados.`,
    parameters: z.object({
      query: z.string(),
      property: z.string().optional().describe(`Default: ${obj.searchProp}`),
      properties: z.array(z.string()).optional(),
    }),
    execute: async (args) => {
      const prop = args.property || obj.searchProp;
      const result = await hubspot.searchObjects(obj.type, [
        { propertyName: prop, operator: "EQ", value: args.query }
      ], args.properties);
      return JSON.stringify(result, null, 2);
    },
  });

  // Lógica de creación (Write - Senior Feature)
  server.addTool({
    name: `hubspot_create_${obj.name}`,
    description: `Crea un nuevo ${obj.name} en el CRM.`,
    parameters: z.object({
      properties: z.record(z.any()),
    }),
    execute: async (args) => {
      const result = await hubspot.createObject(obj.type, args.properties);
      return JSON.stringify(result, null, 2);
    },
  });
});

// Herramienta de Pipeline Senior: Vincular objetos (Associations)
server.addTool({
  name: "hubspot_associate_objects",
  description: "Asocia dos objetos (ej. Contacto con Deal).",
  parameters: z.object({
    fromObjectType: z.string(),
    fromObjectId: z.string(),
    toObjectType: z.string(),
    toObjectId: z.string(),
    associationCategory: z.string().default("HUBSPOT_DEFINED"),
    associationTypeId: z.number(), // ID de la asociación
  }),
  execute: async (args) => {
    const path = `/crm/v3/associations/${args.fromObjectType}/${args.toObjectType}/batch/create`;
    const result = await hubspot.request('POST', path, {
      inputs: [{
        from: { id: args.fromObjectId },
        to: { id: args.toObjectId },
        type: args.associationCategory,
        typeId: args.associationTypeId
      }]
    });
    return JSON.stringify(result, null, 2);
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

server.start({
  transportType: "httpStream",
  httpStream: {
    port: PORT,
    endpoint: "/sse",
  }
}).then(() => {
  console.log(`Senior HubSpot MCP Server running on port ${PORT}`);
});
