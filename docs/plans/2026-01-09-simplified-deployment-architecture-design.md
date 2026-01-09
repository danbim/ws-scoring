# Simplified Deployment Architecture Design

**Date:** 2026-01-09
**Status:** Approved
**Goal:** Simplify deployment architecture by removing complexity and maintaining robustness

## Problem Statement

The current deployment architecture has unnecessary complexity:
- Both `infrastructure.yml` and `deploy.yml` workflows interact with the same Terraform state
- The `scaleway_container` resource is managed by Terraform but updated by Scaleway CLI, creating drift
- Complex job dependencies and output passing between workflows
- The separation of infrastructure and deployment was optimized for speed but added complexity

## Design Principles

1. **Simplification over optimization** - Prefer simpler, more robust solutions even if slower
2. **Clear separation of concerns** - Terraform for infrastructure, CLI for application deployment
3. **Everything under version control** - All configuration in git, traceable changes
4. **Pragmatic error handling** - React to failures rather than pre-checking everything

## Architecture Overview

### Infrastructure (Terraform-Managed)

**Purpose:** Provision long-lived resources that rarely change

**Resources:**
- Container Registry namespace - for storing Docker images
- Container namespace - serverless container environment
- Serverless SQL Database - PostgreSQL with scale-to-zero
- IAM application, policy, and API key - for database access
- Secret Manager secret - stores database connection string

**Trigger:** Changes to `infrastructure/**` OR manual workflow dispatch

**What's Removed:** `scaleway_container` resource - eliminates Terraform/CLI drift

### Application Deployment (Scaleway CLI-Managed)

**Purpose:** Deploy application changes frequently and reliably

**Steps:**
1. Build and test application code
2. Build and push Docker image with `:latest` tag
3. Run database migrations (with brief downtime)
4. Update or create container with new image

**Trigger:** Any push to `main` OR manual workflow dispatch

**Pattern:** Update-or-create - try to update existing container, create if doesn't exist

## Workflow Details

### Infrastructure Workflow (infrastructure.yml)

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'infrastructure/**'
  workflow_dispatch:

jobs:
  terraform:
    steps:
      - Checkout code
      - Setup OpenTofu
      - Configure Scaleway credentials
      - Terraform Init (with S3 backend)
      - Terraform Validate
      - Terraform Plan
      - Terraform Apply (if main branch)
      - Display deployment info (registry, namespace IDs)
```

**Simplified:** No container creation, no complex output handling

### Deployment Workflow (deploy.yml)

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-test:
    - Install dependencies
    - Lint, typecheck, test
    - Build frontend

  build-docker:
    needs: [build-and-test]
    - Build Docker image
    - Push to ${{ secrets.SCW_REGISTRY_ENDPOINT }}/ws-scoring:latest

  migrate-database:
    needs: [build-docker]
    - Get namespace_id, database_url, secret_id from Terraform
    - Query container ID by namespace
    - Scale container to 0 (if exists, ignore error if not)
    - Wait 10 seconds
    - Run migrations via Docker

  deploy-container:
    needs: [migrate-database]
    - Get namespace_id, secret_id from Terraform
    - Query container ID by namespace
    - Try UPDATE container with new image
    - If UPDATE fails: CREATE container with full config
    - Display deployment URL
```

**Key Changes:**
- Removed `get-infrastructure-outputs` job - each job reads Terraform outputs locally
- Removed complex job output passing - simpler linear dependency
- Added update-or-create pattern - handles first deployment gracefully

## Container Configuration

When creating/updating the container via Scaleway CLI:

```bash
scw container container create \
  namespace-id=$NAMESPACE_ID \
  name=ws-scoring \
  registry-image=$SCW_REGISTRY_ENDPOINT/ws-scoring:latest \
  port=8080 \
  min-scale=0 \
  max-scale=1 \
  memory-limit=256 \
  cpu-limit=70 \
  timeout=300s \
  environment-variables.NODE_ENV=production \
  secret-environment-variables.POSTGRESQL_CONNECTION_STRING=$SECRET_ID
```

## Database Migration Strategy

**Approach:** Brief downtime during migrations (acceptable for prototype)

**Process:**
1. Scale container to 0 (graceful shutdown)
2. Wait 10 seconds for connections to close
3. Run migrations using Docker container
4. Deploy new container version (scales back to 0-1)

**Downtime:** ~30-60 seconds per deployment

## Configuration Management

### GitHub Secrets

**New secret:**
- `SCW_REGISTRY_ENDPOINT` - Set once after infrastructure deployment (e.g., `rg.fr-par.scw.cloud/ws-scoring`)

**Existing secrets:**
- `SCW_ACCESS_KEY`, `SCW_SECRET_KEY` - Scaleway API credentials
- `SCW_DEFAULT_PROJECT_ID`, `SCW_DEFAULT_ORGANIZATION_ID`, `SCW_DEFAULT_REGION`
- `TF_STATE_BUCKET` - Terraform state storage
- `DB_PASSWORD` - PostgreSQL password (legacy, not used with IAM keys)

### Terraform Outputs

**Required outputs from infrastructure:**
- `registry_endpoint` - Container registry URL
- `namespace_id` - Container namespace ID
- `database_url` - Database connection string (sensitive)
- `secret_id` - Secret Manager secret ID for POSTGRESQL_CONNECTION_STRING
- `container_namespace_id` - Same as namespace_id (for clarity)

**Removed outputs:**
- `container_id` - No longer managed by Terraform
- `container_url` - Queried dynamically or constructed from container info

## Error Handling

### Update-or-Create Pattern

Instead of pre-checking if container exists, we react to failures:

```bash
# Try update first
if ! scw container container update $CONTAINER_ID \
       registry-image=... \
       min-scale=0 max-scale=1 2>/dev/null; then
  # Update failed, create new container
  scw container container create \
    namespace-id=... \
    name=ws-scoring \
    registry-image=... \
    [full configuration]
fi
```

**Benefits:**
- Simpler logic - no conditional checks
- Handles first deployment automatically
- No manual setup steps required

### Migration Error Handling

If container doesn't exist yet (first deployment):
- Scale-to-zero command will fail silently
- Migration runs successfully (no running container to conflict)
- Container gets created in deploy step

## File Changes Summary

### Modified Files

**infrastructure/main.tf:**
- Remove `scaleway_container` resource (lines 63-87)
- Keep all other resources unchanged

**infrastructure/outputs.tf:**
- Remove `container_id`, `container_url` outputs
- Keep `registry_endpoint`, `namespace_id`, `database_url`, `secret_id`
- Add `container_namespace_id` output (alias for clarity)

**.github/workflows/infrastructure.yml:**
- Remove container-related output steps
- Workflow only applies Terraform, nothing more

**.github/workflows/deploy.yml:**
- Remove `get-infrastructure-outputs` job entirely
- Simplify `build-docker` job - use secret directly
- Modify `migrate-database` job - add error handling
- Rewrite `deploy-container` job - implement update-or-create pattern

**docs/scaleway-setup.md:**
- Add `SCW_REGISTRY_ENDPOINT` to secrets setup
- Update workflow descriptions

## Benefits of This Approach

1. **Simpler mental model** - Terraform manages infrastructure, CLI manages deployments
2. **No drift** - Container not in Terraform state, no conflicts
3. **Fewer moving parts** - Removed complex job dependencies and output passing
4. **More robust** - Error handling via try-catch pattern, not pre-checks
5. **Easier to understand** - Clear separation of concerns
6. **Zero manual setup** - First deployment creates everything needed

## Trade-offs

1. **Slightly slower** - Each deployment reads Terraform outputs separately (but negligible)
2. **Container config in workflow** - Not in Terraform (but version controlled in git)
3. **Brief downtime** - Migrations require scaling to zero (~30-60s)

These trade-offs are acceptable for a prototype application with low traffic requirements.

## Implementation Notes

1. Start by updating Terraform files (remove container resource)
2. Update infrastructure workflow (remove container output handling)
3. Rewrite deployment workflow with update-or-create pattern
4. Test infrastructure deployment first
5. Test application deployment (will create container on first run)
6. Update documentation with new setup instructions

## Success Criteria

- Infrastructure workflow only manages Terraform resources
- Deployment workflow handles container lifecycle independently
- First deployment creates container without manual steps
- Subsequent deployments update existing container
- No drift between Terraform state and actual infrastructure
- Simplified workflow logic with fewer jobs and dependencies
