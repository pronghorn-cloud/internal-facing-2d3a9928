# Deployment Guide

## Overview

This template is designed for **platform-agnostic deployment** using Docker containers. While optimized for Azure App Service and OpenShift, it can run on any platform supporting Docker containers and PostgreSQL databases.

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Load Balancer / Ingress                  │
│              (HTTPS Termination, SSL/TLS)                │
└────────────┬─────────────────────────────┬──────────────┘
             │                             │
    ┌────────▼────────┐         ┌─────────▼────────┐
    │   Web Container  │         │  API Container   │
    │   (Nginx + Vue)  │         │  (Node.js + TS)  │
    │   Port 80/443    │         │   Port 3000      │
    └──────────────────┘         └──────┬───────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  PostgreSQL         │
                              │  (Managed Service)  │
                              │  Port 5432 (SSL)    │
                              └─────────────────────┘
```

## Prerequisites

### Required

- **Container Registry**: Azure Container Registry, Docker Hub, or OpenShift internal registry
- **PostgreSQL Database**: Azure Database for PostgreSQL Flexible Server, AWS RDS, or CrunchyData (OpenShift)
- **Platform**: Azure App Service, OpenShift, Kubernetes, or Docker Compose
- **SSL Certificate**: For HTTPS (managed by platform or Let's Encrypt)

### Tools

- Docker (for building images)
- Azure CLI (for Azure deployments)
- `oc` CLI (for OpenShift deployments)
- `kubectl` (for Kubernetes deployments)

## Pre-Deployment Checklist

### 1. Environment Configuration

**Required environment variables** (see [.env.example](../.env.example)):

```bash
# Application
NODE_ENV = production
PORT = 3000
APP_NAME = "Your Application Name"

# Database (Azure PostgreSQL example)
DB_CONNECTION_STRING = postgresql://${DB_USER}@myserver.postgres.database.azure.com:5432/mydb?sslmode=require
DB_POOL_MIN = 2
DB_POOL_MAX = 10
DB_SSL_REJECT_UNAUTHORIZED = true

# Session
SESSION_SECRET = {{GENERATE_WITH_OPENSSL_RAND_BASE64_32}}
SESSION_STORE = postgres

# Authentication
AUTH_DRIVER = entra-id
AUTH_CALLBACK_URL = https://yourdomain.alberta.ca/api/v1/auth/callback

# Entra ID Configuration
ENTRA_TENANT_ID = {{YOUR_AZURE_TENANT_ID}}
ENTRA_CLIENT_ID = {{YOUR_AZURE_CLIENT_ID}}
ENTRA_CLIENT_SECRET = {{YOUR_AZURE_CLIENT_SECRET}}

# Service-to-Service Auth (for public-facing app)
SERVICE_AUTH_ENABLED = true
SERVICE_AUTH_ALLOWED_CLIENT_IDS = {{PUBLIC_APP_CLIENT_ID}}

# Frontend + CORS (include public-facing app origin if applicable)
CORS_ORIGIN = https://yourdomain.alberta.ca

# Security
RATE_LIMIT_MAX = 1000
AUTH_RATE_LIMIT_MAX = 100
SERVICE_RATE_LIMIT_MAX = 500
```

**Generate secure secrets**:
```bash
# Session secret
openssl rand -base64 32
```

### 2. Build and Test Locally

```bash
# Build production images
docker-compose -f docker-compose.yml build

# Test production containers locally
docker-compose -f docker-compose.yml up

# Verify health check
curl http://localhost:3000/api/v1/health
```

### 3. Database Setup

**Create database and schema**:

```sql
-- Connect to PostgreSQL server
psql "postgresql://${DB_USER}@server:5432/postgres?sslmode=require"

-- Create database
CREATE DATABASE myapp_production;

-- Connect to new database
\c myapp_production

-- Create app schema (Azure standard)
CREATE SCHEMA app;

-- Grant permissions
GRANT ALL ON SCHEMA app TO myapp_user;
```

**Run migrations**:

```bash
# Set database connection string
export DB_CONNECTION_STRING="postgresql://${DB_USER}@server:5432/mydb?sslmode=require"

# Run migrations
npm run migrate
```

## Docker Builds

### Multi-Stage Dockerfile Strategy

**Benefits**:
- Small final image size (only production dependencies)
- Security (non-root user, minimal attack surface)
- Fast builds (layer caching)

### API Dockerfile

**File**: [docker/api.Dockerfile](../docker/api.Dockerfile)

```dockerfile
# Stage 1: Dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY packages/*/package.json ./packages/
RUN npm ci --workspace=apps/api --workspace=packages/*

# Stage 2: Build TypeScript
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build:api

# Stage 3: Production runtime
FROM node:24-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S nodejs -u 1001

# Copy production files
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

**Build**:
```bash
docker build -f docker/api.Dockerfile -t myapp-api:latest .
```

### Web Dockerfile

**File**: [docker/web.Dockerfile](../docker/web.Dockerfile)

```dockerfile
# Stage 1: Build Vue app
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/*/package.json ./packages/
RUN npm ci --workspace=apps/web --workspace=packages/*
COPY . .
RUN npm run build:web

# Stage 2: Serve with Nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Nginx configuration** ([docker/nginx.conf](../docker/nginx.conf)):
```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  # Gzip compression
  gzip on;
  gzip_types text/css application/javascript application/json;

  # SPA routing (fallback to index.html)
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache static assets
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Security headers
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
}
```

**Build**:
```bash
docker build -f docker/web.Dockerfile -t myapp-web:latest .
```

## Platform-Specific Deployments

### Azure App Service

#### Architecture

```
Azure App Service (Linux Container)
  ├── API Container (Node.js)
  └── Web Container (Nginx)
      ↓
Azure Database for PostgreSQL Flexible Server
  ├── SSL/TLS enforced
  └── Private endpoint (VNet integration)
```

#### Prerequisites

- Azure subscription
- Resource group
- Azure Container Registry (ACR)

#### Step-by-Step Deployment

**1. Create Azure Resources**:

```bash
# Variables
RESOURCE_GROUP="myapp-rg"
LOCATION="canadacentral"
ACR_NAME="myappacr"
APP_SERVICE_PLAN="myapp-plan"
API_APP_NAME="myapp-api"
WEB_APP_NAME="myapp-web"
DB_SERVER_NAME="myapp-db"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create container registry
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic

# Create App Service Plan (Linux)
az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --is-linux \
  --sku P1V3
```

**2. Create PostgreSQL Database**:

```bash
# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --location $LOCATION \
  --admin-user myadmin \
  --admin-password "$DB_ADMIN_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 16 \
  --storage-size 32 \
  --public-access 0.0.0.0 \
  --ssl-enforcement Enabled

# Create database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --database-name myapp_production
```

**3. Build and Push Images**:

```bash
# Login to ACR
az acr login --name $ACR_NAME

# Build and push API
docker build -f docker/api.Dockerfile -t $ACR_NAME.azurecr.io/myapp-api:latest .
docker push $ACR_NAME.azurecr.io/myapp-api:latest

# Build and push Web
docker build -f docker/web.Dockerfile -t $ACR_NAME.azurecr.io/myapp-web:latest .
docker push $ACR_NAME.azurecr.io/myapp-web:latest
```

**4. Create Web Apps**:

```bash
# Create API App
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --name $API_APP_NAME \
  --deployment-container-image-name $ACR_NAME.azurecr.io/myapp-api:latest

# Create Web App
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --name $WEB_APP_NAME \
  --deployment-container-image-name $ACR_NAME.azurecr.io/myapp-web:latest
```

**5. Configure Environment Variables**:

```bash
# API environment variables
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $API_APP_NAME \
  --settings \
    NODE_ENV=production \
    PORT=3000 \
    DB_CONNECTION_STRING="$DB_CONNECTION_STRING" \
    SESSION_SECRET="$SESSION_SECRET" \
    SESSION_STORE=postgres \
    AUTH_DRIVER=entra-id \
    ENTRA_TENANT_ID="{{YOUR_AZURE_TENANT_ID}}" \
    ENTRA_CLIENT_ID="{{YOUR_AZURE_CLIENT_ID}}" \
    ENTRA_CLIENT_SECRET="{{YOUR_AZURE_CLIENT_SECRET}}" \
    AUTH_CALLBACK_URL="https://$API_APP_NAME.azurewebsites.net/api/v1/auth/callback" \
    CORS_ORIGIN="https://$WEB_APP_NAME.azurewebsites.net" \
    RATE_LIMIT_MAX=1000
```

**6. Enable Continuous Deployment** (optional):

```bash
# Configure webhook for auto-deploy on ACR push
az webapp deployment container config \
  --resource-group $RESOURCE_GROUP \
  --name $API_APP_NAME \
  --enable-cd true
```

**7. Configure Custom Domain & SSL**:

```bash
# Map custom domain
az webapp config hostname add \
  --resource-group $RESOURCE_GROUP \
  --webapp-name $API_APP_NAME \
  --hostname api.yourdomain.alberta.ca

# Bind SSL certificate (App Service Managed Certificate)
az webapp config ssl bind \
  --resource-group $RESOURCE_GROUP \
  --name $API_APP_NAME \
  --certificate-name yourdomain.alberta.ca \
  --ssl-type SNI
```

### OpenShift

#### Architecture

```
OpenShift Route (HTTPS)
  ├── Web Service (Nginx + Vue)
  └── API Service (Node.js)
      ↓
CrunchyData PostgreSQL Operator
  ├── Primary instance
  └── Replica instances (optional)
```

#### Prerequisites

- OpenShift cluster access
- `oc` CLI installed
- CrunchyData PostgreSQL Operator installed

#### Step-by-Step Deployment

**1. Login to OpenShift**:

```bash
oc login --token=<token> --server=https://api.cluster.example.com:6443
```

**2. Create Project**:

```bash
oc new-project myapp-production
```

**3. Create PostgreSQL Database** (using CrunchyData Operator):

```yaml
# postgres-cluster.yaml
apiVersion: postgres-operator.crunchydata.com/v1beta1
kind: PostgresCluster
metadata:
  name: myapp-db
spec:
  image: registry.developers.crunchydata.com/crunchydata/crunchy-postgres:ubi8-16.1-0
  postgresVersion: 16
  instances:
    - name: instance1
      replicas: 2
      dataVolumeClaimSpec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 20Gi
  backups:
    pgbackrest:
      image: registry.developers.crunchydata.com/crunchydata/crunchy-pgbackrest:ubi8-2.47-2
      repos:
        - name: repo1
          volume:
            volumeClaimSpec:
              accessModes:
                - ReadWriteOnce
              resources:
                requests:
                  storage: 50Gi
```

```bash
oc apply -f postgres-cluster.yaml
```

**4. Create Secrets**:

```bash
# Database connection string
oc create secret generic db-credentials \
  --from-literal=connection-string="postgresql://${DB_USER}@myapp-db:5432/mydb?sslmode=require"

# Session secret
oc create secret generic session-secret \
  --from-literal=secret=$(openssl rand -base64 32)

# Auth credentials
oc create secret generic auth-credentials \
  --from-literal=entra-client-id="{{YOUR_AZURE_CLIENT_ID}}" \
  --from-literal=entra-client-secret="{{YOUR_AZURE_CLIENT_SECRET}}"
```

**5. Create Deployment Configurations**:

```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp-api
  template:
    metadata:
      labels:
        app: myapp-api
    spec:
      containers:
        - name: api
          image: image-registry.openshift-image-registry.svc:5000/myapp-production/myapp-api:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3000"
            - name: DB_CONNECTION_STRING
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: connection-string
            - name: SESSION_SECRET
              valueFrom:
                secretKeyRef:
                  name: session-secret
                  key: secret
            - name: SESSION_STORE
              value: "postgres"
            - name: AUTH_DRIVER
              value: "entra-id"
            - name: ENTRA_TENANT_ID
              value: "{{YOUR_AZURE_TENANT_ID}}"
            - name: ENTRA_CLIENT_ID
              valueFrom:
                secretKeyRef:
                  name: auth-credentials
                  key: entra-client-id
            - name: ENTRA_CLIENT_SECRET
              valueFrom:
                secretKeyRef:
                  name: auth-credentials
                  key: entra-client-secret
            - name: AUTH_CALLBACK_URL
              value: "https://myapp-api-myapp-production.apps.cluster.example.com/api/v1/auth/callback"
            - name: CORS_ORIGIN
              value: "https://myapp-web-myapp-production.apps.cluster.example.com"
          livenessProbe:
            httpGet:
              path: /api/v1/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/v1/health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
```

```bash
oc apply -f api-deployment.yaml
```

**6. Create Services and Routes**:

```yaml
# api-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-api
spec:
  selector:
    app: myapp-api
  ports:
    - protocol: TCP
      port: 3000
      targetPort: 3000
---
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: myapp-api
spec:
  to:
    kind: Service
    name: myapp-api
  port:
    targetPort: 3000
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

```bash
oc apply -f api-service.yaml
```

**7. Build and Deploy Images**:

```bash
# Build API image
oc new-build --name=myapp-api --binary --strategy=docker
oc start-build myapp-api --from-dir=. --follow

# Build Web image
oc new-build --name=myapp-web --binary --strategy=docker
oc start-build myapp-web --from-dir=. --follow
```

### Kubernetes (Generic)

For generic Kubernetes deployments (GKE, EKS, AKS), use similar manifests to OpenShift but with standard Kubernetes resources (Ingress instead of Route, etc.).

**Ingress example** (nginx-ingress):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
    - hosts:
        - myapp.alberta.ca
      secretName: myapp-tls
  rules:
    - host: myapp.alberta.ca
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: myapp-api
                port:
                  number: 3000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-web
                port:
                  number: 80
```

## Post-Deployment

### Verify Deployment

**1. Health Checks**:

```bash
# API health
curl https://api.yourdomain.alberta.ca/api/v1/health

# Expected response
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2026-01-30T...",
    "pool": { "utilization": "20%" }
  }
}
```

**2. Authentication Flow**:

```bash
# Test login redirect
curl -I https://api.yourdomain.alberta.ca/api/v1/auth/login

# Should return 302 redirect to IdP
```

**3. Web App**:

```bash
# Visit frontend
open https://yourdomain.alberta.ca

# Check console for errors
```

### Monitoring

**Application Insights** (Azure):

```bash
# Add Application Insights to App Service
az monitor app-insights component create \
  --app myapp-insights \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP

# Link to App Service
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $API_APP_NAME \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="{{YOUR_APPINSIGHTS_INSTRUMENTATION_KEY}}"
```

**Prometheus & Grafana** (OpenShift/Kubernetes):

```bash
# Install Prometheus operator
oc apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/bundle.yaml

# Create ServiceMonitor for API
oc apply -f prometheus-servicemonitor.yaml
```

### Scaling

**Azure App Service**:

```bash
# Scale out (horizontal)
az appservice plan update \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --number-of-workers 3

# Scale up (vertical)
az appservice plan update \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --sku P2V3
```

**OpenShift**:

```bash
# Manual scale
oc scale deployment/myapp-api --replicas=5

# Horizontal Pod Autoscaler
oc autoscale deployment/myapp-api --min=2 --max=10 --cpu-percent=70
```

## Rollback

### Azure App Service

```bash
# List previous deployments
az webapp deployment list \
  --resource-group $RESOURCE_GROUP \
  --name $API_APP_NAME

# Rollback to previous version
az webapp deployment slot swap \
  --resource-group $RESOURCE_GROUP \
  --name $API_APP_NAME \
  --slot staging \
  --target-slot production
```

### OpenShift

```bash
# Rollback deployment
oc rollout undo deployment/myapp-api

# Rollback to specific revision
oc rollout undo deployment/myapp-api --to-revision=2
```

## Troubleshooting

### Container won't start

```bash
# Check logs (Azure)
az webapp log tail --resource-group $RESOURCE_GROUP --name $API_APP_NAME

# Check logs (OpenShift)
oc logs deployment/myapp-api
```

### Database connection issues

```bash
# Test connection from container
kubectl exec -it <pod-name> -- psql "$DB_CONNECTION_STRING"

# Check firewall rules (Azure)
az postgres flexible-server firewall-rule list \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME
```

### Health check failing

```bash
# Manually test health endpoint
curl -v https://api.yourdomain.alberta.ca/api/v1/health

# Check database pool
# Look for "degraded" status or pool warnings
```

## Security Considerations

1. **Secrets Management**: Use Azure Key Vault or OpenShift Secrets, never hardcode
2. **Network Security**: Use VNet integration (Azure) or Network Policies (Kubernetes)
3. **SSL/TLS**: Enforce HTTPS, use TLS 1.2+
4. **Database**: Enable SSL, use private endpoints where possible
5. **Container Security**: Scan images for vulnerabilities (Trivy, Snyk)
6. **API Documentation**: Swagger UI (`/api-docs`) is automatically disabled when `NODE_ENV=production` (T-I4: prevent info disclosure)

## Additional Resources

- [Azure App Service Documentation](https://learn.microsoft.com/en-us/azure/app-service/)
- [OpenShift Documentation](https://docs.openshift.com/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [PostgreSQL on Azure](https://learn.microsoft.com/en-us/azure/postgresql/)

---

**Last Updated**: 2026-01-30
