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
