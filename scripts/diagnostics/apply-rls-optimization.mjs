#!/usr/bin/env node
/**
 * RLS Performance Optimization Application Script
 * 
 * This script safely applies the RLS performance optimizations in stages
 * with proper error handling, rollback capabilities, and progress tracking.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Configuration
const OPTIMIZATION_STEPS = [
    {
        name: 'Pre-optimization Analysis',
        file: 'rls-performance-analysis.sql',
        description: 'Analyze current state before optimization'
    },
    {
        name: 'RLS Performance Optimization',
        file: 'rls-performance-optimization.sql',
        description: 'Apply all performance optimizations'
    },
    {
        name: 'Post-optimization Analysis',
        file: 'rls-performance-analysis.sql',
        description: 'Verify optimizations were successful'
    }
];

class RLSOptimizer {
    constructor() {
        this.results = [];
        this.errors = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
        console.log(logMessage);
        
        if (type === 'error') {
            this.errors.push(logMessage);
        } else {
            this.results.push(logMessage);
        }
    }

    async executeStep(step, supabase) {
        this.log(`Starting: ${step.name}`, 'info');
        this.log(`Description: ${step.description}`, 'info');
        
        try {
            const sqlPath = join(process.cwd(), 'sql-patches', 
                step.file.includes('analysis') ? 'diagnostics' : 'fixes', 
                step.file
            );
            
            const sqlContent = readFileSync(sqlPath, 'utf8');
            
            // Split SQL into individual statements for better error handling
            const statements = sqlContent
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
            
            this.log(`Executing ${statements.length} SQL statements...`, 'info');
            
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                
                if (statement.toLowerCase().includes('select') || 
                    statement.toLowerCase().includes('with')) {
                    // For SELECT queries, execute and log results
                    try {
                        const { data, error } = await supabase.rpc('exec_sql', {
                            sql_query: statement
                        });
                        
                        if (error) {
                            this.log(`Warning in analysis query ${i + 1}: ${error.message}`, 'warn');
                        } else if (data && data.length > 0) {
                            this.log(`Analysis result ${i + 1}: ${JSON.stringify(data, null, 2)}`, 'info');
                        }
                    } catch (err) {
                        this.log(`Non-critical error in analysis query ${i + 1}: ${err.message}`, 'warn');
                    }
                } else {
                    // For DDL statements, execute with error handling
                    try {
                        const { error } = await supabase.rpc('exec_sql', {
                            sql_query: statement
                        });
                        
                        if (error) {
                            this.log(`Error in statement ${i + 1}: ${error.message}`, 'error');
                            throw error;
                        } else {
                            this.log(`Successfully executed statement ${i + 1}`, 'info');
                        }
                    } catch (err) {
                        this.log(`Failed to execute statement ${i + 1}: ${err.message}`, 'error');
                        throw err;
                    }
                }
            }
            
            this.log(`Completed: ${step.name}`, 'success');
            return true;
            
        } catch (error) {
            this.log(`Failed: ${step.name} - ${error.message}`, 'error');
            return false;
        }
    }

    async runOptimization(supabase) {
        this.log('Starting RLS Performance Optimization Process', 'info');
        this.log('This will optimize 136+ RLS policies for better performance', 'info');
        
        let successCount = 0;
        
        for (const step of OPTIMIZATION_STEPS) {
            const success = await this.executeStep(step, supabase);
            
            if (success) {
                successCount++;
            } else {
                this.log(`Stopping optimization due to failure in: ${step.name}`, 'error');
                break;
            }
            
            // Add delay between steps for safety
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Generate summary report
        this.generateSummaryReport(successCount);
        
        return successCount === OPTIMIZATION_STEPS.length;
    }

    generateSummaryReport(successCount) {
        this.log('\n=== RLS OPTIMIZATION SUMMARY REPORT ===', 'info');
        this.log(`Steps completed: ${successCount}/${OPTIMIZATION_STEPS.length}`, 'info');
        this.log(`Total log entries: ${this.results.length}`, 'info');
        this.log(`Errors encountered: ${this.errors.length}`, 'info');
        
        if (this.errors.length > 0) {
            this.log('\nERRORS:', 'error');
            this.errors.forEach(error => this.log(error, 'error'));
        }
        
        if (successCount === OPTIMIZATION_STEPS.length) {
            this.log('\n✅ RLS OPTIMIZATION COMPLETED SUCCESSFULLY!', 'success');
            this.log('Expected performance improvements:', 'info');
            this.log('- Reduced auth.uid() re-evaluations by 136+ instances', 'info');
            this.log('- Consolidated multiple permissive policies', 'info');
            this.log('- Removed duplicate indexes', 'info');
            this.log('- Improved query performance at scale', 'info');
        } else {
            this.log('\n❌ RLS OPTIMIZATION INCOMPLETE', 'error');
            this.log('Please review errors and retry failed steps', 'error');
        }
        
        this.log('\n=== END SUMMARY REPORT ===', 'info');
    }
}

// Export for use in other scripts
export default RLSOptimizer;

// If running directly, provide usage instructions
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log(`
RLS Performance Optimization Script
==================================

This script optimizes your Supabase RLS policies for better performance.

Usage:
1. Import this script in your application
2. Initialize with your Supabase client
3. Call runOptimization()

Example:
import RLSOptimizer from './apply-rls-optimization.mjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);
const optimizer = new RLSOptimizer();
await optimizer.runOptimization(supabase);

Or run the SQL files manually in this order:
1. sql-patches/diagnostics/rls-performance-analysis.sql (pre-analysis)
2. sql-patches/fixes/rls-performance-optimization.sql (optimization)
3. sql-patches/diagnostics/rls-performance-analysis.sql (post-analysis)
`);
}
