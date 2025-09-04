#!/usr/bin/env node

/**
 * Production Cleanup Script
 * 
 * This script prepares the hacCare codebase for production deployment by:
 * 1. Removing development test files
 * 2. Cleaning up temporary and debug files  
 * 3. Removing backup and archive files
 * 4. Consolidating documentation
 * 5. Optimizing the project structure
 * 
 * Usage: node scripts/cleanup/production-cleanup.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}🧹 ${msg}${colors.reset}\n`)
};

class ProductionCleanup {
  constructor(dryRun = false) {
    this.dryRun = dryRun;
    this.deletedFiles = [];
    this.deletedDirs = [];
    this.movedFiles = [];
    this.modifiedFiles = [];
    this.rootDir = process.cwd();
  }

  /**
   * Files and directories to remove for production
   */
  getCleanupTargets() {
    return {
      // Root-level test and debug files
      rootTestFiles: [
        'test-acknowledgment.js',
        'test-deduplication.js', 
        'test-dark-mode.html',
        'test-subdomain-detection.html',
        'test-dns-propagation.sh',
        'clear-browser-cache.js',
        'force-refresh-tenant-context.js',
        'debug-lethpoly.sh',
        'debug-subdomain.sh'
      ],

      // Temporary documentation files
      tempDocs: [
        'fix-netlify-subdomain-404.md',
        'netlify-404-fix.md', 
        'netlify-api-subdomain-setup.md',
        'netlify-site-not-found-fix.md',
        'netlify-subdomain-troubleshooting.md',
        'netlify.toml.backup',
        'netlify.toml.new'
      ],

      // Archive and backup directories
      archiveDirs: [
        'archive/temporary-test-files',
        'archive/cleanup-backup'
      ],

      // Backup files in src
      backupFiles: [
        'src/main_backup.tsx',
        'src/contexts/AuthContext-backup.tsx', 
        'src/components/Auth/ProtectedRoute-backup.tsx',
        'src/components/Patients/records/PatientDetail.tsx.backup',
        'src/components/Patients/records/PatientCard_backup.tsx'
      ],

      // Development test directories
      devTestDirs: [
        'tests/integration',
        'tests/unit'
      ],

      // Environment template files (keep .env.example)
      envTemplates: [
        '.env.production.template',
        '.env.security.template'
      ],

      // Development diagnostic scripts
      diagnosticScripts: [
        'scripts/diagnostics/test-medication-fetch.js'
      ]
    };
  }

  /**
   * Files to keep in production
   */
  getProductionKeepList() {
    return [
      // Essential configuration
      '.env.example',
      '.env.production.example', 
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'tsconfig.app.json', 
      'tsconfig.node.json',
      'vite.config.ts',
      'tailwind.config.js',
      'postcss.config.js',
      'netlify.toml',
      'vercel.json',

      // Essential documentation
      'README.md',
      'LICENSE',
      'CHANGELOG.md',

      // Core source code
      'src/',
      'public/',
      'index.html',

      // Production deployment configs
      'scripts/setup/',
      'scripts/utilities/',
      'sql-patches/setup/',
      'sql-patches/fixes/',
      'supabase/',
      
      // Essential docs
      'docs/README.md',
      'docs/PRODUCTION_DEPLOYMENT.md',
      'docs/COMPLETE_SYSTEM_DOCUMENTATION.md'
    ];
  }

  /**
   * Remove a file or directory
   */
  remove(targetPath) {
    const fullPath = path.resolve(this.rootDir, targetPath);
    
    if (!fs.existsSync(fullPath)) {
      log.warning(`File not found: ${targetPath}`);
      return false;
    }

    if (this.dryRun) {
      log.info(`[DRY RUN] Would delete: ${targetPath}`);
      return true;
    }

    try {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        this.deletedDirs.push(targetPath);
        log.success(`Deleted directory: ${targetPath}`);
      } else {
        fs.unlinkSync(fullPath);
        this.deletedFiles.push(targetPath);
        log.success(`Deleted file: ${targetPath}`);
      }
      return true;
    } catch (error) {
      log.error(`Failed to delete ${targetPath}: ${error.message}`);
      return false;
    }
  }

  /**
   * Clean up test files
   */
  cleanupTestFiles() {
    log.header('Cleaning up test and debug files');
    
    const targets = this.getCleanupTargets();
    
    // Remove root test files
    targets.rootTestFiles.forEach(file => this.remove(file));
    
    // Remove temporary documentation
    targets.tempDocs.forEach(file => this.remove(file));
    
    // Remove diagnostic scripts
    targets.diagnosticScripts.forEach(file => this.remove(file));
  }

  /**
   * Clean up backup and archive files
   */
  cleanupBackupFiles() {
    log.header('Cleaning up backup and archive files');
    
    const targets = this.getCleanupTargets();
    
    // Remove backup files
    targets.backupFiles.forEach(file => this.remove(file));
    
    // Remove archive directories
    targets.archiveDirs.forEach(dir => this.remove(dir));
    
    // Remove environment templates
    targets.envTemplates.forEach(file => this.remove(file));
  }

  /**
   * Clean up development test directories
   */
  cleanupDevTests() {
    log.header('Cleaning up development test directories');
    
    const targets = this.getCleanupTargets();
    
    // Remove development test directories but keep tests/README.md structure
    targets.devTestDirs.forEach(dir => this.remove(dir));
    
    // Create a minimal tests directory with just README
    if (!this.dryRun) {
      const testsDir = path.resolve(this.rootDir, 'tests');
      if (!fs.existsSync(testsDir)) {
        fs.mkdirSync(testsDir, { recursive: true });
      }
      
      const readmePath = path.resolve(testsDir, 'README.md');
      if (!fs.existsSync(readmePath)) {
        fs.writeFileSync(readmePath, `# Tests

This directory is reserved for production testing scripts and documentation.

For development testing, please use a dedicated testing environment.
`);
        this.modifiedFiles.push('tests/README.md');
        log.success('Created minimal tests/README.md');
      }
    }
  }

  /**
   * Clean up documentation
   */
  cleanupDocumentation() {
    log.header('Organizing documentation for production');
    
    // List of development-specific docs to remove
    const devDocs = [
      'docs/USER_CREATION_FIX_SUMMARY.md',
      'docs/USER_CREATION_FIXED.md', 
      'docs/USER_MANAGEMENT_STATUS.md',
      'docs/MANAGEMENT_DASHBOARD_FIX_SUMMARY.md',
      'docs/MEDICATION_PERSISTENCE_FIX.md',
      'AUTH_PERSISTENCE_FIX.md',
      'MEDICATION_FIX_SUMMARY.md',
      'HOUSEKEEPING_NOTES.md',
      'AI-SYSTEM-GUIDE.md'
    ];

    devDocs.forEach(doc => {
      if (fs.existsSync(path.resolve(this.rootDir, doc))) {
        this.remove(doc);
      }
    });
  }

  /**
   * Update package.json for production
   */
  updatePackageJson() {
    log.header('Updating package.json for production');
    
    const packagePath = path.resolve(this.rootDir, 'package.json');
    if (!fs.existsSync(packagePath)) {
      log.error('package.json not found');
      return;
    }

    if (this.dryRun) {
      log.info('[DRY RUN] Would update package.json scripts');
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Remove development-only scripts
      const devScripts = ['test:dev', 'debug', 'cleanup:dev'];
      devScripts.forEach(script => {
        if (packageJson.scripts && packageJson.scripts[script]) {
          delete packageJson.scripts[script];
          log.success(`Removed script: ${script}`);
        }
      });

      // Add production scripts if not present
      if (!packageJson.scripts['clean']) {
        packageJson.scripts.clean = 'rm -rf dist node_modules/.cache';
      }

      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
      this.modifiedFiles.push('package.json');
      log.success('Updated package.json');
    } catch (error) {
      log.error(`Failed to update package.json: ${error.message}`);
    }
  }

  /**
   * Generate cleanup report
   */
  generateReport() {
    log.header('Cleanup Report');
    
    console.log(`${colors.bold}Files deleted:${colors.reset} ${this.deletedFiles.length}`);
    if (this.deletedFiles.length > 0) {
      this.deletedFiles.forEach(file => console.log(`  - ${file}`));
    }
    
    console.log(`\n${colors.bold}Directories deleted:${colors.reset} ${this.deletedDirs.length}`);
    if (this.deletedDirs.length > 0) {
      this.deletedDirs.forEach(dir => console.log(`  - ${dir}`));
    }
    
    console.log(`\n${colors.bold}Files modified:${colors.reset} ${this.modifiedFiles.length}`);
    if (this.modifiedFiles.length > 0) {
      this.modifiedFiles.forEach(file => console.log(`  - ${file}`));
    }

    const totalItems = this.deletedFiles.length + this.deletedDirs.length;
    
    if (this.dryRun) {
      log.info(`\nDry run complete. ${totalItems} items would be removed.`);
      log.info('Run without --dry-run to apply changes.');
    } else {
      log.success(`\nCleanup complete! Removed ${totalItems} items.`);
      log.info('Your codebase is now ready for production deployment.');
    }
  }

  /**
   * Verify critical files still exist
   */
  verifyCriticalFiles() {
    log.header('Verifying critical files');
    
    const critical = [
      'package.json',
      'src/main.tsx',
      'src/App.tsx', 
      'index.html',
      'README.md'
    ];

    let allCriticalPresent = true;
    critical.forEach(file => {
      const exists = fs.existsSync(path.resolve(this.rootDir, file));
      if (exists) {
        log.success(`✓ ${file}`);
      } else {
        log.error(`✗ ${file} - MISSING!`);
        allCriticalPresent = false;
      }
    });

    if (!allCriticalPresent) {
      throw new Error('Critical files are missing! Cleanup may have been too aggressive.');
    }
  }

  /**
   * Run the complete cleanup process
   */
  async run() {
    try {
      console.log(`${colors.bold}${colors.cyan}`);
      console.log('🧹 hacCare Production Cleanup');
      console.log('============================');
      console.log(`${colors.reset}`);
      
      if (this.dryRun) {
        log.warning('Running in DRY RUN mode - no files will be deleted');
      }

      this.cleanupTestFiles();
      this.cleanupBackupFiles(); 
      this.cleanupDevTests();
      this.cleanupDocumentation();
      this.updatePackageJson();
      
      if (!this.dryRun) {
        this.verifyCriticalFiles();
      }
      
      this.generateReport();
      
    } catch (error) {
      log.error(`Cleanup failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Main execution
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const dryRun = process.argv.includes('--dry-run');
  const cleanup = new ProductionCleanup(dryRun);
  cleanup.run();
}

export default ProductionCleanup;
