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
| `SCW_REGISTRY_ENDPOINT` | (Set after infrastructure deploy) | From infrastructure workflow output or `tofu output -raw registry_endpoint` |

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

## Step 5.5: Set Registry Endpoint Secret

After infrastructure deployment completes, add one more secret:

```bash
# Get registry endpoint from infrastructure workflow output or:
cd infrastructure
tofu output -raw registry_endpoint
```

Go to GitHub repository → Settings → Secrets and add:
- **Secret Name:** `SCW_REGISTRY_ENDPOINT`
- **Value:** The registry endpoint (e.g., `rg.fr-par.scw.cloud/ws-scoring`)

This secret is used by the deployment workflow to push Docker images.

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

After the first deployment completes, the container URL will be displayed in the GitHub Actions log.

Alternatively, query it with Scaleway CLI:

```bash
# Get namespace ID from Terraform
cd infrastructure
NAMESPACE_ID=$(tofu output -raw container_namespace_id)

# Get container URL
scw container container list namespace-id=$NAMESPACE_ID
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
