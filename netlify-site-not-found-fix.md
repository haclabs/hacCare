# Netlify Subdomain "Site not found" Troubleshooting

## The Issue
Getting "Site not found" on lethpoly.haccare.app means Netlify doesn't recognize this subdomain as belonging to your site.

## Diagnosis Steps

### 1. Check Netlify Domain Configuration
1. Go to your Netlify dashboard
2. Navigate to your haccare site
3. Go to **Site settings** → **Domain management**
4. Check what domains are listed

**Expected setup:**
- Primary domain: `haccare.app` 
- Domain aliases: `*.haccare.app` (wildcard)
- OR individual: `lethpoly.haccare.app`

### 2. Verify DNS Settings
Check your DNS provider (where you bought haccare.app):

**Required DNS records:**
```
Type: CNAME
Name: *
Value: [your-netlify-site].netlify.app
```

OR individual:
```
Type: CNAME  
Name: lethpoly
Value: [your-netlify-site].netlify.app
```

### 3. Check Netlify Site Name
Make sure you know your exact Netlify site name (looks like: `amazing-site-123456.netlify.app`)

## Quick Fixes

### Option A: Add Subdomain Manually
If wildcard isn't working, add the specific subdomain:
1. Netlify dashboard → Your site → Domain settings
2. Click "Add custom domain"
3. Enter: `lethpoly.haccare.app`
4. Follow DNS setup instructions

### Option B: Verify Wildcard Setup
1. Check if `*.haccare.app` is properly configured
2. Ensure DNS propagation is complete (can take up to 48 hours)
3. Test with: `dig lethpoly.haccare.app` or online DNS checker

### Option C: Temporary Test
Try accessing your main site first:
- Does `haccare.app` work?
- Does `www.haccare.app` work?

This helps isolate if it's a subdomain-specific issue or broader DNS problem.
