#!/bin/bash

# Netlify API Subdomain Management Script
# Requires: NETLIFY_TOKEN environment variable

set -e

# Configuration
NETLIFY_TOKEN="${NETLIFY_TOKEN}"
SITE_NAME="adorable-puppy-ff302c"  # Your Netlify site name
SUBDOMAIN="lethpoly.haccare.app"
BASE_API="https://api.netlify.com/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔧 Netlify Subdomain Management Script"
echo "======================================="

# Check if token is provided
if [ -z "$NETLIFY_TOKEN" ]; then
    echo -e "${RED}❌ Error: NETLIFY_TOKEN environment variable not set${NC}"
    echo "Please set your Netlify personal access token:"
    echo "export NETLIFY_TOKEN='your_token_here'"
    exit 1
fi

# Function to make API calls
api_call() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
             -H "Authorization: Bearer $NETLIFY_TOKEN" \
             -H "Content-Type: application/json" \
             -d "$data" \
             "$BASE_API$endpoint"
    else
        curl -s -X "$method" \
             -H "Authorization: Bearer $NETLIFY_TOKEN" \
             "$BASE_API$endpoint"
    fi
}

echo "🔍 Step 1: Finding your site..."

# Get all sites and find the one we want
sites_response=$(api_call "GET" "/sites")
site_id=$(echo "$sites_response" | grep -o '"id":"[^"]*"' | grep -A1 -B1 "$SITE_NAME" | grep '"id":' | cut -d'"' -f4 | head -1)

if [ -z "$site_id" ]; then
    echo -e "${RED}❌ Could not find site with name: $SITE_NAME${NC}"
    echo "Available sites:"
    echo "$sites_response" | grep -o '"name":"[^"]*"' | cut -d'"' -f4
    exit 1
fi

echo -e "${GREEN}✅ Found site: $SITE_NAME (ID: $site_id)${NC}"

echo "🔍 Step 2: Checking current domains..."

# Get current site domains
current_domains=$(api_call "GET" "/sites/$site_id")
echo "Current domains for site:"
echo "$current_domains" | grep -o '"custom_domain":"[^"]*"' | cut -d'"' -f4

echo "🔧 Step 3: Adding subdomain..."

# Add the subdomain
add_domain_data="{\"domain\":\"$SUBDOMAIN\"}"
add_response=$(api_call "POST" "/sites/$site_id/domains" "$add_domain_data")

if echo "$add_response" | grep -q "error"; then
    echo -e "${RED}❌ Error adding domain:${NC}"
    echo "$add_response"
    exit 1
else
    echo -e "${GREEN}✅ Successfully added domain: $SUBDOMAIN${NC}"
fi

echo "🎯 Step 4: Verifying domain was added..."

# Verify the domain was added
updated_domains=$(api_call "GET" "/sites/$site_id")
if echo "$updated_domains" | grep -q "$SUBDOMAIN"; then
    echo -e "${GREEN}✅ Domain verification successful!${NC}"
    echo -e "${YELLOW}🚀 You should now be able to access: https://$SUBDOMAIN${NC}"
else
    echo -e "${RED}❌ Domain verification failed${NC}"
fi

echo ""
echo "📋 Summary:"
echo "- Site ID: $site_id"
echo "- Added domain: $SUBDOMAIN"
echo "- Status: Complete"
echo ""
echo "🔄 Next steps:"
echo "1. Wait 1-2 minutes for SSL certificate provisioning"
echo "2. Test: https://$SUBDOMAIN"
echo "3. Check browser console for subdomain detection logs"
