#!/bin/bash

echo "🔍 Debugging haccare.app Subdomain Routing Issues"
echo "================================================="

# Check if domain resolves
echo "1. Testing DNS Resolution:"
echo "   Primary domain: haccare.app"
echo "   Tenant domain: lethpoly.haccare.app"
echo "   Test command: nslookup lethpoly.haccare.app"
echo "   Should resolve to your Netlify IP or CNAME"
echo

# Check environment variables
echo "2. Required Environment Variables (Add to Netlify):"
echo "   ✓ NODE_ENV=production"
echo "   ✓ VITE_PRODUCTION_DOMAIN=haccare.app"
echo "   ✓ VITE_SUPABASE_URL=your_supabase_url"
echo "   ✓ VITE_SUPABASE_ANON_KEY=your_supabase_key"
echo "   ✓ VITE_SUBDOMAIN_ROUTING_ENABLED=true"
echo

# Check Netlify settings
echo "3. Netlify Configuration:"
echo "   ✓ Custom domain added: haccare.app"
echo "   ✓ Wildcard domain added: *.haccare.app"
echo "   ✓ SSL enabled for both domains"
echo "   ✓ DNS records pointing to Netlify"
echo

# Check database
echo "4. Database Setup:"
echo "   ✓ Run production-subdomain-setup.sql in Supabase"
echo "   ✓ Verify tenant 'lethpoly' exists with subdomain 'lethpoly'"
echo "   ✓ Test query: SELECT name, subdomain FROM tenants WHERE subdomain='lethpoly';"
echo

echo "5. Common Issues:"
echo "   • DNS propagation can take up to 48 hours"
echo "   • Check Netlify logs for deployment errors"
echo "   • Verify SSL certificates are valid"
echo "   • Test with actual tenant subdomain URLs"
echo

echo "6. Test URLs:"
echo "   • https://haccare.app (main application)"
echo "   • https://lethpoly.haccare.app (should route to lethpoly tenant)"
echo "   • https://www.haccare.app (should work)"
