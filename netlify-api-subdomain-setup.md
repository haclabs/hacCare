# Netlify API Subdomain Management with Personal Access Token

## Security & Automation Benefits
- ✅ Programmatic subdomain creation
- ✅ No manual dashboard work needed
- ✅ Token-based authentication (revocable)
- ✅ Audit trail of API calls
- ✅ Can be integrated into deployment pipeline

## Step 1: Create Netlify Personal Access Token

### In Netlify Dashboard:
1. Go to **User settings** → **Applications** → **Personal access tokens**
2. Click **"New access token"**
3. Name: `hacCare Subdomain Management`
4. Scopes needed:
   - `sites:read` (to list sites)
   - `sites:write` (to modify domain settings)
   - `dns:read` (if using Netlify DNS)
   - `dns:write` (if using Netlify DNS)
5. Save the token securely (write it down - you won't see it again)

## Step 2: Get Your Site ID

First, we need to identify your site ID. We can use the API to find it.

## Step 3: Add Subdomain via API

Using the Netlify API, we can add domain aliases programmatically.

## Security Considerations
- ✅ Token can be revoked anytime
- ✅ Limited scope permissions
- ✅ API calls are logged
- ✅ No need to share dashboard access
- ✅ Can be automated in CI/CD

## Implementation Options
1. **One-time script** - Just add lethpoly.haccare.app
2. **Automated system** - Dynamic subdomain creation for new tenants
3. **CI/CD integration** - Auto-deploy with subdomain setup
