# Scaleway Serverless Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy ws-scoring to Scaleway as a fully serverless stack with Infrastructure-as-Code (OpenTofu) and continuous deployment via GitHub Actions.

**Architecture:** Scaleway Serverless Container + Serverless PostgreSQL + Container Registry + Secret Manager, all managed by OpenTofu with auto-scaling from 0 to 1 instance.

**Tech Stack:** OpenTofu, Scaleway Cloud Platform, GitHub Actions, Docker, Bun

---

## Task 1: Update Dockerfile for Scaleway Port Requirement

**Files:**
- Modify: `Dockerfile:16`

**Step 1: Change exposed port from 3000 to 8080**

Scaleway Serverless Containers require port 8080.

```dockerfile
# Change line 16 from:
EXPOSE 3000

# To:
EXPOSE 8080
```

**Step 2: Verify server.ts uses PORT environment variable**

Run: `grep -n "process.env.PORT" server.ts`

Expected: Line 54 shows `const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;`

This is correct - server already reads PORT from environment.

**Step 3: Commit the change**

```bash
git add Dockerfile
git commit -m "chore: change Docker port to 8080 for Scaleway compatibility"
```

---

## Task 2: Create OpenTofu Provider Configuration

**Files:**
- Create: `infrastructure/providers.tf`

**Step 1: Create infrastructure directory**

```bash
mkdir -p infrastructure
```

**Step 2: Write provider configuration**

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    bucket                      = var.tf_state_bucket
    key                         = "terraform.tfstate"
    region                      = var.region
    endpoint                    = "https://s3.${var.region}.scw.cloud"
    skip_credentials_validation = true
    skip_region_validation      = true
  }
}

provider "scaleway" {
  access_key      = var.scw_access_key
  secret_key      = var.scw_secret_key
  project_id      = var.scw_project_id
  organization_id = var.scw_organization_id
  region          = var.region
  zone            = var.zone
}
```

**Step 3: Commit**

```bash
git add infrastructure/providers.tf
git commit -m "feat(infra): add OpenTofu Scaleway provider configuration"
```

---

## Task 3: Create OpenTofu Variables

**Files:**
- Create: `infrastructure/variables.tf`
- Create: `infrastructure/terraform.tfvars`

**Step 1: Write variables.tf**

```hcl
variable "scw_access_key" {
  description = "Scaleway access key"
  type        = string
  sensitive   = true
}

variable "scw_secret_key" {
  description = "Scaleway secret key"
  type        = string
  sensitive   = true
}

variable "scw_project_id" {
  description = "Scaleway project ID"
  type        = string
}

variable "scw_organization_id" {
  description = "Scaleway organization ID"
  type        = string
}

variable "region" {
  description = "Scaleway region"
  type        = string
  default     = "fr-par"
}

variable "zone" {
  description = "Scaleway availability zone"
  type        = string
  default     = "fr-par-1"
}

variable "tf_state_bucket" {
  description = "S3 bucket name for Terraform state"
  type        = string
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "ws-scoring"
}

variable "db_password" {
  description = "PostgreSQL database password"
  type        = string
  sensitive   = true
}
```

**Step 2: Write terraform.tfvars with non-sensitive defaults**

```hcl
region   = "fr-par"
zone     = "fr-par-1"
app_name = "ws-scoring"
```

**Step 3: Create .gitignore for terraform files**

```bash
cat >> infrastructure/.gitignore <<'EOF'
.terraform/
.terraform.lock.hcl
terraform.tfstate
terraform.tfstate.backup
*.tfvars.secret
EOF
```

**Step 4: Commit**

```bash
git add infrastructure/variables.tf infrastructure/terraform.tfvars infrastructure/.gitignore
git commit -m "feat(infra): add OpenTofu variables and configuration"
```

---

## Task 4: Create OpenTofu Main Infrastructure Resources

**Files:**
- Create: `infrastructure/main.tf`

**Step 1: Write Container Registry namespace**

```hcl
# Container Registry namespace
resource "scaleway_registry_namespace" "main" {
  name        = var.app_name
  description = "Container registry for ${var.app_name}"
  is_public   = false
}
```

**Step 2: Add Serverless Container namespace**

```hcl
# Serverless Container namespace
resource "scaleway_container_namespace" "main" {
  name        = var.app_name
  description = "Serverless container namespace for ${var.app_name}"
}
```

**Step 3: Add Serverless SQL Database**

```hcl
# Serverless SQL Database (PostgreSQL)
resource "scaleway_sdb_sql_database" "main" {
  name       = var.app_name
  min_cpu    = 0
  max_cpu    = 1
}
```

**Step 4: Add Secret Manager secret for database credentials**

```hcl
# Secret Manager for database credentials
resource "scaleway_secret" "db_credentials" {
  name        = "${var.app_name}-db-credentials"
  description = "Database connection string for ${var.app_name}"
}

resource "scaleway_secret_version" "db_credentials" {
  secret_id = scaleway_secret.db_credentials.id
  data      = scaleway_sdb_sql_database.main.connection_string
}
```

**Step 5: Add Serverless Container (initial creation)**

```hcl
# Serverless Container
resource "scaleway_container" "main" {
  name           = var.app_name
  namespace_id   = scaleway_container_namespace.main.id
  registry_image = "${scaleway_registry_namespace.main.endpoint}/${var.app_name}:latest"
  port           = 8080

  min_scale = 0
  max_scale = 1

  memory_limit = 256
  cpu_limit    = 70

  timeout = 300

  environment_variables = {
    NODE_ENV = "production"
    PORT     = "8080"
  }

  secret_environment_variables {
    key       = "POSTGRESQL_CONNECTION_STRING"
    secret_id = scaleway_secret.db_credentials.id
  }

  deploy = false # Don't auto-deploy, GitHub Actions will handle
}
```

**Step 6: Commit**

```bash
git add infrastructure/main.tf
git commit -m "feat(infra): add Scaleway infrastructure resources (registry, container, database, secrets)"
```

---

## Task 5: Create OpenTofu Outputs

**Files:**
- Create: `infrastructure/outputs.tf`

**Step 1: Write output values**

```hcl
output "registry_endpoint" {
  description = "Container registry endpoint"
  value       = scaleway_registry_namespace.main.endpoint
}

output "registry_namespace_id" {
  description = "Container registry namespace ID"
  value       = scaleway_registry_namespace.main.id
}

output "container_namespace_id" {
  description = "Serverless container namespace ID"
  value       = scaleway_container_namespace.main.id
}

output "container_id" {
  description = "Serverless container ID"
  value       = scaleway_container.main.id
}

output "container_url" {
  description = "Serverless container public URL"
  value       = "https://${scaleway_container.main.domain_name}"
}

output "database_id" {
  description = "Serverless SQL database ID"
  value       = scaleway_sdb_sql_database.main.id
}

output "database_url" {
  description = "Database connection string"
  value       = scaleway_sdb_sql_database.main.connection_string
  sensitive   = true
}

output "secret_id" {
  description = "Secret Manager secret ID for database credentials"
  value       = scaleway_secret.db_credentials.id
}
```

**Step 2: Commit**

```bash
git add infrastructure/outputs.tf
git commit -m "feat(infra): add OpenTofu outputs for resource IDs and endpoints"
```

---

## Task 6: Create Infrastructure Deployment Workflow

**Files:**
- Create: `.github/workflows/infrastructure.yml`

**Step 1: Create workflows directory**

```bash
mkdir -p .github/workflows
```

**Step 2: Write infrastructure workflow**

```yaml
name: Deploy Infrastructure

on:
  push:
    branches: [main]
    paths:
      - 'infrastructure/**'
  workflow_dispatch:

env:
  TF_VERSION: '1.6.0'

jobs:
  terraform:
    name: Deploy Infrastructure with OpenTofu
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: infrastructure

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: ${{ env.TF_VERSION }}

      - name: Configure Scaleway credentials
        env:
          SCW_ACCESS_KEY: ${{ secrets.SCW_ACCESS_KEY }}
          SCW_SECRET_KEY: ${{ secrets.SCW_SECRET_KEY }}
        run: |
          echo "SCW_ACCESS_KEY=$SCW_ACCESS_KEY" >> $GITHUB_ENV
          echo "SCW_SECRET_KEY=$SCW_SECRET_KEY" >> $GITHUB_ENV

      - name: Terraform Init
        run: |
          tofu init \
            -backend-config="bucket=${{ secrets.TF_STATE_BUCKET }}" \
            -backend-config="access_key=${{ secrets.SCW_ACCESS_KEY }}" \
            -backend-config="secret_key=${{ secrets.SCW_SECRET_KEY }}"

      - name: Terraform Validate
        run: tofu validate

      - name: Terraform Plan
        run: |
          tofu plan \
            -var="scw_access_key=${{ secrets.SCW_ACCESS_KEY }}" \
            -var="scw_secret_key=${{ secrets.SCW_SECRET_KEY }}" \
            -var="scw_project_id=${{ secrets.SCW_DEFAULT_PROJECT_ID }}" \
            -var="scw_organization_id=${{ secrets.SCW_DEFAULT_ORGANIZATION_ID }}" \
            -var="region=${{ secrets.SCW_DEFAULT_REGION }}" \
            -var="tf_state_bucket=${{ secrets.TF_STATE_BUCKET }}" \
            -var="db_password=${{ secrets.DB_PASSWORD }}" \
            -out=tfplan

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: tofu apply -auto-approve tfplan

      - name: Output Infrastructure Values
        if: github.ref == 'refs/heads/main'
        run: |
          echo "REGISTRY_ENDPOINT=$(tofu output -raw registry_endpoint)" >> $GITHUB_ENV
          echo "CONTAINER_ID=$(tofu output -raw container_id)" >> $GITHUB_ENV
          echo "CONTAINER_URL=$(tofu output -raw container_url)" >> $GITHUB_ENV

      - name: Display Deployment Info
        if: github.ref == 'refs/heads/main'
        run: |
          echo "✅ Infrastructure deployed successfully!"
          echo "🐳 Registry: $REGISTRY_ENDPOINT"
          echo "🚀 Container URL: $CONTAINER_URL"
```

**Step 3: Commit**

```bash
git add .github/workflows/infrastructure.yml
git commit -m "feat(ci): add GitHub Actions workflow for infrastructure deployment"
```

---

## Task 7: Create Application Deployment Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Step 1: Write deployment workflow**

```yaml
name: Deploy Application

on:
  push:
    branches: [main]
    paths-ignore:
      - 'infrastructure/**'
      - 'docs/**'
      - '**.md'
  workflow_dispatch:

env:
  REGISTRY_ENDPOINT: rg.fr-par.scw.cloud/ws-scoring

jobs:
  build-and-test:
    name: Build and Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run linting
        run: bun run check

      - name: Run type checking
        run: bun run typecheck

      - name: Run tests
        run: bun run test

      - name: Build frontend
        run: bun run build:app

  build-docker:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    needs: build-and-test

    outputs:
      image_tag: ${{ steps.meta.outputs.tags }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Scaleway Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY_ENDPOINT }}
          username: nologin
          password: ${{ secrets.SCW_SECRET_KEY }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY_ENDPOINT }}/ws-scoring
          tags: |
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  migrate-database:
    name: Migrate Database
    runs-on: ubuntu-latest
    needs: build-docker

    steps:
      - name: Install Scaleway CLI
        run: |
          curl -o /usr/local/bin/scw -L "https://github.com/scaleway/scaleway-cli/releases/latest/download/scaleway-cli_$(uname -s)_$(uname -m)"
          chmod +x /usr/local/bin/scw

      - name: Configure Scaleway CLI
        run: |
          scw init access-key=${{ secrets.SCW_ACCESS_KEY }} \
                   secret-key=${{ secrets.SCW_SECRET_KEY }} \
                   default-project-id=${{ secrets.SCW_DEFAULT_PROJECT_ID }} \
                   default-region=${{ secrets.SCW_DEFAULT_REGION }} \
                   send-telemetry=false

      - name: Get infrastructure outputs
        working-directory: infrastructure
        run: |
          tofu init \
            -backend-config="bucket=${{ secrets.TF_STATE_BUCKET }}" \
            -backend-config="access_key=${{ secrets.SCW_ACCESS_KEY }}" \
            -backend-config="secret_key=${{ secrets.SCW_SECRET_KEY }}"

          echo "CONTAINER_ID=$(tofu output -raw container_id)" >> $GITHUB_ENV
          echo "DATABASE_URL=$(tofu output -raw database_url)" >> $GITHUB_ENV

      - name: Scale container to zero
        run: |
          scw container container update ${{ env.CONTAINER_ID }} \
            min-scale=0 max-scale=0

      - name: Wait for graceful shutdown
        run: sleep 10

      - name: Run database migrations
        run: |
          docker run --rm \
            -e POSTGRESQL_CONNECTION_STRING="${{ env.DATABASE_URL }}" \
            ${{ env.REGISTRY_ENDPOINT }}/ws-scoring:latest \
            bun run db:migrate

  deploy-container:
    name: Deploy Container
    runs-on: ubuntu-latest
    needs: migrate-database

    steps:
      - name: Install Scaleway CLI
        run: |
          curl -o /usr/local/bin/scw -L "https://github.com/scaleway/scaleway-cli/releases/latest/download/scaleway-cli_$(uname -s)_$(uname -m)"
          chmod +x /usr/local/bin/scw

      - name: Configure Scaleway CLI
        run: |
          scw init access-key=${{ secrets.SCW_ACCESS_KEY }} \
                   secret-key=${{ secrets.SCW_SECRET_KEY }} \
                   default-project-id=${{ secrets.SCW_DEFAULT_PROJECT_ID }} \
                   default-region=${{ secrets.SCW_DEFAULT_REGION }} \
                   send-telemetry=false

      - name: Get container ID
        working-directory: infrastructure
        run: |
          tofu init \
            -backend-config="bucket=${{ secrets.TF_STATE_BUCKET }}" \
            -backend-config="access_key=${{ secrets.SCW_ACCESS_KEY }}" \
            -backend-config="secret_key=${{ secrets.SCW_SECRET_KEY }}"

          echo "CONTAINER_ID=$(tofu output -raw container_id)" >> $GITHUB_ENV
          echo "CONTAINER_URL=$(tofu output -raw container_url)" >> $GITHUB_ENV

      - name: Update container with new image
        run: |
          scw container container update ${{ env.CONTAINER_ID }} \
            registry-image=${{ env.REGISTRY_ENDPOINT }}/ws-scoring:latest \
            min-scale=0 max-scale=1

      - name: Display deployment info
        run: |
          echo "✅ Deployment successful!"
          echo "🚀 Application URL: ${{ env.CONTAINER_URL }}"
```

**Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat(ci): add GitHub Actions workflow for application deployment"
```

---

## Task 8: Create Setup Documentation

**Files:**
- Create: `docs/scaleway-setup.md`

**Step 1: Write setup guide**

```markdown
# Scaleway Deployment Setup Guide

This guide covers the one-time setup required to deploy ws-scoring to Scaleway.

## Prerequisites

- Scaleway account with billing enabled
- GitHub repository with Actions enabled
- Local tools: `brew install opentofu scw`

## Step 1: Authenticate to Scaleway

```bash
scw init
```

Follow the prompts to set up your Scaleway CLI credentials.

## Step 2: Create State Storage Bucket

```bash
scw object bucket create name=ws-scoring-tfstate region=fr-par
```

This bucket stores OpenTofu state and cannot be managed by OpenTofu itself (bootstrap problem).

## Step 3: Get Scaleway Credentials

```bash
# Display current configuration
scw config get

# Note these values for GitHub Secrets:
# - access_key
# - secret_key
# - default_project_id
# - default_organization_id
# - default_region (e.g., fr-par)
```

## Step 4: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value | Where to Find |
|-------------|-------|---------------|
| `SCW_ACCESS_KEY` | Your access key | `scw config get access-key` |
| `SCW_SECRET_KEY` | Your secret key | `scw config get secret-key` |
| `SCW_DEFAULT_PROJECT_ID` | Project ID | `scw config get default-project-id` |
| `SCW_DEFAULT_ORGANIZATION_ID` | Organization ID | `scw config get default-organization-id` |
| `SCW_DEFAULT_REGION` | Region (e.g., fr-par) | `scw config get default-region` |
| `TF_STATE_BUCKET` | ws-scoring-tfstate | Bucket name from Step 2 |
| `DB_PASSWORD` | Strong random password | Generate with `openssl rand -base64 32` |

## Step 5: Deploy Infrastructure

```bash
# Push infrastructure code to main
git push origin main

# GitHub Actions will automatically:
# 1. Run infrastructure.yml workflow
# 2. Create all Scaleway resources
# 3. Output resource IDs and endpoints
```

Check GitHub Actions tab to monitor deployment progress.

## Step 6: Verify Infrastructure

```bash
cd infrastructure

# Initialize OpenTofu locally
tofu init \
  -backend-config="bucket=ws-scoring-tfstate" \
  -backend-config="access_key=<YOUR_ACCESS_KEY>" \
  -backend-config="secret_key=<YOUR_SECRET_KEY>"

# View outputs
tofu output

# Get database connection string (sensitive)
tofu output -raw database_url
```

## Step 7: First Application Deployment

```bash
# Push application code to main
git push origin main

# GitHub Actions will automatically:
# 1. Build and test
# 2. Build Docker image
# 3. Run database migrations
# 4. Deploy container
```

## Step 8: Create First User

```bash
# Get database URL from infrastructure
cd infrastructure
export POSTGRESQL_CONNECTION_STRING="$(tofu output -raw database_url)"

# Run user creation script
cd ..
bun run users:create

# Follow prompts to create administrator user
```

## Step 9: Access Application

```bash
# Get application URL
cd infrastructure
tofu output container_url

# Open in browser
open "$(tofu output -raw container_url)"
```

## Cost Monitoring

- Check Scaleway console: Billing → Overview
- Set up billing alerts: Billing → Alerts
- Expected cost: ~€0.67/month for 10 hours usage

## Troubleshooting

### GitHub Actions failing

Check:
1. All GitHub Secrets are set correctly
2. Scaleway account has billing enabled
3. State bucket exists: `scw object bucket list`

### Container not starting

Check logs:
```bash
scw container container logs <CONTAINER_ID>
```

### Database connection issues

Verify connection string:
```bash
cd infrastructure
tofu output database_url
```

Test connection:
```bash
psql "$(cd infrastructure && tofu output -raw database_url)"
```

## Manual Deployment Trigger

Trigger workflows manually from GitHub:
- Actions → Deploy Infrastructure → Run workflow
- Actions → Deploy Application → Run workflow
```

**Step 2: Commit**

```bash
git add docs/scaleway-setup.md
git commit -m "docs: add Scaleway deployment setup guide"
```

---

## Task 9: Add README Section for Deployment

**Files:**
- Modify: `README.md:366-370`

**Step 1: Add Scaleway deployment section**

Find the section "Building and Deployment (Docker only)" around line 366 and replace with:

```markdown
## Scaleway Serverless Deployment

The application deploys to Scaleway as a serverless stack with auto-scaling from 0 to 1 instance.

### Architecture

- **Scaleway Serverless Container**: Hosts the application (auto-scales)
- **Scaleway Serverless SQL Database**: PostgreSQL with scale-to-zero
- **Infrastructure as Code**: Managed with OpenTofu
- **Continuous Deployment**: GitHub Actions on push to `main`

### Setup

See [Scaleway Setup Guide](docs/scaleway-setup.md) for detailed setup instructions.

Quick start:
```bash
# Install tools
brew install opentofu scw

# Authenticate
scw init

# Create state bucket
scw object bucket create name=ws-scoring-tfstate region=fr-par

# Configure GitHub Secrets (see setup guide)

# Push to main - infrastructure and app deploy automatically
git push origin main
```

### Deployment Workflows

- **Infrastructure**: `.github/workflows/infrastructure.yml` - Runs when `infrastructure/` changes
- **Application**: `.github/workflows/deploy.yml` - Runs on push to `main`

### Cost

Expected: ~€0.67/month for ~10 hours of usage with scale-to-zero.

## Building and Deployment (Docker only - Legacy)

For local Docker builds:

```bash
docker build -t ws-scoring .
docker run -p 8080:8080 ws-scoring
```
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add Scaleway serverless deployment section to README"
```

---

## Task 10: Create .env.example for Local Development

**Files:**
- Modify: `.env.example` (if exists) or Create: `.env.example`

**Step 1: Check if .env.example exists**

Run: `ls -la .env.example 2>/dev/null || echo "File does not exist"`

**Step 2: Create or update .env.example**

```bash
# Database Configuration
POSTGRESQL_CONNECTION_STRING=postgresql://user:password@localhost:5432/ws_scoring
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=ws_scoring

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ALLOWED_ORIGIN=http://localhost:5173

# Vite Proxy Configuration (for docker-compose.dev.yml)
API_TARGET=http://localhost:3000

# Testing
USE_IN_MEMORY_EVENT_STORE=false
```

**Step 3: Commit**

```bash
git add .env.example
git commit -m "docs: add .env.example for local development configuration"
```

---

## Task 11: Final Integration Test Plan

**Files:**
- Create: `docs/deployment-test-plan.md`

**Step 1: Write test plan**

```markdown
# Deployment Test Plan

This document describes how to test the Scaleway deployment after setup.

## Prerequisites

- All GitHub Secrets configured
- Infrastructure deployed (infrastructure.yml ran successfully)
- Application deployed (deploy.yml ran successfully)

## Test 1: Infrastructure Deployment

### Steps

1. Make a trivial change to `infrastructure/main.tf`:
   ```hcl
   # Add a comment
   # Updated: 2026-01-09
   ```

2. Commit and push:
   ```bash
   git add infrastructure/main.tf
   git commit -m "test: verify infrastructure workflow"
   git push origin main
   ```

3. Check GitHub Actions → infrastructure.yml workflow

### Expected Results

- ✅ Workflow completes successfully
- ✅ "Terraform Apply" step shows "No changes"
- ✅ Outputs display correctly

## Test 2: Application Deployment

### Steps

1. Make a trivial change to application code:
   ```typescript
   // server.ts - add comment
   console.log("Server starting..."); // Deployment test
   ```

2. Commit and push:
   ```bash
   git add server.ts
   git commit -m "test: verify application deployment"
   git push origin main
   ```

3. Check GitHub Actions → deploy.yml workflow

### Expected Results

- ✅ Build and Test job passes
- ✅ Docker image builds and pushes
- ✅ Database migration runs (shows "No pending migrations")
- ✅ Container deploys successfully
- ✅ Output shows application URL

## Test 3: Application Accessibility

### Steps

1. Get application URL:
   ```bash
   cd infrastructure
   tofu output -raw container_url
   ```

2. Open URL in browser

3. Wait ~30 seconds for cold start if container scaled to zero

### Expected Results

- ✅ Application loads (may take 30s on first request)
- ✅ Login page appears
- ✅ HTTPS works automatically

## Test 4: Database Connection

### Steps

1. Try to login with non-existent user

2. Create first user:
   ```bash
   export POSTGRESQL_CONNECTION_STRING="$(cd infrastructure && tofu output -raw database_url)"
   bun run users:create
   ```

3. Login with created user credentials

### Expected Results

- ✅ Invalid login shows error
- ✅ User creation succeeds
- ✅ Login with valid credentials works
- ✅ Session persists across requests

## Test 5: Scale-to-Zero

### Steps

1. Access application URL

2. Wait 5 minutes without making requests

3. Check Scaleway console → Serverless Containers → ws-scoring
   - View metrics

4. Make another request to application

### Expected Results

- ✅ Container scales to 0 after inactivity
- ✅ First request after scale-down takes ~30s (cold start)
- ✅ Subsequent requests are fast

## Test 6: Database Migration

### Steps

1. Create a test migration:
   ```bash
   # Add to drizzle schema
   export const test_table = pgTable('deployment_test', {
     id: serial('id').primaryKey(),
     test_value: text('test_value').notNull(),
   });
   ```

2. Generate migration:
   ```bash
   bun run db:generate
   ```

3. Commit and push:
   ```bash
   git add drizzle/
   git commit -m "test: add test migration"
   git push origin main
   ```

4. Watch deploy.yml workflow

### Expected Results

- ✅ Migration runs successfully
- ✅ Container scales to 0 before migration
- ✅ New container deploys with migrated schema
- ✅ No errors in deployment

5. Clean up test migration:
   ```bash
   # Remove test table from schema
   # Generate new migration
   bun run db:generate
   git add drizzle/
   git commit -m "test: remove test migration"
   git push origin main
   ```

## Test 7: Rollback Scenario

### Steps

1. Note current working commit SHA:
   ```bash
   git rev-parse HEAD
   ```

2. Make a breaking change (intentional):
   ```typescript
   // server.ts - break port binding
   const port = "INVALID"; // This will crash
   ```

3. Commit and push:
   ```bash
   git add server.ts
   git commit -m "test: intentional breaking change"
   git push origin main
   ```

4. Watch workflow fail

5. Rollback:
   ```bash
   git revert HEAD
   git push origin main
   ```

### Expected Results

- ✅ Broken deployment fails
- ✅ Container keeps running old version
- ✅ Revert deploys successfully
- ✅ Application accessible again

## Test 8: Cost Verification

### Steps

1. Check Scaleway billing:
   - Go to Scaleway console
   - Billing → Overview
   - Check current month costs

2. Verify resource usage:
   - Serverless Containers → Metrics
   - Serverless SQL Database → Metrics

### Expected Results

- ✅ Cost is near €0 for minimal usage
- ✅ Database storage charged (~€0.20/month)
- ✅ No unexpected charges

## Success Criteria

All 8 tests pass:
- ✅ Infrastructure changes deploy
- ✅ Application changes deploy
- ✅ Application is accessible via HTTPS
- ✅ Database connections work
- ✅ Scale-to-zero functions correctly
- ✅ Migrations run safely
- ✅ Rollback works
- ✅ Costs are as expected (~€0.67/month)
```

**Step 2: Commit**

```bash
git add docs/deployment-test-plan.md
git commit -m "docs: add deployment test plan for Scaleway"
```

---

## Post-Implementation Checklist

After completing all tasks:

- [ ] Dockerfile uses port 8080
- [ ] OpenTofu configuration complete (providers, variables, main, outputs)
- [ ] GitHub Actions workflows created (infrastructure.yml, deploy.yml)
- [ ] Documentation complete (setup guide, test plan, README)
- [ ] .env.example file created
- [ ] All code committed to git

## Next Steps

1. **Manual Setup**: Follow `docs/scaleway-setup.md` to:
   - Install tools (opentofu, scw)
   - Create state bucket
   - Configure GitHub Secrets

2. **Deploy Infrastructure**:
   - Push code to `main` branch
   - infrastructure.yml workflow runs
   - Verify in GitHub Actions

3. **Deploy Application**:
   - deploy.yml workflow runs automatically
   - Verify application is accessible

4. **Run Tests**:
   - Follow `docs/deployment-test-plan.md`
   - Verify all 8 tests pass

5. **Create First User**:
   - Get database URL from OpenTofu outputs
   - Run `bun run users:create`

6. **Monitor Costs**:
   - Set up billing alerts in Scaleway
   - Check usage after 1 week
