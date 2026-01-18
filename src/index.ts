import { FastMCP } from "fastmcp";
import { z } from "zod";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import { HubSpotClient } from "./hubspot/client.js";
import { MCPConfigError } from "./utils/errors.js";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const REDIRECT_URI = process.env.REDIRECT_URI || `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost:' + PORT}/callback`;

const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;

let currentAccessToken = process.env.HUBSPOT_ACCESS_TOKEN;

const mcpServer = new FastMCP({
  name: "HubSpot Senior Automation MCP",
  version: "1.2.1",
});

const getClient = () => {
  if (!currentAccessToken) throw new Error("App no autorizada. Ve a /install.");
  return new HubSpotClient({ accessToken: currentAccessToken });
};

// --- RUTAS DE LA AUTH APP (EXPRESS) ---

app.get("/install", (_req: Request, res: Response) => {
  const scopes = "cms.domains.read cms.functions.read cms.functions.write cms.pages.landing_pages.read cms.pages.site_pages.read cms.source_code.read cms.source_code.write collector.graphql_query.execute collector.graphql_schema.read crm.objects.companies.read crm.objects.contacts.read crm.objects.custom.read crm.objects.custom.write crm.objects.deals.read crm.objects.owners.read crm.schemas.companies.read crm.schemas.contacts.read crm.schemas.custom.read crm.schemas.custom.write crm.schemas.deals.read developer.app_functions.read developer.app_functions.write developer.private_app.temporary_token.read developer.private_app.temporary_token.write developer.projects.write developer.sandboxes.read developer.sandboxes.write developer.secrets.read developer.secrets.write developer.test_accounts.read developer.test_accounts.write files hubdb sandboxes.read sandboxes.write";
  const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${encodeURIComponent(scopes)}`;
  res.redirect(authUrl);
});

app.get("/callback", async (req: Request, res: Response) => {
  const code = req.query.code;
  if (!code) {
    res.status(400).send("No code provided");
    return;
  }

  try {
    const response = await axios.post("https://api.hubapi.com/oauth/v1/token", new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      redirect_uri: REDIRECT_URI,
      code: code as string,
    }));

    currentAccessToken = response.data.access_token;
    res.send("<h1>¡Autorización Exitosa!</h1><p>Tu MCP Server ahora tiene acceso a HubSpot.</p>");
  } catch (error: any) {
    res.status(500).send("Error en la autorización.");
  }
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    authorized: !!currentAccessToken,
    runtime: "Express + FastMCP" 
  });
});

// --- HERRAMIENTAS MCP ---

mcpServer.addTool({
  name: "hubspot_get_contact",
  description: "Obtiene un contacto por ID.",
  parameters: z.object({ id: z.string() }),
  execute: async (args) => {
    const result = await getClient().getObject("contacts", args.id);
    return JSON.stringify(result, null, 2);
  },
});

// Integrar FastMCP con Express (SSE Transport)
app.get("/sse", async (req: Request, res: Response) => {
  // @ts-ignore - FastMCP maneja el stream HTTP
  return mcpServer.start({
    transportType: "httpStream",
    httpStream: {
      // @ts-ignore - Pasamos la respuesta de express al motor de FastMCP
      res,
      endpoint: "/sse"
    }
  });
});

app.listen(PORT, () => {
  console.log(`Senior HubSpot MCP Server running on port ${PORT}`);
  console.log(`OAuth URL: ${REDIRECT_URI}`);
});
