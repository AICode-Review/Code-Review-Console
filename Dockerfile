# Platform admin console — static build served by nginx, same shape as frontend/Dockerfile.
# Deliberately a separate image (own domain, never shipped to customers) — see CLAUDE.md.
# Vite env vars (VITE_*) are baked in at build time; pass them as build args.
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.selfhosted.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
