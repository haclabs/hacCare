# Production Deployment Guide

This guide covers deploying your multi-tenant healthcare application with subdomain routing.

## Prerequisites

- Domain name (e.g., `healthcareapp.com`)
- SSL certificate (recommended: Let's Encrypt wildcard certificate)
- DNS management access
- Hosting platform (Vercel, Netlify, AWS, or similar)

## 1. DNS Configuration

### Wildcard DNS Setup
Configure your DNS to point all subdomains to your application:

```
Type: A
Name: *
Value: YOUR_SERVER_IP

Type: CNAME  
Name: *
Value: your-app.vercel.app (for Vercel deployment)
```

### Example DNS Records
```
healthcareapp.com           → Main application
hospital1.healthcareapp.com → Hospital 1 tenant
clinic2.healthcareapp.com   → Clinic 2 tenant
admin.healthcareapp.com     → Super admin dashboard
```

## 2. Environment Variables

Add these environment variables to your production deployment:

```env
# Production Environment
NODE_ENV=production
VITE_PRODUCTION_DOMAIN=healthcareapp.com

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

# Optional: Subdomain Configuration
VITE_SUBDOMAIN_ROUTING_ENABLED=true
VITE_DEFAULT_SUBDOMAIN=www
```

## 3. Database Setup

### Add Subdomain Column to Tenants Table

Run this SQL in your Supabase database:

```sql
-- Add subdomain column if not exists
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS subdomain VARCHAR(50) UNIQUE;

-- Create index for faster subdomain lookups
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain 
ON tenants(subdomain);

-- Update existing tenants with subdomains
UPDATE tenants 
SET subdomain = LOWER(REPLACE(name, ' ', ''))
WHERE subdomain IS NULL;

-- Add constraint to ensure subdomain uniqueness
ALTER TABLE tenants 
ADD CONSTRAINT unique_subdomain UNIQUE (subdomain);
```

## 4. SSL Certificate Setup

### Option A: Let's Encrypt Wildcard Certificate
```bash
# Install certbot
sudo apt-get install certbot

# Generate wildcard certificate
sudo certbot certonly --manual \
  --preferred-challenges=dns \
  --email your-email@example.com \
  --server https://acme-v02.api.letsencrypt.org/directory \
  --agree-tos \
  -d *.healthcareapp.com \
  -d healthcareapp.com
```

### Option B: Cloudflare SSL (Recommended)
1. Add your domain to Cloudflare
2. Enable "Full (strict)" SSL mode
3. Enable "Always Use HTTPS"
4. Cloudflare automatically handles wildcard SSL

## 5. Deployment Platforms

### Vercel Deployment

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Create `vercel.json`:**
```json
{
  "functions": {
    "src/api/**/*.ts": {
      "runtime": "@vercel/node"
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

3. **Deploy:**
```bash
vercel --prod
```

4. **Configure Domain:**
- Add your domain in Vercel dashboard
- Configure wildcard subdomain: `*.healthcareapp.com`

### Netlify Deployment

1. **Create `netlify.toml`:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_ENV = "production"
```

2. **Deploy via Git or CLI:**
```bash
netlify deploy --prod --dir=dist
```

### AWS S3 + CloudFront

1. **Build the application:**
```bash
npm run build
```

2. **Upload to S3:**
```bash
aws s3 sync dist/ s3://your-bucket-name --delete
```

3. **Configure CloudFront:**
- Create distribution with wildcard SSL certificate
- Configure custom error pages for SPA routing
- Set up subdomain routing

## 6. Application Configuration

### Environment Detection
The application automatically detects production environment and enables subdomain routing:

```typescript
// Automatically enabled in production
const isProduction = process.env.NODE_ENV === 'production';
const subdomain = subdomainService.getCurrentSubdomain();
```

### Tenant Routing Logic
1. **Subdomain Detection:** Extract subdomain from URL
2. **Tenant Resolution:** Look up tenant by subdomain in database
3. **Automatic Login:** Redirect to tenant-specific login
4. **Fallback:** If no subdomain, show tenant selector

## 7. Security Considerations

### HTTPS Enforcement
```typescript
// Redirect HTTP to HTTPS in production
if (location.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
  location.replace(`https:${location.href.substring(location.protocol.length)}`);
}
```

### Content Security Policy
Add to your `index.html`:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline';
               connect-src 'self' https://*.supabase.co;">
```

### CORS Configuration
Update Supabase CORS settings to allow your domain:
```
https://healthcareapp.com
https://*.healthcareapp.com
```

## 8. Monitoring & Analytics

### Health Checks
```typescript
// Add health check endpoint
export const healthCheck = async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  };
};
```

### Error Tracking
Consider integrating:
- Sentry for error tracking
- LogRocket for session recording
- Google Analytics for usage metrics

## 9. Backup & Disaster Recovery

### Database Backups
```sql
-- Enable Point-in-Time Recovery in Supabase
-- Set up automated daily backups
-- Test restore procedures regularly
```

### Application Backups
- Version control with Git
- Automated deployment pipelines
- Infrastructure as Code (Terraform/CDK)

## 10. Performance Optimization

### CDN Configuration
- Enable gzip compression
- Set proper cache headers
- Optimize images and assets
- Use service workers for offline functionality

### Database Optimization
```sql
-- Optimize tenant queries
CREATE INDEX CONCURRENTLY idx_patients_tenant_id ON patients(tenant_id);
CREATE INDEX CONCURRENTLY idx_alerts_tenant_id ON alerts(tenant_id);

-- Vacuum and analyze regularly
VACUUM ANALYZE;
```

## Testing Subdomain Routing

### Local Testing with hosts file
Add to `/etc/hosts`:
```
127.0.0.1 hospital1.localhost
127.0.0.1 clinic2.localhost
127.0.0.1 admin.localhost
```

### Production Testing
1. Create test tenants with subdomains
2. Verify SSL certificates work for all subdomains
3. Test tenant isolation
4. Verify super admin can switch between tenants
5. Test error handling for invalid subdomains

## Troubleshooting

### Common Issues

1. **Subdomain not resolving:**
   - Check DNS propagation
   - Verify wildcard DNS record
   - Check SSL certificate covers wildcard

2. **Tenant not found:**
   - Verify tenant exists in database
   - Check subdomain matches exactly
   - Ensure tenant status is 'active'

3. **Authentication issues:**
   - Check Supabase URL configuration
   - Verify CORS settings
   - Check token expiration

### Debug Commands
```bash
# Check DNS resolution
nslookup hospital1.healthcareapp.com

# Test SSL certificate
openssl s_client -connect hospital1.healthcareapp.com:443

# Check application logs
vercel logs --follow
```

## Support

For issues related to:
- DNS: Contact your domain registrar
- SSL: Check certificate provider documentation
- Deployment: Refer to hosting platform docs
- Application: Check application logs and error tracking

Remember to test thoroughly in a staging environment before deploying to production!
