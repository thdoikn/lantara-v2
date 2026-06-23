FROM node:20-alpine AS builder

# Declare build-time OIDC vars — baked into the JS bundle by Vite at build time.
# Pass via --build-arg in CI (see publish.yml) or leave empty for local dev.
ARG VITE_OIDC_AUTHORITY=""
ARG VITE_OIDC_CLIENT_ID=""
ENV VITE_OIDC_AUTHORITY=$VITE_OIDC_AUTHORITY
ENV VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID

WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Production image — just the built static files
FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
