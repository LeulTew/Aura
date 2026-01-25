#!/bin/bash

# Usage: ./check_prod.sh https://your-cloud-run-url.run.app

URL=$1

if [ -z "$URL" ]; then
    echo "Usage: $0 <URL>"
    exit 1
fi

echo "Checking health of $URL..."

# 1. Root Check
echo "GET /"
curl -s "$URL/" | python3 -m json.tool

# 2. Health Check
echo "GET /health"
curl -s "$URL/health" | python3 -m json.tool

# 3. Docs Check (HEAD request)
echo "Checking /docs accessibility..."
STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" "$URL/docs")
if [ "$STATUS" == "200" ]; then
    echo "/docs is ACCESSIBLE (200 OK)"
else
    echo "/docs returned $STATUS"
fi
