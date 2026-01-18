import { FastMCP } from "fastmcp";
import { z } from "zod";
import dotenv from "dotenv";
import { HubSpotClient } from "./hubspot/client.js";
import { MCPConfigError } from "./utils/errors.js";
import axios from "axios";

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const REDIRECT_URI = process.env.REDIRECT_URI || `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost:' + PORT}/callback`;

// Configuración de la App (Client ID y Secret obtenidos de HubSpot Developer Portal)
const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;

// En un entorno Senior, esto iría a una DB (Redis/Postgres). 
// Para el sandbox lo mantenemos en memoria para que el servidor sea funcional inmediatamente.
let currentAccessToken = process.env.HUBSPOT_ACCESS_TOKEN; 

const server = new FastMCP({
  name: "HubSpot Senior Automation MCP",
  version: "1.2.0",
});

// Middleware/Helper para instanciar el cliente con el token actual
const getClient = () => {
  if (!currentAccessToken) throw new Error("App no autorizada. Ve a /install primero.");
  return new HubSpotClient({ accessToken: currentAccessToken });
};

// --- ENDPOINTS DE OAUTH PARA LA APP ---

// 1. Ruta para iniciar la instalación
server.get("/install", (req, res) => {
  const scopes = "crm.objects.contacts.read crm.objects.contacts.write crm.objects.deals.read crm.objects.deals.write e-commerce";
  const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scopes}`;
  res.redirect(authUrl);
});

// 2. Ruta de Callback para recibir el código y canjearlo
server.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("No code provided");

  try {
    const response = await axios.post("https://api.hubapi.com/oauth/v1/token", new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      redirect_uri: REDIRECT_URI,
      code: code as string,
    }));

    currentAccessToken = response.data.access_token;
    console.log("¡Token de HubSpot actualizado exitosamente!");
    res.send("Instalación completada. Ya puedes usar el servidor MCP.");
  } catch (error: any) {
    console.error("Error en OAuth:", error.response?.data || error.message);
    res.status(500).send("Error durante la autorización.");
  }
});

// --- HERRAMIENTAS MCP ---
const CRM_OBJECTS = [
  { type: "contacts", name: "contact", searchProp: "email" },
  { type: "companies", name: "company", searchProp: "name" },
  { type: "deals", name: "deal", searchProp: "dealname" },
  { type: "carts", name: "cart", searchProp: "hs_external_id" },
];

CRM_OBJECTS.forEach((obj) => {
  server.addTool({
    name: `hubspot_get_${obj.name}`,
    description: `Obtiene un ${obj.name} por ID.`,
    parameters: z.object({ id: z.string() }),
    execute: async (args) => {
      const result = await getClient().getObject(obj.type, args.id);
      return JSON.stringify(result, null, 2);
    },
  });
});

// Health check para Render
server.get("/health", (req, res) => {
  res.json({ status: "ok", authorized: !!currentAccessToken });
});

server.start({
  transportType: "httpStream",
  httpStream: {
    port: PORT,
    endpoint: "/sse",
  }
}).then(() => {
  console.log(`Senior HubSpot MCP Server running on port ${PORT}`);
  console.log(`Redirect URI configurada: ${REDIRECT_URI}`);
});