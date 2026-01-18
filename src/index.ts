import { FastMCP } from "fastmcp";
import { z } from "zod";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import session from "express-session";
import crypto from "crypto";
import { HubSpotClient } from "./hubspot/client.js";
import { MCPConfigError } from "./utils/errors.js";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const HUBSPOT_PORTAL_ID = process.env.HUBSPOT_PORTAL_ID; // e.g., 8188132
const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;

const REDIRECT_URI = process.env.REDIRECT_URI || `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost:' + PORT}/callback`;

if (!HUBSPOT_PORTAL_ID || !CLIENT_ID || !CLIENT_SECRET || !SESSION_SECRET) {
  throw new MCPConfigError("Missing required HubSpot environment variables.");
}

let currentAccessToken = process.env.HUBSPOT_ACCESS_TOKEN; // For local dev fallback

// --- SESSION MIDDLEWARE ---
// Extend Express session to store the code verifier
declare module "express-session" {
  interface SessionData {
    codeVerifier: string;
  }
}

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: 'auto' } // 'auto' is fine for Render
}));

// --- PKCE HELPER FUNCTIONS ---
const base64URLEncode = (str: Buffer) => str.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
const sha256 = (buffer: Buffer) => crypto.createHash("sha256").update(buffer).digest();

// --- MCP SERVER SETUP ---
const mcpServer = new FastMCP({
  name: "HubSpot Senior Automation MCP",
  version: "1.3.0",
});

const getClient = () => {
  if (!currentAccessToken) throw new Error("App not authorized. Please go to /install to authorize.");
  return new HubSpotClient({ accessToken: currentAccessToken });
};

// --- AUTH APP ROUTES (EXPRESS WITH PKCE) ---

app.get("/install", (req: Request, res: Response) => {
  // Generate PKCE codes
  const codeVerifier = base64URLEncode(crypto.randomBytes(32));
  const codeChallenge = base64URLEncode(sha256(Buffer.from(codeVerifier)));
  
  // Store the verifier in the user's session
  req.session.codeVerifier = codeVerifier;

  const authUrl = `https://mcp.hubspot.com/oauth/${HUBSPOT_PORTAL_ID}/authorize/user` +
                  `?client_id=${CLIENT_ID}` +
                  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                  `&code_challenge=${codeChallenge}` +
                  `&code_challenge_method=S256`;

  res.redirect(authUrl);
});

app.get("/callback", async (req: Request, res: Response) => {
  const code = req.query.code;
  const codeVerifier = req.session.codeVerifier;

  if (!code) {
    return res.status(400).send("No authorization code provided.");
  }
  if (!codeVerifier) {
    return res.status(400).send("Session expired or invalid. Please try installing again.");
  }

  try {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code: code as string,
      code_verifier: codeVerifier,
    });

    const response = await axios.post("https://api.hubapi.com/oauth/v1/token", params);

    currentAccessToken = response.data.access_token;

    // Clean up session
    req.session.destroy((err) => {
      if (err) console.error("Failed to destroy session:", err);
    });

    res.send("<h1>Authorization Successful!</h1><p>Your MCP Server is now connected to HubSpot.</p>");
  } catch (error: any) {
    console.error("Error during token exchange:", error.response?.data || error.message);
    res.status(500).send("Error during authorization token exchange.");
  }
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    authorized: !!currentAccessToken,
    runtime: "Express + FastMCP + PKCE" 
  });
});

// --- MCP TOOLS ---

mcpServer.addTool({
  name: "hubspot_get_contact",
  description: "Gets a contact by ID.",
  parameters: z.object({ id: z.string() }),
  execute: async (args) => {
    const result = await getClient().getObject("contacts", args.id);
    return JSON.stringify(result, null, 2);
  },
});

// Integrate FastMCP with Express (SSE Transport)
app.get("/sse", async (req: Request, res: Response) => {
  // @ts-ignore - FastMCP handles the HTTP stream
  return mcpServer.start({
    transportType: "httpStream",
    httpStream: {
      // @ts-ignore - We pass the express response to FastMCP's engine
      res,
      endpoint: "/sse"
    }
  });
});

app.listen(PORT, () => {
  console.log(`Senior HubSpot MCP Server with PKCE running on port ${PORT}`);
  console.log(`Installation Redirect URI: ${REDIRECT_URI}`);
});
