#!/usr/bin/env node

/**
 * 🧹 Unused File Analyzer
 * 
 * Analyzes the codebase to identify potentially unused files
 * and generates cleanup recommendations.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// File patterns to analyze
const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.js', '.jsx', '.mjs', '.cjs'];
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'coverage', '.vscode'];
const IGNORE_FILES = [
  'vite.config.ts',
  'tailwind.config.js', 
  'postcss.config.js',
  'eslint.config.js',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'package.json',
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
  '.gitignore',
  'netlify.toml',
  'vercel.json'
];

class UnusedFileAnalyzer {
  constructor() {
    this.allFiles = new Set();
    this.importedFiles = new Set();
    this.exportingFiles = new Set();
    this.entryPoints = new Set();
    this.potentiallyUnused = [];
    this.duplicateFiles = [];
    this.testFiles = [];
    this.setupFiles = [];
  }

  // Recursively scan directory for source files
  scanDirectory(dir, relativePath = '') {
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const relativeFullPath = relativePath ? join(relativePath, entry) : entry;
        
        // Skip ignored directories
        if (IGNORE_DIRS.includes(entry)) continue;
        
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          this.scanDirectory(fullPath, relativeFullPath);
        } else if (stat.isFile()) {
          const ext = extname(entry);
          
          // Only analyze source files
          if (SOURCE_EXTENSIONS.includes(ext)) {
            this.allFiles.add(relativeFullPath);
            
            // Categorize files
            if (relativeFullPath.includes('test') || relativeFullPath.includes('spec')) {
              this.testFiles.push(relativeFullPath);
            }
            
            if (relativeFullPath.includes('setup') || relativeFullPath.includes('config')) {
              this.setupFiles.push(relativeFullPath);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Could not scan directory ${dir}: ${error.message}`);
    }
  }

  // Analyze imports and exports in a file
  analyzeFile(filePath) {
    try {
      const fullPath = join(projectRoot, filePath);
      if (!existsSync(fullPath)) return;
      
      const content = readFileSync(fullPath, 'utf8');
      
      // Find imports
      const importRegex = /(?:import.*from\s+['"](\.\/[^'"]+|\.\.\/[^'"]+)['"]|require\(\s*['"](\.\/[^'"]+|\.\.\/[^'"]+)['"]\s*\))/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1] || match[2];
        if (importPath) {
          const resolvedPath = this.resolvePath(filePath, importPath);
          if (resolvedPath) {
            this.importedFiles.add(resolvedPath);
          }
        }
      }
      
      // Check if file has exports
      const exportRegex = /(?:export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type)|export\s*\{|export\s*\*)/;
      if (exportRegex.test(content)) {
        this.exportingFiles.add(filePath);
      }
      
      // Check for entry point patterns
      if (content.includes('ReactDOM.render') || 
          content.includes('createRoot') || 
          filePath.includes('main.') || 
          filePath.includes('index.') ||
          filePath.includes('App.')) {
        this.entryPoints.add(filePath);
      }
      
    } catch (error) {
      console.warn(`Could not analyze file ${filePath}: ${error.message}`);
    }
  }

  // Resolve relative import paths
  resolvePath(fromFile, importPath) {
    try {
      const fromDir = dirname(fromFile);
      const resolved = join(fromDir, importPath);
      
      // Try different extensions
      for (const ext of SOURCE_EXTENSIONS) {
        const withExt = resolved + ext;
        if (this.allFiles.has(withExt)) {
          return withExt;
        }
        
        // Try index files
        const indexPath = join(resolved, 'index' + ext);
        if (this.allFiles.has(indexPath)) {
          return indexPath;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // Find duplicate functionality
  findDuplicates() {
    const filesByName = new Map();
    
    for (const file of this.allFiles) {
      const name = basename(file, extname(file));
      if (!filesByName.has(name)) {
        filesByName.set(name, []);
      }
      filesByName.get(name).push(file);
    }
    
    for (const [name, files] of filesByName) {
      if (files.length > 1) {
        this.duplicateFiles.push({ name, files });
      }
    }
  }

  // Analyze the entire codebase
  analyze() {
    console.log('🔍 Scanning codebase for unused files...\n');
    
    // Step 1: Scan all files
    this.scanDirectory(projectRoot);
    console.log(`📁 Found ${this.allFiles.size} source files`);
    
    // Step 2: Analyze imports and exports
    for (const file of this.allFiles) {
      this.analyzeFile(file);
    }
    
    console.log(`📦 Found ${this.importedFiles.size} imported files`);
    console.log(`📤 Found ${this.exportingFiles.size} files with exports`);
    console.log(`🎯 Found ${this.entryPoints.size} entry points`);
    
    // Step 3: Find potentially unused files
    for (const file of this.allFiles) {
      const isImported = this.importedFiles.has(file);
      const isEntryPoint = this.entryPoints.has(file);
      const hasExports = this.exportingFiles.has(file);
      
      // Skip config and ignored files
      if (IGNORE_FILES.some(ignored => file.includes(ignored))) continue;
      
      // File is potentially unused if:
      // - Not imported by other files
      // - Not an entry point  
      // - Or has no exports (dead code)
      if (!isImported && !isEntryPoint) {
        this.potentiallyUnused.push({
          file,
          hasExports,
          isTest: this.testFiles.includes(file),
          isSetup: this.setupFiles.includes(file)
        });
      }
    }
    
    // Step 4: Find duplicates
    this.findDuplicates();
  }

  // Generate cleanup report
  generateReport() {
    console.log('\n📊 UNUSED FILE ANALYSIS REPORT');
    console.log('================================\n');
    
    // Potentially unused files
    if (this.potentiallyUnused.length > 0) {
      console.log('🗑️  POTENTIALLY UNUSED FILES:');
      console.log('(Review carefully before deleting)\n');
      
      const categories = {
        'Source Files': this.potentiallyUnused.filter(f => !f.isTest && !f.isSetup),
        'Test Files': this.potentiallyUnused.filter(f => f.isTest),
        'Setup/Config Files': this.potentiallyUnused.filter(f => f.isSetup)
      };
      
      for (const [category, files] of Object.entries(categories)) {
        if (files.length > 0) {
          console.log(`\n${category}:`);
          files.forEach(({ file, hasExports }) => {
            const status = hasExports ? '📤 (has exports)' : '📄 (no exports)';
            console.log(`  - ${file} ${status}`);
          });
        }
      }
    }
    
    // Duplicate files
    if (this.duplicateFiles.length > 0) {
      console.log('\n\n🔄 DUPLICATE FILE NAMES:');
      console.log('(May indicate redundant functionality)\n');
      
      this.duplicateFiles.forEach(({ name, files }) => {
        console.log(`${name}:`);
        files.forEach(file => console.log(`  - ${file}`));
        console.log('');
      });
    }
    
    // Recommendations
    console.log('\n💡 CLEANUP RECOMMENDATIONS:');
    console.log('============================\n');
    
    console.log('1. 🔍 REVIEW UNUSED FILES:');
    console.log('   - Check files marked as "potentially unused"');
    console.log('   - Verify they are not dynamically imported');
    console.log('   - Consider if they serve as examples/demos');
    
    console.log('\n2. 🧹 SAFE CLEANUP STEPS:');
    console.log('   - Start with test files that are clearly outdated');
    console.log('   - Remove files with no exports that aren\'t imported');
    console.log('   - Archive rather than delete files if unsure');
    
    console.log('\n3. 🔄 CONSOLIDATE DUPLICATES:');
    console.log('   - Review duplicate file names for redundancy');
    console.log('   - Merge similar functionality where appropriate');
    console.log('   - Update imports after consolidation');
    
    console.log('\n4. 📁 CREATE ARCHIVE FOLDER:');
    console.log('   - Move questionable files to /archive folder');
    console.log('   - Keep for reference without cluttering main codebase');
    console.log('   - Delete archive after confirming nothing breaks');
    
    // Summary statistics
    console.log('\n📈 SUMMARY STATISTICS:');
    console.log('======================');
    console.log(`Total files analyzed: ${this.allFiles.size}`);
    console.log(`Potentially unused: ${this.potentiallyUnused.length}`);
    console.log(`Duplicate names: ${this.duplicateFiles.length}`);
    console.log(`Test files: ${this.testFiles.length}`);
    console.log(`Setup files: ${this.setupFiles.length}`);
    
    const unusedPercentage = ((this.potentiallyUnused.length / this.allFiles.size) * 100).toFixed(1);
    console.log(`Unused percentage: ${unusedPercentage}%`);
  }
}

// Run the analysis
const analyzer = new UnusedFileAnalyzer();
analyzer.analyze();
analyzer.generateReport();

console.log('\n🎯 Next step: Run "node scripts/cleanup/create-ai-guide.js" to generate the AI documentation!');
