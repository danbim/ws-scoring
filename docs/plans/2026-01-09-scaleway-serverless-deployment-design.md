# Scaleway Serverless Deployment Design

**Date:** 2026-01-09
**Status:** Approved
**Author:** Design Session with User

## Overview

Deploy the ws-scoring windsurfing judging application as a fully serverless stack on Scaleway with continuous deployment from GitHub Actions. The solution uses Infrastructure-as-Code (OpenTofu) for resource management and achieves true scale-to-zero for minimal costs.

## Goals

- Deploy to Scaleway with true scale-to-zero (compute and database)
- Continuous deployment from `main` branch via GitHub Actions
- Infrastructure managed as code with OpenTofu
- Target cost: ~€0.67/month for ~10 hours of usage
- GDPR-compliant European hosting

## Architecture

### Components

1. **Scaleway Serverless Container**
   - Hosts Bun application (frontend + API)
   - Auto-scales from 0 to 1 instance based on traffic
   - Port 8080 (Scaleway requirement)
   - Memory: 256MB, CPU: 0.07 vCPU

2. **Scaleway Serverless SQL Database (PostgreSQL)**
   - Managed PostgreSQL with auto-scaling
   - Scales to zero when idle (no compute costs)
   - Storage billed continuously (~€0.20/month for 1GB)

3. **Scaleway Container Registry**
   - Stores Docker images
   - Free tier (75GB storage)
   - Tags: `latest` and `<commit-sha>`

4. **Scaleway Secret Manager**
   - Stores database credentials
   - Injects secrets into container at runtime

5. **Scaleway Object Storage**
   - Stores OpenTofu state file
   - Enables state sharing between local dev and CI/CD

### Cost Breakdown (10 hours/month)

| Service | Monthly Cost | Details |
|---------|--------------|---------|
| Serverless Container | ~€0.13 | €0.00001/vCPU-second × usage |
| Serverless PostgreSQL | ~€0.54 | €0.20 storage + €0.34 compute |
| Container Registry | Free | Within 75GB free tier |
| Secret Manager | Free | Free tier |
| Object Storage (state) | ~€0.01 | Minimal storage |
| **Total** | **~€0.68/month** | |

## Infrastructure as Code (OpenTofu)

### Repository Structure

```
.github/workflows/
  ├── infrastructure.yml    # Deploy infrastructure changes
  └── deploy.yml           # Deploy application

infrastructure/
  ├── main.tf              # Main infrastructure config
  ├── variables.tf         # Input variables
  ├── outputs.tf           # Output values (endpoints, IDs)
  ├── providers.tf         # Scaleway provider config
  └── terraform.tfvars     # Non-sensitive variable values
```

### Managed Resources

OpenTofu manages:
- Container Registry namespace
- Serverless Container namespace
- Serverless Container (initial creation)
- Serverless SQL Database
- Secret Manager secret

### State Management

- **Backend:** Scaleway Object Storage
- **State file:** `s3://ws-scoring-tfstate/terraform.tfstate`
- **Locking:** Prevents concurrent modifications
- **Sharing:** Accessible from both local dev and GitHub Actions

## GitHub Actions Workflows

### 1. Infrastructure Workflow (`infrastructure.yml`)

**Trigger:** Push to `main` with changes to `infrastructure/` directory

**Steps:**
1. Checkout code
2. Setup OpenTofu
3. Initialize with remote state backend
4. Validate configuration
5. Plan changes
6. Apply changes (auto-approve on `main`)
7. Output resource IDs and endpoints

**Outputs:**
- Container Registry endpoint
- Container namespace ID
- Container ID
- Database connection string
- Secret Manager secret ID

### 2. Application Deployment Workflow (`deploy.yml`)

**Trigger:** Push to `main` (excludes `infrastructure/` changes only)

**Jobs:**

#### Job 1: Build & Test
1. Checkout code
2. Setup Bun
3. Install dependencies
4. Run linting (`bun run check`)
5. Run type checking (`bun run typecheck`)
6. Run tests (`bun run test`)
7. Build frontend (`bun run build:app`)

#### Job 2: Build Docker Image
1. Build Docker image
2. Authenticate to Scaleway Container Registry
3. Tag image:
   - `rg.fr-par.scw.cloud/ws-scoring:latest`
   - `rg.fr-par.scw.cloud/ws-scoring:<commit-sha>`
4. Push both tags

#### Job 3: Migrate Database (Safe Migration)
1. **Scale container to zero:** `min-scale=0 max-scale=0`
2. Wait for graceful shutdown (10 second timeout)
3. Fetch database credentials from Secret Manager
4. Run migration: `docker run --rm <image> bun run db:migrate`
5. If migration fails → Stop workflow, don't deploy

#### Job 4: Deploy Container
1. Update Serverless Container with new image
2. Set auto-scaling: `min-scale=0 max-scale=1`
3. Inject environment variables from Secret Manager
4. Container auto-starts on first request

**Total downtime:** ~30-60 seconds (migration + cold start)

## Environment Variables

The deployed container receives:

```bash
POSTGRESQL_CONNECTION_STRING  # From Secret Manager
PORT=8080                     # Scaleway requirement
CORS_ALLOWED_ORIGIN          # Container's public URL
NODE_ENV=production
```

## Required GitHub Secrets

```
SCW_ACCESS_KEY              # Scaleway API access key
SCW_SECRET_KEY              # Scaleway API secret key
SCW_DEFAULT_PROJECT_ID      # Scaleway project ID
SCW_DEFAULT_ORGANIZATION_ID # Scaleway organization ID
SCW_DEFAULT_REGION          # e.g., fr-par (Paris)
TF_STATE_BUCKET             # Object storage bucket name
```

## Migration Strategy

**Approach:** Migration-first with brief downtime (safest for prototype)

**Why this approach:**
- Prevents schema version mismatch between old/new code
- Acceptable downtime for prototype (~30-60 seconds)
- Simple to implement and reason about
- Rollback on migration failure

**Sequence:**
1. Stop old container (scale to 0)
2. Run database migrations
3. If migrations succeed → Deploy new container
4. If migrations fail → Keep old container, fail workflow

## Workflow Orchestration

### Scenario 1: Infrastructure Change
1. Modify `infrastructure/main.tf`
2. Push to `main`
3. `infrastructure.yml` triggers → Applies changes
4. `deploy.yml` does NOT trigger

### Scenario 2: Application Change
1. Modify app code (`src/`, `server.ts`, etc.)
2. Push to `main`
3. `deploy.yml` triggers → Builds and deploys
4. `infrastructure.yml` does NOT trigger

### Scenario 3: Both Changed
1. Both workflows run in parallel
2. `infrastructure.yml` completes first
3. `deploy.yml` uses updated infrastructure
4. OpenTofu state locking prevents conflicts

## Initial Setup

### One-Time Manual Steps

1. **Install Local Tools:**
   ```bash
   brew install opentofu scw
   scw init  # Authenticate to Scaleway
   ```

2. **Create State Bucket:**
   ```bash
   # Only manual resource needed (can't bootstrap itself)
   scw object bucket create name=ws-scoring-tfstate region=fr-par
   ```

3. **Configure GitHub Secrets:**
   - Add all 6 secrets listed above
   - Get values from `scw config get`

4. **Bootstrap Infrastructure:**
   - Push `infrastructure/` code to `main`
   - `infrastructure.yml` creates all resources

5. **First Deployment:**
   - Push application code to `main`
   - `deploy.yml` deploys the app

6. **Create First User:**
   ```bash
   # Get connection string from OpenTofu output
   POSTGRESQL_CONNECTION_STRING="$(cd infrastructure && tofu output -raw database_url)" \
     bun run users:create
   ```

## Developer Workflow

### Day-to-Day Operations

- **Code changes:** Push to `main` → Auto-deploy
- **Infrastructure changes:** Edit `infrastructure/*.tf` → Push to `main` → Auto-apply
- **Local testing:** `bun run docker:dev` (unchanged)
- **Manual deploy:** GitHub Actions UI → Run workflow manually
- **View logs:** Scaleway console → Serverless Containers → Logs
- **Database access:** `tofu output database_url`

### Cost Monitoring

- Monitor via Scaleway billing dashboard
- Set up billing alerts for unexpected usage
- Expected: ~€0.67/month for 10 hours usage

## Required Code Changes

### 1. Dockerfile

Change port from 3000 to 8080:

```dockerfile
# Before
EXPOSE 3000

# After
EXPOSE 8080
```

### 2. Server Configuration

Ensure server binds to port from environment variable (likely already done):

```typescript
const PORT = process.env.PORT || 3000;
```

## Rollback Strategy

### Application Rollback
- Redeploy previous commit SHA tag
- Or: Revert commit and push to `main`

### Infrastructure Rollback
- Revert `infrastructure/` changes in git
- Push to `main` → OpenTofu applies previous state

### Database Rollback
- Manual intervention required
- No automatic schema rollback
- Restore from backup if needed (Scaleway automatic backups)

## Security Considerations

- All credentials stored in Secret Manager (not in code)
- GitHub Secrets for API keys
- Serverless SQL Database: Enable public access only for GitHub Actions IP ranges (or use VPC)
- Container runs as non-root user (Dockerfile best practice)
- HTTPS automatically provided by Scaleway Serverless Containers

## Future Enhancements

- Add health check endpoint for container
- Implement structured logging for better observability
- Add Scaleway monitoring/alerting
- Consider VPC for database security
- Add manual workflow for user management scripts
- Implement automated database backups beyond Scaleway defaults

## Success Criteria

- ✅ Push to `main` deploys automatically
- ✅ Infrastructure defined in code (reproducible)
- ✅ Database migrations run safely
- ✅ Total cost under €1/month for prototype usage
- ✅ Scale to zero when not in use
- ✅ GDPR-compliant European hosting
