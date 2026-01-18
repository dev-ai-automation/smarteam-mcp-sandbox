# Credenciales - HubSpot MCP Auth App (Senior)

Este servidor está diseñado para integrarse con una **HubSpot Auth App** (OAuth 2.1).

## 1. Creación de la App en HubSpot
1. Entra en tu **HubSpot Developer Portal**.
2. Crea una nueva App (o usa una existente).
3. Configura los **Scopes**: Asegúrate de añadir los permisos de lectura y escritura para los objetos que vas a usar (Contacts, Companies, Deals, Tickets, Carts).
4. En **Auth Settings**, obtén tu `Client ID` y `Client Secret`.
5. Si vas a usar este servidor como parte de un flujo OAuth automático, configura la **Redirect URL** apuntando a tu servidor en Render (ej. `https://tu-app.onrender.com/callback`).

## 2. Variables de Entorno (Producción en Render)
En Render, configura las siguientes variables en el Dashboard:
- `HUBSPOT_ACCESS_TOKEN`: El token activo (Bearer).
- `HUBSPOT_CLIENT_ID`: Tu ID de app.
- `HUBSPOT_CLIENT_SECRET`: Tu secreto de app.

## 3. Testing Local
Crea un archivo `.env` en la raíz del proyecto:
```env
HUBSPOT_ACCESS_TOKEN=tu_access_token_obtenido
PORT=3000
```
Para testing senior, puedes usar un **PAT** (Private App Token) como `HUBSPOT_ACCESS_TOKEN` para saltarte el flujo OAuth inicial durante el desarrollo de pipelines.

## Nota sobre Carts (E-commerce)
El objeto `carts` requiere que la cuenta de HubSpot tenga habilitadas las herramientas de e-commerce y que la App tenga los scopes `e-commerce` activos.