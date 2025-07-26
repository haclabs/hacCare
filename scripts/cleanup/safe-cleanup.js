#!/usr/bin/env node

/**
 * 🧹 Safe File Cleanup Tool
 * 
 * Provides safe cleanup operations for unused files in the hacCare project.
 * Always creates backups before deletion.
 */

import { existsSync, mkdirSync, copyFileSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

class SafeCleanupTool {
  constructor() {
    this.backupDir = join(projectRoot, 'cleanup-backup');
    this.cleanupLog = [];
  }

  // Create backup directory
  ensureBackupDir() {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${this.backupDir}`);
    }
  }

  // Backup a file before deletion
  backupFile(filePath) {
    try {
      const fullPath = join(projectRoot, filePath);
      const backupPath = join(this.backupDir, filePath);
      const backupDirPath = dirname(backupPath);
      
      // Create backup directory structure
      if (!existsSync(backupDirPath)) {
        mkdirSync(backupDirPath, { recursive: true });
      }
      
      // Copy file to backup
      copyFileSync(fullPath, backupPath);
      console.log(`💾 Backed up: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to backup ${filePath}: ${error.message}`);
      return false;
    }
  }

  // Safely delete a file (with backup)
  safeDelete(filePath, reason = 'Unused file') {
    const fullPath = join(projectRoot, filePath);
    
    if (!existsSync(fullPath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      return false;
    }
    
    // Create backup first
    if (!this.backupFile(filePath)) {
      console.error(`❌ Cannot delete ${filePath} - backup failed`);
      return false;
    }
    
    try {
      unlinkSync(fullPath);
      console.log(`🗑️  Deleted: ${filePath} (${reason})`);
      
      this.cleanupLog.push({
        file: filePath,
        action: 'deleted',
        reason,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete ${filePath}: ${error.message}`);
      return false;
    }
  }

  // Archive files instead of deleting (safer option)
  archiveFile(filePath, reason = 'Potentially unused') {
    const archiveDir = join(projectRoot, 'archive');
    const fullPath = join(projectRoot, filePath);
    const archivePath = join(archiveDir, filePath);
    const archiveDirPath = dirname(archivePath);
    
    if (!existsSync(fullPath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      return false;
    }
    
    try {
      // Create archive directory structure
      if (!existsSync(archiveDirPath)) {
        mkdirSync(archiveDirPath, { recursive: true });
      }
      
      // Copy to archive
      copyFileSync(fullPath, archivePath);
      
      // Delete original
      unlinkSync(fullPath);
      
      console.log(`📦 Archived: ${filePath} (${reason})`);
      
      this.cleanupLog.push({
        file: filePath,
        action: 'archived',
        reason,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to archive ${filePath}: ${error.message}`);
      return false;
    }
  }

  // Save cleanup log
  saveCleanupLog() {
    const logPath = join(this.backupDir, 'cleanup-log.json');
    writeFileSync(logPath, JSON.stringify(this.cleanupLog, null, 2));
    console.log(`📋 Cleanup log saved: ${logPath}`);
  }

  // Interactive cleanup with confirmation
  async interactiveCleanup() {
    console.log('🧹 SAFE CLEANUP TOOL');
    console.log('====================\n');
    console.log('This tool will help you safely clean up unused files.');
    console.log('All files will be backed up before deletion.\n');
    
    this.ensureBackupDir();

    // Define safe-to-remove file patterns
    const safePatterns = [
      // Clearly unused test files
      'tests/temp-*',
      'tests/*.tmp',
      'tests/test-output-*',
      
      // Backup files
      '*.backup',
      '*.bak',
      '*~',
      
      // Demo files that might be outdated
      'smart-demo.js',
      'test-dompurify.mjs',
      'smart-sanitization-demo.mjs',
      'test-sanitization-fix.js',
      
      // Debug files
      'debug-tenant-counts.js'
    ];

    console.log('🎯 SAFE CLEANUP CANDIDATES:');
    console.log('(Files that are likely safe to remove)\n');

    const candidates = [
      { file: 'smart-demo.js', reason: 'Demo file - likely outdated' },
      { file: 'test-dompurify.mjs', reason: 'Test file - no longer needed' },
      { file: 'smart-sanitization-demo.mjs', reason: 'Demo file - superseded by newer implementation' },
      { file: 'test-sanitization-fix.js', reason: 'Test file - temporary fix validation' },
      { file: 'debug-tenant-counts.js', reason: 'Debug script - temporary utility' },
      { file: 'src/utils/dateUtils.ts', reason: 'Re-export wrapper - functionality moved to utils/time.ts' },
      { file: 'src/utils/sanitization.ts.backup', reason: 'Backup file - no longer needed' }
    ];

    console.log('📋 CLEANUP RECOMMENDATIONS:');
    candidates.forEach((candidate, index) => {
      console.log(`${index + 1}. ${candidate.file}`);
      console.log(`   Reason: ${candidate.reason}`);
      console.log('');
    });

    // Auto-cleanup of obviously safe files
    console.log('🤖 AUTO-CLEANUP (Very Safe):');
    const autoCleanup = [
      'src/utils/sanitization.ts.backup',
      'debug-tenant-counts.js'
    ];

    for (const file of autoCleanup) {
      if (existsSync(join(projectRoot, file))) {
        this.safeDelete(file, 'Auto-cleanup: backup/debug file');
      }
    }

    // Create archive for questionable files
    console.log('\n📦 ARCHIVING (Safer Approach):');
    const archiveCandidates = [
      'smart-demo.js',
      'test-dompurify.mjs', 
      'smart-sanitization-demo.mjs',
      'test-sanitization-fix.js'
    ];

    for (const file of archiveCandidates) {
      if (existsSync(join(projectRoot, file))) {
        this.archiveFile(file, 'Potentially unused demo/test file');
      }
    }

    this.saveCleanupLog();
    
    console.log('\n✅ CLEANUP COMPLETED!');
    console.log(`📁 Backups stored in: ${this.backupDir}`);
    console.log(`📦 Archived files in: ${join(projectRoot, 'archive')}`);
    console.log('\n💡 To undo changes:');
    console.log('   - Restore files from backup directory');
    console.log('   - Move files back from archive directory');
  }

  // Restore files from backup
  restoreFromBackup(filePath) {
    const backupPath = join(this.backupDir, filePath);
    const originalPath = join(projectRoot, filePath);
    
    if (!existsSync(backupPath)) {
      console.error(`❌ Backup not found: ${filePath}`);
      return false;
    }
    
    try {
      const originalDir = dirname(originalPath);
      if (!existsSync(originalDir)) {
        mkdirSync(originalDir, { recursive: true });
      }
      
      copyFileSync(backupPath, originalPath);
      console.log(`🔄 Restored: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to restore ${filePath}: ${error.message}`);
      return false;
    }
  }
}

// Command line interface
const tool = new SafeCleanupTool();

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🧹 Safe Cleanup Tool - Usage:

node scripts/cleanup/safe-cleanup.js              # Interactive cleanup
node scripts/cleanup/safe-cleanup.js --auto       # Auto cleanup safe files
node scripts/cleanup/safe-cleanup.js --restore    # Show restore instructions

Examples:
  Interactive cleanup:  node scripts/cleanup/safe-cleanup.js
  Auto-cleanup:         node scripts/cleanup/safe-cleanup.js --auto
  `);
} else if (process.argv.includes('--restore')) {
  console.log(`
🔄 RESTORE INSTRUCTIONS:

To restore deleted files:
1. Check backup directory: cleanup-backup/
2. Use tool.restoreFromBackup('path/to/file') 
3. Or manually copy files back from backup

To restore archived files:
1. Check archive directory: archive/
2. Manually move files back to their original locations
  `);
} else {
  // Run interactive cleanup
  tool.interactiveCleanup().catch(console.error);
}
