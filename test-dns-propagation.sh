#!/bin/bash

# Test DNS propagation for lethpoly.haccare.app
echo "🧪 Testing DNS propagation for lethpoly.haccare.app..."
echo ""

# Test with dig (if available)
echo "=== DIG Test ==="
if command -v dig &> /dev/null; then
    dig lethpoly.haccare.app CNAME
else
    echo "dig command not available"
fi

echo ""
echo "=== NSLOOKUP Test ==="
if command -v nslookup &> /dev/null; then
    nslookup lethpoly.haccare.app
else
    echo "nslookup command not available"
fi

echo ""
echo "=== Manual Check ==="
echo "You can also check DNS propagation manually at:"
echo "- https://www.whatsmydns.net/#CNAME/lethpoly.haccare.app"
echo "- https://dnschecker.org/"
echo ""
echo "Look for the CNAME record pointing to your Netlify site URL"
