# Fix Netlify 404 for Subdomains - Manual Steps

## The Problem
Getting a 404 error means Netlify's server isn't serving your app for subdomains, even though DNS works.

## Solution: Manual Netlify Configuration

### Step 1: Add Domain Aliases in Netlify Dashboard
1. Go to **Netlify Dashboard** → Your Site (`adorable-puppy-ff302c`)
2. **Site settings** → **Domain management** 
3. Under **Custom domains**, click **"Add domain alias"**
4. Add: `*.haccare.app`
5. If that doesn't work, try adding specifically: `lethpoly.haccare.app`

### Step 2: Check Domain Configuration
In your domain management, you should see:
- ✅ `adorable-puppy-ff302c.netlify.app` (Primary)
- ✅ `haccare.app` (Custom domain) 
- ✅ `*.haccare.app` (Domain alias) OR `lethpoly.haccare.app` (Domain alias)

### Step 3: Alternative - Use Branch Subdomains
If the above doesn't work, try:
1. **Site settings** → **Domain management** → **Branch subdomains**
2. Enable branch subdomains
3. This sometimes helps with wildcard routing

### Step 4: Check Deploy Settings
1. **Site settings** → **Build & deploy** → **Deploy contexts**
2. Ensure "Production branch" is set to `dev` (your active branch)
3. Make sure latest deployment succeeded

## Why This Happens
- Netlify's wildcard domain support can be inconsistent
- Sometimes requires explicit configuration in dashboard
- DNS works but Netlify routing doesn't recognize the subdomain

## Test Steps
After making changes:
1. Wait 2-3 minutes for propagation
2. Try `lethpoly.haccare.app` again
3. If still 404, try clearing DNS cache: `ipconfig /flushdns` (Windows)

## Last Resort: Create Specific Redirect
If all else fails, we can create a specific redirect rule for lethpoly subdomain.
