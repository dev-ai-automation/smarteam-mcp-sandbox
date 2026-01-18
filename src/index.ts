import { FastMCP } from "fastmcp";
import { z } from "zod";
import dotenv from "dotenv";
import { HubSpotClient } from "./hubspot/client.js";
import { MCPConfigError } from "./utils/errors.js";

dotenv.config();

const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
if (!accessToken) {
  throw new MCPConfigError("HUBSPOT_ACCESS_TOKEN is required in environment variables");
}

const hubspot = new HubSpotClient(accessToken);

const server = new FastMCP({
  name: "HubSpot Revops MCP Server",
  version: "1.0.0",
});

// Definición de Objetos CRM y sus campos de búsqueda por defecto
const CRM_OBJECTS = [
  { type: "contacts", name: "contact", searchProp: "email", description: "un contacto" },
  { type: "companies", name: "company", searchProp: "name", description: "una empresa" },
  { type: "deals", name: "deal", searchProp: "dealname", description: "un negocio (deal)" },
  { type: "tickets", name: "ticket", searchProp: "subject", description: "un ticket" },
  { type: "products", name: "product", searchProp: "name", description: "un producto" },
  { type: "line_items", name: "line_item", searchProp: "name", description: "un ítem de línea" },
  { type: "quotes", name: "quote", searchProp: "hs_title", description: "una cotización" },
  { type: "invoices", name: "invoice", searchProp: "invoice_number", description: "una factura" },
  { type: "orders", name: "order", searchProp: "order_number", description: "un pedido" },
  { type: "subscriptions", name: "subscription", searchProp: "name", description: "una suscripción" },
];

CRM_OBJECTS.forEach((obj) => {
  // TOOL: Get by ID
  server.addTool({
    name: `get_${obj.name}`,
    description: `Obtener ${obj.description} por su ID interno`,
    parameters: z.object({
      id: z.string().describe("ID del objeto en HubSpot"),
    }),
    execute: async (args) => {
      const result = await hubspot.getObject(obj.type, args.id);
      return JSON.stringify(result, null, 2);
    },
  });

  // TOOL: Search
  server.addTool({
    name: `search_${obj.type}`,
    description: `Buscar ${obj.type} por una propiedad específica`,
    parameters: z.object({
      query: z.string().describe("Valor a buscar"),
      property: z.string().optional().describe(`Propiedad a buscar (default: ${obj.searchProp})`),
    }),
    execute: async (args) => {
      const property = args.property || obj.searchProp;
      const result = await hubspot.searchObjects(obj.type, [
        { propertyName: property, operator: "CONTAINS_TOKEN", value: args.query },
      ]);
      return JSON.stringify(result, null, 2);
    },
  });

  // TOOL: Create
  server.addTool({
    name: `create_${obj.name}`,
    description: `Crear ${obj.description} en HubSpot`,
    parameters: z.object({
      properties: z.record(z.any()).describe("Propiedades del objeto a crear"),
    }),
    execute: async (args) => {
      const result = await hubspot.createObject(obj.type, args.properties);
      return JSON.stringify(result, null, 2);
    },
  });

  // TOOL: Update
  server.addTool({
    name: `update_${obj.name}`,
    description: `Actualizar ${obj.description} existente`,
    parameters: z.object({
      id: z.string().describe("ID del objeto a actualizar"),
      properties: z.record(z.any()).describe("Propiedades a modificar"),
    }),
    execute: async (args) => {
      const result = await hubspot.updateObject(obj.type, args.id, args.properties);
      return JSON.stringify(result, null, 2);
    },
  });
});

// Health check endpoint simple (FastMCP maneja esto internamente pero añadimos log)
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

server.start({
  transportType: "httpStream",
  httpStream: {
    port: PORT,
    endpoint: "/sse",
  }
}).then(() => {
  console.log(`FastMCP HubSpot Server running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
});