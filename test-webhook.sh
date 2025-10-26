#!/bin/bash
# Manual webhook trigger for testing - no commits needed!
# Usage: ./test-webhook.sh [event-type]

EVENT_TYPE=${1:-push}
SERVER_URL=${SERVER_URL:-https://bots-n-cats-production.up.railway.app}

echo "🎵 Triggering $EVENT_TYPE webhook to $SERVER_URL"

curl -X POST "$SERVER_URL/webhook" \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: $EVENT_TYPE" \
  -H "X-GitHub-Delivery: manual-test-$(date +%s)" \
  -d '{
    "action": "opened",
    "repository": {
      "full_name": "I-m-A-g-I-n-E/bots-n-cats",
      "name": "bots-n-cats",
      "owner": {
        "login": "I-m-A-g-I-n-E"
      }
    },
    "sender": {
      "login": "test-user"
    },
    "commits": [
      {
        "id": "abc123def456",
        "message": "Test commit for music",
        "author": {
          "name": "Test User",
          "username": "test-user"
        },
        "added": ["file1.ts"],
        "removed": [],
        "modified": ["file2.ts"]
      }
    ],
    "ref": "refs/heads/main",
    "forced": false
  }'

echo ""
echo "✅ Webhook sent! Check your browser for music 🎶"
