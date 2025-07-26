#!/usr/bin/env node

/**
 * 🤖 AI Documentation Generator
 * 
 * Creates comprehensive AI-readable documentation that explains
 * exactly how the hacCare site works, including all paths,
 * components, and system architecture.
 */

import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, dirname, basename, extname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

class AIDocumentationGenerator {
  constructor() {
    this.components = new Map();
    this.routes = [];
    this.services = [];
    this.contexts = [];
    this.hooks = [];
    this.types = [];
    this.modules = [];
    this.schemas = [];
    this.utils = [];
    this.config = [];
  }

  // Analyze a file and extract its purpose and dependencies
  analyzeFile(filePath) {
    try {
      const fullPath = join(projectRoot, filePath);
      if (!existsSync(fullPath)) return null;
      
      const content = readFileSync(fullPath, 'utf8');
      const relativePath = relative(projectRoot, fullPath);
      
      // Extract imports
      const imports = [];
      const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
      
      // Extract exports
      const exports = [];
      const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|interface|type)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
      while ((match = exportRegex.exec(content)) !== null) {
        exports.push(match[1]);
      }
      
      // Extract JSDoc comments
      const docComments = [];
      const docRegex = /\/\*\*\s*([\s\S]*?)\s*\*\//g;
      while ((match = docRegex.exec(content)) !== null) {
        docComments.push(match[1].replace(/\s*\*\s?/g, ' ').trim());
      }
      
      // Detect file type and purpose
      const fileType = this.detectFileType(filePath, content);
      const purpose = this.extractPurpose(content, docComments);
      
      return {
        path: relativePath,
        type: fileType,
        purpose,
        imports,
        exports,
        size: content.length,
        lines: content.split('\n').length,
        hasTests: content.includes('test(') || content.includes('describe('),
        hasJSDoc: docComments.length > 0,
        documentation: docComments
      };
    } catch (error) {
      console.warn(`Error analyzing ${filePath}: ${error.message}`);
      return null;
    }
  }

  // Detect what type of file this is
  detectFileType(filePath, content) {
    const path = filePath.toLowerCase();
    
    if (path.includes('component') || path.endsWith('.tsx') && content.includes('React')) {
      return 'component';
    }
    if (path.includes('hook') || (path.includes('use') && content.includes('use'))) {
      return 'hook';
    }
    if (path.includes('service') || path.includes('lib/')) {
      return 'service';
    }
    if (path.includes('context')) {
      return 'context';
    }
    if (path.includes('type') || content.includes('interface ') || content.includes('type ')) {
      return 'types';
    }
    if (path.includes('schema')) {
      return 'schema';
    }
    if (path.includes('module')) {
      return 'module';
    }
    if (path.includes('util') || path.includes('helper')) {
      return 'utility';
    }
    if (path.includes('config') || path.includes('setup')) {
      return 'config';
    }
    if (path.includes('test') || path.includes('spec')) {
      return 'test';
    }
    if (content.includes('Routes') || content.includes('Route')) {
      return 'routing';
    }
    
    return 'other';
  }

  // Extract the purpose from comments and code structure
  extractPurpose(content, docComments) {
    if (docComments.length > 0) {
      return docComments[0];
    }
    
    // Try to extract from first comment
    const firstComment = content.match(/\/\*\*([\s\S]*?)\*\/|\/\/(.*)/);
    if (firstComment) {
      return firstComment[1] || firstComment[2] || '';
    }
    
    // Try to infer from exports
    const exportMatch = content.match(/export\s+(?:default\s+)?(?:class|function|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (exportMatch) {
      return `Exports ${exportMatch[1]}`;
    }
    
    return 'Purpose not documented';
  }

  // Scan directory recursively
  scanDirectory(dir = projectRoot, baseDir = '') {
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const relativePath = baseDir ? join(baseDir, entry) : entry;
        
        // Skip ignored directories
        if (['node_modules', '.git', 'dist', 'coverage', '.vscode'].includes(entry)) {
          continue;
        }
        
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          this.scanDirectory(fullPath, relativePath);
        } else if (stat.isFile()) {
          const ext = extname(entry);
          if (['.tsx', '.ts', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
            const analysis = this.analyzeFile(relativePath);
            if (analysis) {
              this.categorizeFile(analysis);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Error scanning directory ${dir}: ${error.message}`);
    }
  }

  // Categorize files by type
  categorizeFile(analysis) {
    switch (analysis.type) {
      case 'component':
        this.components.set(analysis.path, analysis);
        break;
      case 'hook':
        this.hooks.push(analysis);
        break;
      case 'service':
        this.services.push(analysis);
        break;
      case 'context':
        this.contexts.push(analysis);
        break;
      case 'types':
        this.types.push(analysis);
        break;
      case 'schema':
        this.schemas.push(analysis);
        break;
      case 'module':
        this.modules.push(analysis);
        break;
      case 'utility':
        this.utils.push(analysis);
        break;
      case 'config':
        this.config.push(analysis);
        break;
      case 'routing':
        this.routes.push(analysis);
        break;
    }
  }

  // Generate comprehensive AI documentation
  generateAIGuide() {
    const guide = `# 🤖 AI SYSTEM GUIDE: hacCare Healthcare Management System

*Generated on ${new Date().toISOString()}*

## 🎯 SYSTEM OVERVIEW

hacCare is a modern, multi-tenant healthcare management system built with React, TypeScript, and Supabase. The system is designed around a modular architecture that supports:

- **Multi-tenant hospital management** with secure data isolation
- **Advanced patient care workflows** with modular components  
- **Real-time vitals monitoring** with AI-powered insights
- **Medication administration tracking** (MAR) with safety checks
- **Dynamic form generation** using JSON schemas
- **Comprehensive security** with PHI protection

## 🏗️ ARCHITECTURE PATTERNS

### Core Architectural Principles:
1. **Modular Design**: Self-contained modules for different medical workflows
2. **Schema-Driven Forms**: JSON schemas define dynamic healthcare forms
3. **Multi-Tenant Security**: Row-level security ensures data isolation
4. **Real-Time Updates**: Live data synchronization across all clients
5. **Type Safety**: Full TypeScript coverage for medical data integrity

### Key Design Patterns:
- **Module Pattern**: Each medical workflow (vitals, medications, assessments) is a self-contained module
- **Provider Pattern**: React contexts manage global state (tenant, auth, theme)
- **Hook Pattern**: Custom hooks encapsulate business logic and API calls
- **Schema Pattern**: JSON schemas drive form generation and validation

## 📁 DIRECTORY STRUCTURE & FILE PURPOSES

${this.generateDirectoryGuide()}

## 🔗 ROUTING & NAVIGATION PATHS

${this.generateRoutingGuide()}

## 🧩 COMPONENT ARCHITECTURE

${this.generateComponentGuide()}

## 🔧 SERVICES & BUSINESS LOGIC

${this.generateServicesGuide()}

## 📊 DATA FLOW & STATE MANAGEMENT

${this.generateDataFlowGuide()}

## 🔐 SECURITY & MULTI-TENANCY

${this.generateSecurityGuide()}

## 🚀 MODULE SYSTEM

${this.generateModuleGuide()}

## 📋 SCHEMA SYSTEM

${this.generateSchemaGuide()}

## 🛠️ DEVELOPMENT PATTERNS

${this.generateDevelopmentGuide()}

## 🧪 TESTING STRATEGY

${this.generateTestingGuide()}

## 🔄 DEPLOYMENT & OPERATIONS

${this.generateDeploymentGuide()}

## 📚 AI ASSISTANT REFERENCE

### When helping with hacCare development:

1. **Always consider multi-tenancy**: Every data operation should respect tenant isolation
2. **Use the modular system**: Leverage existing modules rather than creating standalone components
3. **Follow the schema pattern**: Use JSON schemas for form generation
4. **Maintain type safety**: All medical data should be properly typed
5. **Consider security**: PHI protection and access controls are critical
6. **Test thoroughly**: Healthcare applications require extensive testing

### Common Development Tasks:

#### Adding a New Medical Workflow:
1. Create a new module in \`src/modules/[workflow-name]/\`
2. Define JSON schemas in \`src/schemas/\`
3. Register schemas with the schema engine
4. Integrate with \`ModularPatientDashboard\`
5. Add appropriate tests

#### Modifying Patient Data:
1. Update TypeScript interfaces in \`src/types/\`
2. Modify database services in \`src/lib/\`
3. Update relevant components/modules
4. Ensure RLS policies are maintained
5. Test multi-tenant isolation

#### Adding New Form Fields:
1. Define field schema in appropriate schema file
2. Create field component if needed in \`src/components/forms/fields/\`
3. Register with \`DynamicForm\` component
4. Add validation rules
5. Test with different data types

## 📖 CODEBASE METRICS

- **Total Components**: ${this.components.size}
- **Services & Libraries**: ${this.services.length}
- **Custom Hooks**: ${this.hooks.length}
- **Schema Definitions**: ${this.schemas.length}
- **Modular Systems**: ${this.modules.length}
- **Utility Functions**: ${this.utils.length}
- **Type Definitions**: ${this.types.length}

---

*This guide is automatically generated from code analysis. For the most current information, regenerate using \`node scripts/cleanup/create-ai-guide.js\`*`;

    return guide;
  }

  generateDirectoryGuide() {
    const directories = {
      'src/': 'Main application source code',
      'src/components/': 'Reusable React components organized by feature',
      'src/modules/': 'Self-contained medical workflow modules',
      'src/lib/': 'Business logic services and utilities',
      'src/hooks/': 'Custom React hooks for data and state management',
      'src/types/': 'TypeScript type definitions',
      'src/schemas/': 'JSON schema definitions for dynamic forms',
      'src/contexts/': 'React context providers for global state',
      'src/utils/': 'Utility functions and helpers',
      'scripts/': 'Database maintenance and setup scripts',
      'sql-patches/': 'Database migration and fix scripts',
      'tests/': 'Test files organized by type (unit, integration, utilities)',
      'docs/': 'Project documentation and implementation guides'
    };

    return Object.entries(directories)
      .map(([dir, desc]) => `**${dir}**: ${desc}`)
      .join('\n');
  }

  generateRoutingGuide() {
    const routes = [
      { path: '/', component: 'Dashboard', description: 'Main hospital dashboard with patient overview' },
      { path: '/patients/:id', component: 'PatientDetail', description: 'Individual patient management interface' },
      { path: '/patients/:id/modular', component: 'ModularPatientDashboard', description: 'New modular patient management system' },
      { path: '/management', component: 'TenantManagement', description: 'Multi-tenant administration interface' },
      { path: '/security-demo', component: 'SecurityDiagnosticsDemo', description: 'Security diagnostics and testing' },
      { path: '/modular-demo', component: 'ModularPatientSystemDemo', description: 'Demonstration of modular patient system' }
    ];

    return routes.map(route => 
      `**${route.path}** → \`${route.component}\`\n   ${route.description}`
    ).join('\n\n');
  }

  generateComponentGuide() {
    const componentsByCategory = new Map();
    
    for (const [path, component] of this.components) {
      const category = this.getComponentCategory(path);
      if (!componentsByCategory.has(category)) {
        componentsByCategory.set(category, []);
      }
      componentsByCategory.get(category).push(component);
    }

    let guide = '';
    for (const [category, components] of componentsByCategory) {
      guide += `### ${category}\n\n`;
      components.forEach(comp => {
        guide += `**${basename(comp.path, extname(comp.path))}**\n`;
        guide += `- Path: \`${comp.path}\`\n`;
        guide += `- Purpose: ${comp.purpose}\n`;
        guide += `- Exports: ${comp.exports.join(', ') || 'default'}\n\n`;
      });
    }

    return guide;
  }

  getComponentCategory(path) {
    if (path.includes('modules/')) return 'Medical Modules';
    if (path.includes('forms/')) return 'Form Components';
    if (path.includes('Patients/')) return 'Patient Management';
    if (path.includes('Layout/')) return 'Layout & Navigation';
    if (path.includes('Dashboard/')) return 'Dashboard Components';
    if (path.includes('Settings/')) return 'Settings & Configuration';
    if (path.includes('UI/')) return 'UI Components';
    return 'Other Components';
  }

  generateServicesGuide() {
    let guide = '';
    this.services.forEach(service => {
      guide += `**${basename(service.path, extname(service.path))}**\n`;
      guide += `- Path: \`${service.path}\`\n`;
      guide += `- Purpose: ${service.purpose}\n`;
      guide += `- Functions: ${service.exports.join(', ')}\n\n`;
    });
    return guide;
  }

  generateDataFlowGuide() {
    return `### Data Flow Architecture:

1. **Supabase Client** (\`src/lib/supabase.ts\`) - Central database connection
2. **Service Layer** (\`src/lib/*Service.ts\`) - Business logic and API calls  
3. **React Query Hooks** (\`src/hooks/queries/\`) - Data fetching and caching
4. **React Components** - UI rendering and user interaction
5. **Context Providers** - Global state management (tenant, auth, theme)

### State Management Pattern:
- **Local State**: React \`useState\` for component-specific data
- **Server State**: TanStack Query for API data with caching
- **Global State**: React Context for tenant, authentication, theme
- **Form State**: Dynamic forms managed by schema engine

### Real-Time Updates:
- Supabase real-time subscriptions for live data
- Automatic UI updates when data changes
- Multi-tenant data isolation through RLS policies`;
  }

  generateSecurityGuide() {
    return `### Multi-Tenant Security Model:

1. **Row Level Security (RLS)**: Database-level tenant isolation
2. **Authentication**: Supabase Auth with role-based access
3. **Tenant Context**: Global tenant selection and switching
4. **Data Sanitization**: PHI protection and XSS prevention
5. **API Security**: Service role keys for admin operations

### Key Security Files:
- \`src/contexts/TenantContext.tsx\` - Tenant state management
- \`src/lib/subdomainService.ts\` - Subdomain-based tenant routing  
- \`src/utils/sanitization.ts\` - PHI protection and sanitization
- \`sql-patches/fixes/\` - RLS policy implementations

### Security Patterns:
- All database queries filtered by tenant_id
- User roles verified before sensitive operations
- PHI data sanitized before external API calls
- Audit trails for all medical record changes`;
  }

  generateModuleGuide() {
    let guide = `### Modular System Architecture:

The hacCare system uses self-contained modules for different medical workflows:

`;

    this.modules.forEach(module => {
      guide += `**${basename(module.path, extname(module.path))}**\n`;
      guide += `- Path: \`${module.path}\`\n`;
      guide += `- Purpose: ${module.purpose}\n`;
      guide += `- Exports: ${module.exports.join(', ')}\n\n`;
    });

    guide += `### Module Integration:
- All modules integrate with \`ModularPatientDashboard\`
- Modules use \`DynamicForm\` for data input
- Schema-driven validation and form generation
- Consistent patient data interface across modules`;

    return guide;
  }

  generateSchemaGuide() {
    let guide = `### JSON Schema System:

Dynamic form generation using JSON schemas for healthcare forms:

`;

    this.schemas.forEach(schema => {
      guide += `**${basename(schema.path, extname(schema.path))}**\n`;
      guide += `- Path: \`${schema.path}\`\n`;
      guide += `- Purpose: ${schema.purpose}\n\n`;
    });

    guide += `### Schema Features:
- **Field Types**: Healthcare-specific field types (vital signs, medications, pain scales)
- **Validation**: Clinical validation rules and safety checks
- **Conditional Logic**: Fields that show/hide based on other inputs
- **Multi-Step Forms**: Complex workflows broken into manageable steps
- **Auto-Save**: Automatic form state preservation`;

    return guide;
  }

  generateDevelopmentGuide() {
    return `### Development Patterns & Best Practices:

#### Code Organization:
- **Feature-based**: Group related components, hooks, and services
- **Modular**: Self-contained modules with clear interfaces
- **Type-safe**: Full TypeScript coverage for medical data
- **Documented**: JSDoc comments for complex medical logic

#### Naming Conventions:
- **Components**: PascalCase (e.g., \`VitalsModule\`)
- **Hooks**: camelCase with "use" prefix (e.g., \`usePatients\`)
- **Services**: camelCase with "Service" suffix (e.g., \`patientService\`)
- **Types**: PascalCase interfaces (e.g., \`Patient\`, \`VitalSigns\`)

#### Medical Data Patterns:
- Always validate medical data with appropriate ranges
- Use proper units and precision for measurements
- Implement safety checks for critical values
- Maintain audit trails for regulatory compliance

#### Multi-Tenant Patterns:
- Always include tenant_id in database queries
- Use \`useTenant()\` hook for current tenant context
- Test tenant isolation thoroughly
- Handle tenant switching gracefully`;
  }

  generateTestingGuide() {
    return `### Testing Strategy:

#### Test Categories:
- **Unit Tests** (\`tests/unit/\`): Individual functions and components
- **Integration Tests** (\`tests/integration/\`): Multi-tenant functionality
- **Utility Tests** (\`tests/utilities/\`): Database operations and maintenance

#### Key Test Files:
- \`test-tenant-isolation.js\` - Verifies multi-tenant data separation
- \`test-foreign-keys.js\` - Database relationship integrity
- \`test-user-creation.js\` - User management workflows

#### Testing Patterns:
- Mock Supabase client for unit tests
- Use real database for integration tests
- Test medical data validation thoroughly
- Verify tenant isolation in all scenarios`;
  }

  generateDeploymentGuide() {
    return `### Deployment Configuration:

#### Build System:
- **Vite**: Modern build tool with fast HMR
- **TypeScript**: Compile-time type checking
- **Tailwind CSS**: Utility-first styling
- **ESLint**: Code quality and consistency

#### Environment Configuration:
- \`vite.config.ts\` - Build and development server config
- \`tailwind.config.js\` - Styling system configuration
- \`tsconfig.json\` - TypeScript compiler options
- \`.env\` files - Environment-specific variables

#### Deployment Targets:
- **Netlify** (\`netlify.toml\`) - Static site deployment
- **Vercel** (\`vercel.json\`) - Serverless deployment
- **Docker**: Containerized deployment option

#### Database Management:
- **Supabase**: Hosted PostgreSQL with real-time features
- **Migrations**: SQL patches in \`sql-patches/\` directory
- **Backup**: Automated backups and point-in-time recovery`;
  }

  // Main execution
  run() {
    console.log('🤖 Generating comprehensive AI documentation...\n');
    
    // Scan the entire codebase
    this.scanDirectory();
    
    // Generate the guide
    const guide = this.generateAIGuide();
    
    // Write to file
    const outputPath = join(projectRoot, 'AI-SYSTEM-GUIDE.md');
    writeFileSync(outputPath, guide, 'utf8');
    
    console.log(`✅ AI System Guide generated: ${outputPath}`);
    console.log(`📊 Analyzed ${this.components.size + this.services.length + this.hooks.length + this.modules.length + this.schemas.length} files`);
    console.log('\n🎯 The AI guide includes:');
    console.log('   - Complete system architecture overview');
    console.log('   - All file paths and purposes');
    console.log('   - Component relationships and data flow');
    console.log('   - Development patterns and best practices');
    console.log('   - Security and multi-tenancy details');
    console.log('   - Testing and deployment information');
  }
}

// Run the generator
const generator = new AIDocumentationGenerator();
generator.run();
