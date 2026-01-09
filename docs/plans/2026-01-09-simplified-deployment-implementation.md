# Simplified Deployment Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify deployment by removing container from Terraform and using Scaleway CLI for container lifecycle management

**Architecture:** Terraform manages long-lived infrastructure (registry, database, IAM, secrets). Scaleway CLI manages container deployment with update-or-create pattern. This eliminates drift between Terraform state and actual infrastructure.

**Tech Stack:** OpenTofu/Terraform, Scaleway CLI, GitHub Actions, Docker

---

## Task 1: Remove Container Resource from Terraform

**Files:**
- Modify: `infrastructure/main.tf:63-87`

**Step 1: Remove the scaleway_container resource**

Edit `infrastructure/main.tf` and delete lines 63-87 (the entire `scaleway_container` resource block).

The file should end after the `scaleway_secret_version` resource at line 61.

**Step 2: Verify Terraform configuration is valid**

```bash
cd infrastructure
tofu validate
```

Expected output: "Success! The configuration is valid."

**Step 3: Commit**

```bash
git add infrastructure/main.tf
git commit -m "refactor: remove container resource from Terraform

Remove scaleway_container resource to eliminate drift between Terraform state and Scaleway CLI updates. Container will now be managed entirely via Scaleway CLI in the deployment workflow.

This simplifies the architecture by clearly separating infrastructure (Terraform) from application deployment (CLI)."
```

---

## Task 2: Update Terraform Outputs

**Files:**
- Modify: `infrastructure/outputs.tf:16-24`

**Step 1: Remove container-specific outputs**

Edit `infrastructure/outputs.tf` and delete lines 16-24:
- Remove `container_id` output
- Remove `container_url` output

The outputs file should now only contain:
- registry_endpoint
- registry_namespace_id
- container_namespace_id
- database_id
- database_url
- database_endpoint
- secret_id

**Step 2: Verify Terraform configuration**

```bash
cd infrastructure
tofu validate
```

Expected: Success message

**Step 3: Commit**

```bash
git add infrastructure/outputs.tf
git commit -m "refactor: remove container outputs from Terraform

Remove container_id and container_url outputs since container is no longer managed by Terraform. Container ID will be queried dynamically by deployment workflow using namespace_id."
```

---

## Task 3: Simplify Infrastructure Workflow

**Files:**
- Modify: `.github/workflows/infrastructure.yml:67-79`

**Step 1: Remove container output steps**

Edit `.github/workflows/infrastructure.yml` and delete lines 67-79:
- Remove "Output Infrastructure Values" step (lines 67-72)
- Remove "Display Deployment Info" step (lines 74-79)

The workflow should end after the "Terraform Apply" step at line 65.

**Step 2: Add simplified completion message**

Replace the deleted steps with a simple completion message:

```yaml
      - name: Display Deployment Info
        if: github.ref == 'refs/heads/main'
        run: |
          echo "✅ Infrastructure deployed successfully!"
          echo "🐳 Registry: $(tofu output -raw registry_endpoint)"
          echo "📦 Namespace: $(tofu output -raw container_namespace_id)"
```

**Step 3: Verify workflow syntax**

```bash
# Check YAML syntax
cat .github/workflows/infrastructure.yml | grep -A 5 "Display Deployment Info"
```

Expected: The new step with proper indentation

**Step 4: Commit**

```bash
git add .github/workflows/infrastructure.yml
git commit -m "refactor: simplify infrastructure workflow outputs

Remove container-specific output steps since container is no longer managed by Terraform. Display registry and namespace info only."
```

---

## Task 4: Create New Deployment Workflow - Part 1 (Setup)

**Files:**
- Modify: `.github/workflows/deploy.yml:1-49`

**Step 1: Update workflow triggers**

Edit `.github/workflows/deploy.yml` and replace lines 1-11 with:

```yaml
name: Deploy Application

on:
  push:
    branches: [main]
  workflow_dispatch:
```

Remove the `paths-ignore` filter - workflow now runs on any push to main.

**Step 2: Remove get-infrastructure-outputs job**

Delete the entire `get-infrastructure-outputs` job (lines 13-48).

**Step 3: Update build-and-test job**

The `build-and-test` job (lines 50-79) remains unchanged - just verify it's correct.

**Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "refactor(deploy): simplify workflow triggers and remove output job

- Remove paths-ignore filter for simpler trigger logic
- Remove get-infrastructure-outputs job (each job reads Terraform directly)
- Prepare for update-or-create deployment pattern"
```

---

## Task 5: Rewrite Deployment Workflow - Part 2 (Docker Build)

**Files:**
- Modify: `.github/workflows/deploy.yml:80-118`

**Step 1: Simplify build-docker job dependencies and outputs**

Replace lines 80-118 with:

```yaml
  build-docker:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    needs: [build-and-test]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Scaleway Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ secrets.SCW_REGISTRY_ENDPOINT }}
          username: nologin
          password: ${{ secrets.SCW_SECRET_KEY }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ secrets.SCW_REGISTRY_ENDPOINT }}/ws-scoring
          tags: |
            type=raw,value=latest

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

Key changes:
- Remove dependency on `get-infrastructure-outputs`
- Use `${{ secrets.SCW_REGISTRY_ENDPOINT }}` directly
- Simplify tags to only `:latest`
- Remove `outputs` section

**Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "refactor(deploy): simplify Docker build job

- Use SCW_REGISTRY_ENDPOINT secret directly instead of Terraform output
- Simplify to only build :latest tag
- Remove complex job dependencies"
```

---

## Task 6: Rewrite Deployment Workflow - Part 3 (Database Migration)

**Files:**
- Modify: `.github/workflows/deploy.yml:120-174`

**Step 1: Rewrite migrate-database job**

Replace lines 120-174 with:

```yaml
  migrate-database:
    name: Migrate Database
    runs-on: ubuntu-latest
    needs: [build-docker]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: '1.6.0'

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
            -backend-config="secret_key=${{ secrets.SCW_SECRET_KEY }}" \
            -backend-config="region=${{ secrets.SCW_DEFAULT_REGION }}" \
            -backend-config="endpoint=https://s3.${{ secrets.SCW_DEFAULT_REGION }}.scw.cloud"

          echo "NAMESPACE_ID=$(tofu output -raw container_namespace_id)" >> $GITHUB_ENV
          echo "DATABASE_URL=$(tofu output -raw database_url)" >> $GITHUB_ENV

      - name: Get container ID
        run: |
          CONTAINER_ID=$(scw container container list namespace-id=${{ env.NAMESPACE_ID }} -o json | jq -r '.[0].id // empty')
          echo "CONTAINER_ID=$CONTAINER_ID" >> $GITHUB_ENV

      - name: Scale container to zero (if exists)
        if: env.CONTAINER_ID != ''
        run: |
          scw container container update ${{ env.CONTAINER_ID }} \
            min-scale=0 max-scale=0 || echo "Container scaling failed, continuing anyway"

      - name: Wait for graceful shutdown
        if: env.CONTAINER_ID != ''
        run: sleep 10

      - name: Run database migrations
        run: |
          docker run --rm \
            -e POSTGRESQL_CONNECTION_STRING="${{ env.DATABASE_URL }}" \
            ${{ secrets.SCW_REGISTRY_ENDPOINT }}/ws-scoring:latest \
            bun run db:migrate
```

Key changes:
- Query container ID dynamically by namespace
- Conditional scaling (only if container exists)
- Graceful error handling for first deployment

**Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "refactor(deploy): add dynamic container lookup to migration

- Query container ID by namespace instead of Terraform output
- Add conditional scaling (skip if container doesn't exist yet)
- Graceful error handling for first deployment"
```

---

## Task 7: Rewrite Deployment Workflow - Part 4 (Container Deployment)

**Files:**
- Modify: `.github/workflows/deploy.yml:176-225`

**Step 1: Rewrite deploy-container job with update-or-create pattern**

Replace lines 176-225 with:

```yaml
  deploy-container:
    name: Deploy Container
    runs-on: ubuntu-latest
    needs: [migrate-database]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: '1.6.0'

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
            -backend-config="secret_key=${{ secrets.SCW_SECRET_KEY }}" \
            -backend-config="region=${{ secrets.SCW_DEFAULT_REGION }}" \
            -backend-config="endpoint=https://s3.${{ secrets.SCW_DEFAULT_REGION }}.scw.cloud"

          echo "NAMESPACE_ID=$(tofu output -raw container_namespace_id)" >> $GITHUB_ENV
          echo "SECRET_ID=$(tofu output -raw secret_id)" >> $GITHUB_ENV

      - name: Get container ID
        run: |
          CONTAINER_ID=$(scw container container list namespace-id=${{ env.NAMESPACE_ID }} -o json | jq -r '.[0].id // empty')
          echo "CONTAINER_ID=$CONTAINER_ID" >> $GITHUB_ENV

      - name: Deploy container (update or create)
        run: |
          if [ -n "${{ env.CONTAINER_ID }}" ]; then
            echo "Updating existing container: ${{ env.CONTAINER_ID }}"
            scw container container update ${{ env.CONTAINER_ID }} \
              registry-image=${{ secrets.SCW_REGISTRY_ENDPOINT }}/ws-scoring:latest \
              min-scale=0 \
              max-scale=1
          else
            echo "Creating new container"
            scw container container create \
              namespace-id=${{ env.NAMESPACE_ID }} \
              name=ws-scoring \
              registry-image=${{ secrets.SCW_REGISTRY_ENDPOINT }}/ws-scoring:latest \
              port=8080 \
              min-scale=0 \
              max-scale=1 \
              memory-limit=256 \
              cpu-limit=70 \
              timeout=300s \
              env-vars.NODE_ENV=production \
              secret-env-vars.POSTGRESQL_CONNECTION_STRING=${{ env.SECRET_ID }}
          fi

      - name: Get container URL
        run: |
          # Wait a moment for container to be ready
          sleep 5
          CONTAINER_ID=$(scw container container list namespace-id=${{ env.NAMESPACE_ID }} -o json | jq -r '.[0].id')
          CONTAINER_URL=$(scw container container get $CONTAINER_ID -o json | jq -r '.domain_name')
          echo "CONTAINER_URL=https://$CONTAINER_URL" >> $GITHUB_ENV

      - name: Display deployment info
        run: |
          echo "✅ Deployment successful!"
          echo "🚀 Application URL: ${{ env.CONTAINER_URL }}"
```

Key changes:
- Update-or-create pattern with conditional logic
- Full container configuration on create
- Dynamic URL retrieval after deployment

**Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "refactor(deploy): implement update-or-create container deployment

- Query container by namespace ID dynamically
- Try update first, create if doesn't exist
- Full container configuration on create (memory, CPU, env vars, secrets)
- Dynamic URL retrieval after deployment"
```

---

## Task 8: Update Setup Documentation

**Files:**
- Modify: `docs/scaleway-setup.md:45-56`

**Step 1: Add SCW_REGISTRY_ENDPOINT to secrets table**

Edit `docs/scaleway-setup.md` and update the secrets table (lines 45-56):

```markdown
| Secret Name | Value | Where to Find |
|-------------|-------|---------------|
| `SCW_ACCESS_KEY` | Your access key | `scw config get access-key` |
| `SCW_SECRET_KEY` | Your secret key | `scw config get secret-key` |
| `SCW_DEFAULT_PROJECT_ID` | Project ID | `scw config get default-project-id` |
| `SCW_DEFAULT_ORGANIZATION_ID` | Organization ID | `scw config get default-organization-id` |
| `SCW_DEFAULT_REGION` | Region (e.g., fr-par) | `scw config get default-region` |
| `TF_STATE_BUCKET` | ws-scoring-tfstate | Bucket name from Step 2 |
| `SCW_REGISTRY_ENDPOINT` | (Set after infrastructure deploy) | From infrastructure workflow output or `tofu output -raw registry_endpoint` |
```

**Step 2: Update verification steps**

Replace lines 119-125 with:

```markdown
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
```

**Step 3: Add note about SCW_REGISTRY_ENDPOINT**

Add a new section after Step 5:

```markdown
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
```

**Step 4: Commit**

```bash
git add docs/scaleway-setup.md
git commit -m "docs: update setup guide for simplified deployment

- Add SCW_REGISTRY_ENDPOINT secret requirement
- Update container URL retrieval instructions
- Add step to set registry endpoint after infrastructure deploy
- Remove references to container_url Terraform output"
```

---

## Task 9: Test Infrastructure Deployment

**Files:**
- None (testing only)

**Step 1: Push changes to trigger workflow**

```bash
git push origin main
```

**Step 2: Monitor infrastructure workflow**

Go to GitHub Actions and watch the "Deploy Infrastructure" workflow.

Expected:
- Terraform Init: Success
- Terraform Validate: Success
- Terraform Plan: Success (shows removal of container resource)
- Terraform Apply: Success
- Display Deployment Info: Shows registry and namespace

**Step 3: Verify infrastructure locally**

```bash
cd infrastructure

# Initialize Terraform (if not already done)
tofu init \
  -backend-config="bucket=<TF_STATE_BUCKET>" \
  -backend-config="access_key=<SCW_ACCESS_KEY>" \
  -backend-config="secret_key=<SCW_SECRET_KEY>" \
  -backend-config="region=<SCW_DEFAULT_REGION>" \
  -backend-config="endpoint=https://s3.<SCW_DEFAULT_REGION>.scw.cloud"

# Check outputs
tofu output

# Verify container outputs are gone
tofu output container_id 2>&1 | grep "not found"
tofu output container_url 2>&1 | grep "not found"
```

Expected: container_id and container_url outputs should not exist

**Step 4: Set SCW_REGISTRY_ENDPOINT secret**

```bash
# Get registry endpoint
cd infrastructure
tofu output -raw registry_endpoint
```

Go to GitHub → Settings → Secrets → Actions and add `SCW_REGISTRY_ENDPOINT` with the value.

---

## Task 10: Test Application Deployment

**Files:**
- None (testing only)

**Step 1: Trigger deployment workflow manually**

Go to GitHub Actions → Deploy Application → Run workflow

**Step 2: Monitor deployment**

Watch the workflow progress through:
- Build and Test: Should pass
- Build Docker: Should push to registry successfully
- Migrate Database: Should handle missing container gracefully
- Deploy Container: Should CREATE new container (first deployment)

**Step 3: Verify container was created**

```bash
# Get namespace ID
cd infrastructure
NAMESPACE_ID=$(tofu output -raw container_namespace_id)

# List containers
scw container container list namespace-id=$NAMESPACE_ID

# Get container details
CONTAINER_ID=$(scw container container list namespace-id=$NAMESPACE_ID -o json | jq -r '.[0].id')
scw container container get $CONTAINER_ID
```

Expected: One container named "ws-scoring" with correct configuration

**Step 4: Test container update**

Make a trivial change to trigger redeployment:

```bash
# Add a comment to any app file
echo "// Test update" >> src/index.ts
git add src/index.ts
git commit -m "test: trigger container update"
git push origin main
```

Watch workflow - this time it should UPDATE the existing container instead of creating a new one.

---

## Task 11: Final Verification and Cleanup

**Files:**
- None (verification only)

**Step 1: Verify complete workflow**

Ensure these scenarios work:
- ✅ Infrastructure changes trigger infrastructure.yml
- ✅ App changes trigger deploy.yml
- ✅ First deployment creates container
- ✅ Subsequent deployments update container
- ✅ Migrations run successfully
- ✅ Container scales correctly (0-1)

**Step 2: Check container logs**

```bash
NAMESPACE_ID=$(cd infrastructure && tofu output -raw container_namespace_id)
CONTAINER_ID=$(scw container container list namespace-id=$NAMESPACE_ID -o json | jq -r '.[0].id')

scw container container logs $CONTAINER_ID
```

Expected: Application starting successfully, no errors

**Step 3: Access application**

```bash
CONTAINER_URL=$(scw container container get $CONTAINER_ID -o json | jq -r '.domain_name')
open "https://$CONTAINER_URL"
```

Expected: Application loads successfully

**Step 4: Document completion**

Create a final commit documenting the changes:

```bash
git commit --allow-empty -m "chore: complete simplified deployment architecture migration

Summary of changes:
- Removed scaleway_container from Terraform (eliminates drift)
- Simplified infrastructure workflow (only manages infrastructure)
- Rewrote deployment workflow with update-or-create pattern
- Added SCW_REGISTRY_ENDPOINT secret for registry access
- Updated documentation

Benefits:
- Clearer separation of concerns
- No Terraform/CLI drift
- Simpler workflow logic
- Zero manual setup for first deployment
- More robust error handling

All tests passing, deployment verified."
```

---

## Rollback Plan

If issues arise, rollback by:

1. Revert all commits: `git revert <commit-range>`
2. Redeploy infrastructure: Trigger infrastructure.yml workflow
3. Redeploy application: Trigger deploy.yml workflow

The previous approach will be restored.

## Success Criteria

- [ ] Infrastructure workflow deploys without errors
- [ ] Deployment workflow creates container on first run
- [ ] Deployment workflow updates container on subsequent runs
- [ ] Migrations run successfully with brief downtime
- [ ] Application is accessible via container URL
- [ ] No Terraform drift between CLI and state
- [ ] Documentation updated with new secret requirement
