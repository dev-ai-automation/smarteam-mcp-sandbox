# HubSpot MCP Server - Master Plan

Este servidor MCP (Model Context Protocol) está diseñado para servir como un componente central en pipelines de automatización Revops, permitiendo a IAs interactuar con HubSpot de forma segura mediante Private App Tokens.

## Estructura del Proyecto
- `src/hubspot`: Cliente API robusto para HubSpot.
- `src/mcp`: Definición de herramientas y lógica del servidor MCP.
- `src/utils`: Utilidades de validación (Zod) y manejo de errores.
- `docs/`: Documentación detallada de credenciales y despliegue.

## Plan Maestro de Implementación (Sequential & Pragmatic)

1.  **Fase 1: Core de Autenticación (Completado)**
    - Implementación del soporte para Private App Tokens (`pat_...`).
    - Configuración de variables de entorno para Render y Local.

2.  **Fase 2: Interfaz de Herramientas (Completado)**
    - Definición de herramientas iniciales: `get_contact`, `search_deals`.
    - Validación estricta de esquemas con Zod.

3.  **Fase 3: Infraestructura de Despliegue (Completado)**
    - Dockerización del servidor.
    - Configuración de Render Blueprint (`render.yaml`).

4.  **Fase 4: Expansión de Pipelines (Próximamente)**
    - Añadir herramientas para creación de tickets y actualización de propiedades.
    - Integración con workflows de HubSpot vía Webhooks.

## Cómo empezar localmente

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Configura tu `.env` (ver `docs/CREDENTIALS.md`):
   ```env
   HUBSPOT_ACCESS_TOKEN=tu_token_aqui
   ```
3. Inicia en modo desarrollo:
   ```bash
   npm run dev
   ```

## Despliegue en Render
El servidor está listo para ser desplegado como un **Web Service** en Render usando el `Dockerfile` proporcionado. El endpoint de conexión será `https://tu-app.onrender.com/sse`.
