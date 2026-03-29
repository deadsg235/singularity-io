#!/bin/bash
# Update all HTML pages to use unified wallet balance loader

# List of HTML files to update
files=(
    "swap.html"
    "bot-launchpad.html" 
    "token-launchpad.html"
    "staking.html"
    "governance.html"
    "dashboard.html"
    "analytics.html"
    "network3d.html"
    "social.html"
    "investors.html"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Updating $file..."
        
        # Replace old balance loader with unified version
        sed -i 's/wallet-balance-loader\.js/wallet-balance-unified.js/g' "$file"
        
        # Add wallet-adapter.js if not present
        if ! grep -q "wallet-adapter.js" "$file"; then
            sed -i '/wallet-balance-unified\.js/a\    <script src="wallet-adapter.js"></script>' "$file"
        fi
        
        echo "✅ Updated $file"
    else
        echo "⚠️  $file not found"
    fi
done

echo "🚀 All pages updated with unified balance loader!"