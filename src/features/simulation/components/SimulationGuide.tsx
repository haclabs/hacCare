/**
 * ===========================================================================
 * SIMULATION INSTRUCTOR GUIDE
 * ===========================================================================
 * Display comprehensive instructor guide for simulation system
 * ===========================================================================
 */

import React, { useState } from 'react';
import { BookOpen, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

const SimulationGuide: React.FC = () => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    
    try {
      const element = document.getElementById('instructor-guide-content');
      if (!element) {
        console.error('Guide content element not found');
        return;
      }

      // Create canvas from the content
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794, // A4 width
        allowTaint: true,
      });

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Add title metadata
      pdf.setProperties({
        title: 'Simulation Training System - Instructor Guide',
        subject: 'Clinical Simulation Instructor Reference',
        author: 'hacCare Clinical Simulation Platform',
        keywords: 'simulation, instructor, guide, training, clinical',
        creator: 'hacCare'
      });

      // Convert canvas to image
      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      // Add pages as needed
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      // Save the PDF
      const filename = `Instructor_Guide_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(filename);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">Simulation Training System - Instructor Guide</h1>
                <p className="text-emerald-100 mt-1">Quick Reference Guide for Creating and Managing Clinical Simulations</p>
              </div>
            </div>
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-5 w-5" />
              <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div id="instructor-guide-content" className="p-8 prose prose-slate dark:prose-invert max-w-none">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0 mb-2">Overview</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-0">
              The Simulation Training System allows instructors to create reusable templates, launch live simulations, 
              and review student performance through comprehensive debrief reports. This guide covers the complete workflow 
              from template creation to session completion.
            </p>
          </div>

          <hr className="my-8 border-slate-200 dark:border-slate-700" />

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-sm font-bold">1</span>
              Creating a New Template
            </h2>
            <p className="text-slate-700 dark:text-slate-300">
              Templates are reusable simulation scenarios that can be launched multiple times with different student groups.
            </p>
            
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-4">Steps:</h3>
            <ol className="text-slate-700 dark:text-slate-300 space-y-2">
              <li>Navigate to the <strong>Templates</strong> tab</li>
              <li>Click <strong>Create New Template</strong></li>
              <li>Enter the following information:
                <ul className="mt-2">
                  <li><strong>Name:</strong> Descriptive title (e.g., "Post-Operative Care - Day 1")</li>
                  <li><strong>Description:</strong> Scenario overview and learning objectives</li>
                  <li><strong>Default Duration:</strong> Standard session length in minutes (typically 60-120)</li>
                </ul>
              </li>
              <li>Click <strong>Create Template</strong></li>
            </ol>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-900 dark:text-blue-100 mb-0">
                <strong>Result:</strong> Your new template appears in the Templates list with "Draft" status.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-sm font-bold">2</span>
              Adding Patients and Clinical Data
            </h2>
            <p className="text-slate-700 dark:text-slate-300">
              Once your template is created, add patient data that students will work with during the simulation.
            </p>

            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-4">Available Data Types:</h3>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {[
                'Patient Demographics',
                'Vital Signs',
                'Medications',
                'Lab Results',
                'Doctor\'s Orders',
                'Devices (IVs, Catheters, etc.)',
                'Wounds',
                'Patient Notes',
                'Intake & Output',
                'Body Map Locations'
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  {item}
                </div>
              ))}
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mt-4">
              <p className="text-sm text-amber-900 dark:text-amber-100 mb-2">
                <strong>Important:</strong>
              </p>
              <ul className="text-sm text-amber-900 dark:text-amber-100 space-y-1">
                <li>• All data entered becomes the <strong>baseline</strong> for every simulation</li>
                <li>• Students will see this data when the simulation starts</li>
                <li>• Student entries are tracked separately</li>
                <li>• Baseline data is restored each time you reset between groups</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-sm font-bold">3</span>
              Saving the Snapshot
            </h2>
            <p className="text-slate-700 dark:text-slate-300">
              After adding all baseline patient data, you must save a snapshot before launching simulations.
            </p>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-purple-900 dark:text-purple-100 mt-0">What is a Snapshot?</h4>
              <p className="text-sm text-purple-900 dark:text-purple-100 mb-0">
                A snapshot captures the current state of all patient data in the template. This frozen state is restored 
                each time you launch or reset a simulation, ensuring every student group starts with identical conditions.
              </p>
            </div>

            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-4">Steps:</h3>
            <ol className="text-slate-700 dark:text-slate-300 space-y-2">
              <li>Complete adding all patient data to your template</li>
              <li>Click <strong>Save Snapshot</strong> in the template actions menu</li>
              <li>Wait for confirmation message: "Snapshot saved successfully"</li>
              <li>Template status changes to "Active" and can now be launched</li>
            </ol>

            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 mt-4">
              <p className="text-sm font-bold text-red-900 dark:text-red-100 mb-2">
                ⚠️ Critical Rule:
              </p>
              <p className="text-sm text-red-900 dark:text-red-100 mb-0">
                <strong>ALWAYS</strong> save a new snapshot after making changes to template data. 
                Otherwise, simulations will launch with outdated information.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-sm font-bold">4</span>
              Launching a Simulation
            </h2>
            <p className="text-slate-700 dark:text-slate-300">
              Launch creates a live simulation session that students can access.
            </p>

            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-4">Steps:</h3>
            <ol className="text-slate-700 dark:text-slate-300 space-y-2">
              <li>Navigate to the <strong>Active</strong> tab</li>
              <li>Select your template from the dropdown</li>
              <li>Configure the session:
                <ul className="mt-2">
                  <li><strong>Session Name:</strong> Include group number and date</li>
                  <li><strong>Duration:</strong> Override template default if needed (in minutes)</li>
                  <li><strong>Participants:</strong> Select student users who will participate</li>
                </ul>
              </li>
              <li>Click <strong>Launch Simulation</strong></li>
            </ol>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 mt-4">
              <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">What Happens:</p>
              <ul className="text-sm text-green-900 dark:text-green-100 space-y-1">
                <li>• New tenant environment is created with clean patient data</li>
                <li>• Baseline data from snapshot is loaded</li>
                <li>• Timer starts counting down from specified duration</li>
                <li>• Students can now log in and begin clinical activities</li>
                <li>• All student actions are tracked for the debrief report</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-sm font-bold">5</span>
              Completing a Simulation
            </h2>
            <p className="text-slate-700 dark:text-slate-300">
              Mark the simulation complete when students finish their clinical work.
            </p>

            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-4">Steps:</h3>
            <ol className="text-slate-700 dark:text-slate-300 space-y-2">
              <li>Click <strong>Complete Simulation</strong> on the active session card</li>
              <li>Confirm the completion action</li>
              <li>Session moves to <strong>History</strong> tab</li>
              <li>Debrief report becomes available</li>
            </ol>

            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-4">What Gets Captured:</h3>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                'All vital signs recorded',
                'All medications administered',
                'All doctor\'s orders acknowledged',
                'All lab orders and results',
                'All patient documentation',
                'All device assessments',
                'All wound assessments',
                'All intake & output entries',
                'Complete activity timeline',
                'BCMA compliance tracking'
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-sm font-bold">6</span>
              Viewing the Debrief Report
            </h2>
            <p className="text-slate-700 dark:text-slate-300">
              Access comprehensive performance analytics after completing a simulation.
            </p>

            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-4">Report Sections:</h3>
            <div className="space-y-3 mt-3">
              <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3">
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">Overview Metrics</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-0">
                  Session duration, participants, total entries, averages
                </p>
              </div>
              <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3">
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">Performance Metrics</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-0">
                  BCMA compliance, interventions by category, activity breakdown with visual progress bars
                </p>
              </div>
              <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3">
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">Student Activity Log</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-0">
                  Individual student sections with all activities, timestamps, expandable assessment details
                </p>
              </div>
              <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3">
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">Instructor Notes</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-0">
                  Add feedback, print or download PDF for records
                </p>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-sm font-bold">7</span>
              Resetting for Next Group
            </h2>
            <p className="text-slate-700 dark:text-slate-300">
              Use the same simulation template with a new student group without recreating everything.
            </p>

            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-4">Steps:</h3>
            <ol className="text-slate-700 dark:text-slate-300 space-y-2">
              <li>From <strong>Active</strong> tab, click <strong>Reset Simulation</strong></li>
              <li>Confirm the reset action</li>
              <li>System performs automatic cleanup:
                <ul className="mt-2">
                  <li>• Deletes all student work (meds, vitals, notes, assessments)</li>
                  <li>• Restores baseline data from template snapshot</li>
                  <li>• Preserves patient barcode IDs (printed labels still work)</li>
                  <li>• Resets timer to original duration</li>
                </ul>
              </li>
            </ol>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-900 dark:text-blue-100 mb-0">
                <strong>Important:</strong> Patient demographics stay identical (same names, MRNs, barcodes). 
                Students start with clean slate but identical baseline conditions. Previous session data is archived in History.
              </p>
            </div>
          </section>

          {/* Best Practices */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 text-sm font-bold">★</span>
              Best Practices
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-4">
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm mb-2">Template Management</h4>
                <ul className="text-sm text-emerald-900 dark:text-emerald-100 space-y-1">
                  <li>• Use descriptive names</li>
                  <li>• Update snapshot after changes</li>
                  <li>• Test with practice session first</li>
                </ul>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-4">
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm mb-2">Session Planning</h4>
                <ul className="text-sm text-emerald-900 dark:text-emerald-100 space-y-1">
                  <li>• Launch 10-15 minutes early</li>
                  <li>• Verify baseline data loaded</li>
                  <li>• Have barcode labels ready</li>
                </ul>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-4">
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm mb-2">Debrief</h4>
                <ul className="text-sm text-emerald-900 dark:text-emerald-100 space-y-1">
                  <li>• Review immediately after</li>
                  <li>• Note strengths and gaps</li>
                  <li>• Use metrics to guide discussion</li>
                </ul>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-4">
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm mb-2">Reset Workflow</h4>
                <ul className="text-sm text-emerald-900 dark:text-emerald-100 space-y-1">
                  <li>• Complete and review first</li>
                  <li>• Reset before next group</li>
                  <li>• Verify timer reset correctly</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-700">
            <div className="text-center mb-6">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                <strong>Document Version:</strong> 1.0 | <strong>Last Updated:</strong> November 17, 2025
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                For technical documentation, see <code>/docs/operations/SIMULATION_RESET_SYSTEM.md</code>
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black rounded-lg p-6 text-center">
              <div className="flex flex-col items-center space-y-3">
                <p className="text-slate-300 dark:text-slate-400 text-sm">
                  © hacCare 2025 - A <span className="font-semibold text-white">haclabs</span> Product
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">Need assistance?</span>
                  <a 
                    href="mailto:support@haccare.app" 
                    className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors underline decoration-emerald-400/50 hover:decoration-emerald-300"
                  >
                    support@haccare.app
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationGuide;
