# Imagen de producción de Pepe (Next.js 16, modo standalone) para Foundathyon Deploy.
# El workflow la construye solo para linux/amd64. Variables y secretos van en el panel
# (pestaña Environment) y llegan al contenedor al arrancar: aquí no hay ninguno.

FROM node:22.12.0-alpine AS base
# pnpm con versión exacta (la misma de "packageManager" en package.json), sin corepack.
RUN npm install -g pnpm@12.23.0
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 1) Dependencias con el lockfile congelado.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 2) Build de Next.js (genera .next/standalone y .next/static).
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# 3) Imagen final: solo el servidor autocontenido, sin pnpm ni código fuente.
FROM node:22.12.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    NODE_OPTIONS=--max-old-space-size=160
# PORT lo pone la plataforma (3000); server.js lo lee y escucha en 0.0.0.0.
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
