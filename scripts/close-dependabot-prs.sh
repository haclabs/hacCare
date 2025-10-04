#!/bin/bash

# Script to close Dependabot PRs by deleting remote branches
# Run this script to close all the PRs we've manually handled

echo "🚀 Closing Dependabot PRs - Safe updates already applied manually"
echo ""

# List of branches to delete (PRs to close)
branches=(
  "dependabot/npm_and_yarn/react-router-dom-7.9.1"
  "dependabot/npm_and_yarn/react-router-dom-7.9.3"
  "dependabot/npm_and_yarn/typescript-eslint/eslint-plugin-8.44.0"
  "dependabot/npm_and_yarn/vite-7.1.5"
  "dependabot/npm_and_yarn/vite-7.1.6"
  "dependabot/npm_and_yarn/vite-7.1.7"
  "dependabot/npm_and_yarn/vite-7.1.9"
  "dependabot/npm_and_yarn/vitejs/plugin-react-5.0.3"
  "dependabot/npm_and_yarn/vitejs/plugin-react-5.0.4"
)

# Delete each branch (this closes the PR)
for branch in "${branches[@]}"; do
  echo "🗑️  Closing PR: $branch"
  git push origin --delete "$branch"
  
  if [ $? -eq 0 ]; then
    echo "✅ Successfully closed: $branch"
  else
    echo "❌ Failed to close: $branch (may already be closed)"
  fi
  echo ""
done

echo "📋 Multi-dependency PRs left for manual review:"
echo "   - dependabot/npm_and_yarn/multi-6fb5dc7d23"  
echo "   - dependabot/npm_and_yarn/multi-8342154629"
echo ""
echo "🎉 Dependabot PR cleanup complete!"
echo "💡 All safe updates have been applied manually with proper testing"