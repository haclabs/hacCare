# Setting Up simulation.haccare.app on Netlify

## Step 1: Add DNS Records

### Option A: CNAME Alias (Recommended)
1. Go to your DNS provider (e.g., Cloudflare, Namecheap)
2. Add a CNAME record:
   ```
   Type: CNAME
   Name: simulation
   Value: haccare.app (or your Netlify site URL)
   TTL: Auto or 3600
   ```

### Option B: Netlify Subdomain
1. Go to Netlify Dashboard → Site Settings → Domain Management
2. Click "Add domain alias"
3. Enter: `simulation.haccare.app`
4. Follow Netlify's DNS configuration instructions

## Step 2: Configure Netlify Redirects

Update your `netlify.toml` file:

```toml
# Existing configuration
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Add simulation subdomain handling
[[redirects]]
  from = "https://simulation.haccare.app/*"
  to = "/index.html"
  status = 200
  force = false
  
# Optional: Redirect simulation.haccare.app root to portal
[[redirects]]
  from = "https://simulation.haccare.app"
  to = "/simulation-portal"
  status = 200
```

## Step 3: Update _redirects (Alternative)

If you prefer using `public/_redirects`:

```
# Simulation subdomain
https://simulation.haccare.app/* /simulation-portal 200
/simulation-portal /index.html 200
```

## Step 4: SSL Certificate

Netlify will automatically provision an SSL certificate for your subdomain:
1. Wait 24 hours for DNS propagation
2. Netlify auto-detects the subdomain
3. SSL certificate is issued via Let's Encrypt
4. HTTPS is enabled automatically

To force SSL generation:
- Netlify Dashboard → Domain Settings → HTTPS
- Click "Verify DNS configuration"
- Click "Provision certificate"

## Step 5: Test Configuration

### Development Testing
```bash
# Add to /etc/hosts (optional for local testing)
127.0.0.1 simulation.haccare.local

# Or use query parameter
http://localhost:5173/?simulation=true
```

### Production Testing
```bash
# Test DNS resolution
nslookup simulation.haccare.app

# Test HTTPS
curl -I https://simulation.haccare.app

# Expected response:
# HTTP/2 200
# content-type: text/html
```

## Step 6: Environment-Specific Behavior

The app automatically detects the subdomain:

### Production (simulation.haccare.app)
- Auto-detects subdomain
- Routes to SimulationPortal
- Shows login for unauthenticated users

### Development (localhost)
- No subdomain detection
- Use `/simulation-portal` path directly
- Or add `?simulation=true` parameter

## Verification Checklist

- [ ] DNS CNAME record created
- [ ] Netlify recognizes subdomain
- [ ] SSL certificate issued
- [ ] `https://simulation.haccare.app` loads
- [ ] Redirects to portal for authenticated users
- [ ] Shows login for unauthenticated users
- [ ] Auto-routing works for single simulation
- [ ] Multiple simulations show selection screen
- [ ] Instructors see dashboard

## Troubleshooting

### Issue: DNS not resolving
**Solution:** 
- Wait 24-48 hours for DNS propagation
- Check TTL settings (lower = faster)
- Verify CNAME points to correct target

### Issue: SSL certificate not issued
**Solution:**
- Verify DNS is fully propagated
- Check Netlify domain settings
- Try "Renew certificate" in Netlify

### Issue: 404 on subdomain
**Solution:**
- Check netlify.toml redirects
- Verify _redirects file
- Check build output includes index.html

### Issue: Subdomain not detected in code
**Solution:**
- Check `window.location.hostname` in browser console
- Verify production environment variables
- Check `getCurrentSubdomain()` function

## Alternative Approaches

### Vercel Configuration
```json
// vercel.json
{
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/index.html",
      "has": [
        {
          "type": "host",
          "value": "simulation.haccare.app"
        }
      ]
    }
  ]
}
```

### Manual Proxy (Advanced)
```javascript
// netlify/functions/proxy.js
exports.handler = async (event) => {
  const host = event.headers.host;
  if (host.startsWith('simulation.')) {
    return {
      statusCode: 200,
      body: /* serve simulation portal */
    };
  }
};
```

## Security Notes

1. **HTTPS Only**: Always use HTTPS in production
2. **CORS**: Ensure Supabase allows requests from subdomain
3. **Authentication**: Cookies should work across subdomains
4. **CSP Headers**: Update Content-Security-Policy if needed

## Monitoring

Add monitoring to track subdomain usage:

```typescript
// Track simulation portal visits
if (window.location.hostname.startsWith('simulation.')) {
  console.log('Simulation portal accessed');
  // Optional: Send analytics event
}
```

---

**Estimated Setup Time:** 5-10 minutes (+ DNS propagation)
**Difficulty:** Easy ⭐⭐
**Prerequisites:** Domain ownership, Netlify access
