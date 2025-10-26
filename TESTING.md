# Testing bots-n-cats Without Commits

## Problem
Every push to main triggers a Railway rebuild, breaking the server connection and making testing painful.

## Solutions

### 1. Use the Manual Webhook Script (EASIEST)
```bash
# Trigger a push webhook without any commit
./test-webhook.sh

# Trigger different event types
./test-webhook.sh pull_request
./test-webhook.sh deployment_status
./test-webhook.sh check_run
```

This sends a fake webhook directly to the server with proper repository info.

### 2. Redeliver Existing GitHub Webhooks (NO CODE NEEDED)
1. Go to https://github.com/I-m-A-g-I-n-E/bots-n-cats/settings/hooks
2. Click on your webhook
3. Scroll to "Recent Deliveries"
4. Click on any delivery
5. Click "Redeliver" button
6. Webhook fires again WITHOUT a commit!

### 3. Use Non-Main Branch for Testing
```bash
# Create test branch
git checkout -b test-music-$(date +%s)

# Make changes, commit, push
echo "test" >> README.md
git add README.md
git commit -m "test: music"
git push origin HEAD

# This triggers webhook but NO Railway rebuild since it's not main!
```

### 4. Local Development with Railway Env
```bash
# Install Railway CLI
npm install -g @railway/cli

# Run locally with production env vars
railway run npm run dev

# Or link to Railway project and run
railway link
railway run npm run dev
```

## Railway Configuration

The `railway.toml` now ignores markdown files:
```toml
watchPaths = ["packages/**/*.ts", "packages/**/*.js", ...]
```

So pushing README changes won't trigger rebuilds!

## Testing Workflow

**Best practice:**
1. Open browser to https://bots-n-cats-production.up.railway.app
2. Connect to stream for your repo
3. Run `./test-webhook.sh`
4. Music should play!
5. Repeat step 3 as many times as you want - no rebuilds!

**For GitHub testing:**
1. Make a test commit to non-main branch
2. OR redeliver an existing webhook from GitHub UI
3. Watch music play!

## Environment Variables

For local testing, set:
```bash
export SERVER_URL=http://localhost:3000  # For local dev
export SKIP_SIGNATURE_VALIDATION=true     # Skip webhook signature checks
```

Then run:
```bash
npm run dev  # Starts both servers with watch mode
./test-webhook.sh  # Triggers local webhook
```
