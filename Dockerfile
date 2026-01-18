# Etapa 1: Build
FROM node:20-slim AS builder

# Instalar dependencias necesarias para construir herramientas nativas si las hubiera
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Aprovechar la caché de capas para las dependencias
COPY package*.json ./
RUN npm ci

# Copiar el código fuente y compilar
COPY . .
RUN npm run build

# Etapa 2: Producción
FROM node:20-slim AS runner

ENV NODE_ENV=production
WORKDIR /app

# Copiar solo lo necesario para ejecución
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar el código compilado desde la etapa builder
COPY --from=builder /app/dist ./dist

# Seguridad: Ejecutar como usuario no-root
USER node

EXPOSE 3000

# Healthcheck básico
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1))" || exit 1

CMD ["node", "dist/index.js"]