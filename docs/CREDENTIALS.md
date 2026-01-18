# Configuración de Credenciales - MCP HubSpot Server

Este servidor utiliza un **HubSpot Private App Access Token** para autenticarse con la API de HubSpot.

## 1. Obtención del Token (HubSpot)
1. Ve a tu cuenta de HubSpot -> **Settings** (Icono de engranaje).
2. En el menú lateral, navega a **Account Setup** -> **Integrations** -> **Private Apps**.
3. Haz clic en **Create private app**.
4. En la pestaña **Basic Info**, dale un nombre (ej. `MCP Render Server`).
5. En la pestaña **Scopes**, selecciona los permisos necesarios (mínimo `crm.objects.contacts.read`, `crm.objects.deals.read`).
6. Haz clic en **Create app** y copia el token que empieza por `pat-na1-...`.

## 2. Configuración Local (Testing)
Para probar de forma local sin exponer las credenciales en el código:

1. Crea un archivo `.env` en la raíz del proyecto (basado en `.env.example`).
2. Añade tu token:
   ```env
   HUBSPOT_ACCESS_TOKEN=pat-na1-xxxx-xxxx-xxxx
   PORT=3000
   ```
3. El archivo `.env` está en `.gitignore`, por lo que nunca se subirá al repositorio.

## 3. Configuración en Render (Producción)
En Render no utilizaremos archivos `.env`. Las credenciales se gestionan como variables de entorno del Web Service:

1. En el Dashboard de Render, ve a tu servicio.
2. Selecciona **Environment**.
3. Añade la variable:
   - **Key**: `HUBSPOT_ACCESS_TOKEN`
   - **Value**: `pat-na1-xxxx-xxxx-xxxx` (tu token de producción).
4. El servidor detectará automáticamente esta variable al arrancar.

## Seguridad
- **NUNCA** guardes el token directamente en archivos `.ts` o `.js`.
- El token tiene acceso completo a los scopes definidos; trata esta credencial como una contraseña de administrador.
