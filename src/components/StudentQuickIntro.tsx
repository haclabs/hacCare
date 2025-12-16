/**
 * ===========================================================================
 * STUDENT QUICK INTRO GUIDE
 * ===========================================================================
 * Display comprehensive student guide for patient care simulation system
 * ===========================================================================
 */

import React, { useState } from 'react';
import { BookOpen, Download, X } from 'lucide-react';
import { HACCARE_LOGO_BASE64 } from '../utils/logoBase64';
import { loadPdfLibraries } from '../utils/pdfLoader';

interface StudentQuickIntroProps {
  onClose: () => void;
}

const StudentQuickIntro: React.FC<StudentQuickIntroProps> = ({ onClose }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    
    try {
      // Dynamically load PDF libraries only when needed
      const { jsPDF, html2canvas } = await loadPdfLibraries();
      
      const element = document.getElementById('student-guide-content');
      if (!element) {
        console.error('Guide content element not found');
        return;
      }

      // Temporarily scale down the content for better PDF sizing
      const originalTransform = element.style.transform;
      element.style.transform = 'scale(0.75)';
      element.style.transformOrigin = 'top left';
      element.style.width = '133.33%';
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1060,
        allowTaint: true,
      });
      
      element.style.transform = originalTransform;
      element.style.width = '';

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const contentStartY = 50;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      pdf.setProperties({
        title: 'hacCare Student Quick Guide',
        subject: 'Clinical Simulation Student Reference',
        author: 'hacCare Clinical Simulation Platform',
        keywords: 'simulation, student, guide, patient care, clinical',
        creator: 'hacCare'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Header
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, 35, 'F');
      
      try {
        const logoWidth = 40;
        const logoHeight = 13;
        const logoX = (pageWidth - logoWidth) / 2;
        pdf.addImage(HACCARE_LOGO_BASE64, 'PNG', logoX, 8, logoWidth, logoHeight);
      } catch (error) {
        console.warn('Could not add logo to PDF:', error);
      }
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 41, 59);
      pdf.text('hacCare - Patient Care Simulation', pageWidth / 2, 25, { align: 'center' });
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);
      pdf.text('Student Quick Start Guide', pageWidth / 2, 30, { align: 'center' });
      
      // Add border
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(0, 35, pageWidth, 35);

      // Add content
      const imgData = canvas.toDataURL('image/png');
      let heightLeft = imgHeight;
      let position = contentStartY;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - contentStartY);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + contentStartY;
        pdf.addPage();
        
        // Add header to subsequent pages
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, 20, 'F');
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139);
        pdf.text('hacCare Student Guide', 10, 12);
        pdf.text(`Page ${pdf.internal.pages.length - 1}`, pageWidth - 30, 12);
        pdf.setDrawColor(226, 232, 240);
        pdf.line(0, 20, pageWidth, 20);
        
        pdf.addImage(imgData, 'PNG', 0, position + 20, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Add footer to all pages
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7);
        pdf.setTextColor(148, 163, 184);
        pdf.text(
          `Generated: ${new Date().toLocaleString()} | © ${new Date().getFullYear()} hacCare Clinical Simulation Platform`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      pdf.save(`hacCare-Student-Guide-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Student Quick Intro</h2>
              <p className="text-blue-100 text-sm">How to use hacCare Patient System</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              <span className="font-medium">{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div id="student-guide-content" className="prose prose-blue max-w-none">
            {/* Welcome Section */}
            <section className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <h1 className="text-3xl font-bold text-gray-900 mb-3 flex items-center">
                👋 Welcome to hacCare Patient System
              </h1>
              <p className="text-lg text-gray-700 mb-2">
                This guide will help you navigate the patient care simulation system and understand all available features.
              </p>
              <p className="text-sm text-gray-600 italic">
                💡 Tip: You can download this guide as a PDF for offline reference using the button above.
              </p>
            </section>

            {/* Getting Started */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
                🚀 Getting Started
              </h2>
              
              <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Patient Overview Screen</h3>
                <p className="text-gray-700 mb-3">
                  When you first open a patient, you'll see the <strong>Overview Screen</strong> with the patient's basic information and status:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Patient Name & ID:</strong> Displayed prominently at the top</li>
                  <li><strong>Age & Room Number:</strong> Key demographic information</li>
                  <li><strong>Status Indicator:</strong> Shows if patient is Stable, Assessment Needed, etc.</li>
                  <li><strong>ID Bracelet Button:</strong> Click to view/print patient identification bracelet</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-gray-800">
                  <strong>📋 Pro Tip:</strong> Always verify the patient's identity using the ID bracelet before providing care - just like in real clinical practice!
                </p>
              </div>
            </section>

            {/* Navigation */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
                🧭 Navigation & Module Cards
              </h2>
              
              <p className="text-gray-700 mb-4">
                The patient system uses a <strong>card-based interface</strong> where each card represents a different aspect of patient care. Cards are organized in rows for easy access:
              </p>

              <div className="space-y-4">
                {/* Row 1 */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-blue-600 mb-3">Row 1 - Documentation & Planning</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border-l-4 border-blue-500 pl-3">
                      <p className="font-semibold text-gray-900">📄 View Patient Record</p>
                      <p className="text-sm text-gray-600">Access complete medical record with history, assessments, and all documentation</p>
                    </div>
                    <div className="border-l-4 border-purple-500 pl-3">
                      <p className="font-semibold text-gray-900">📋 Advanced Directives</p>
                      <p className="text-sm text-gray-600">Review patient wishes for resuscitation, DNR status, and end-of-life care</p>
                    </div>
                    <div className="border-l-4 border-green-500 pl-3">
                      <p className="font-semibold text-gray-900">🗺️ hacMap</p>
                      <p className="text-sm text-gray-600">Interactive care planning tool for organizing nursing interventions</p>
                    </div>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-amber-600 mb-3">Row 2 - Orders & Diagnostics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border-l-4 border-amber-500 pl-3">
                      <p className="font-semibold text-gray-900">📝 Doctor's Orders</p>
                      <p className="text-sm text-gray-600">View and implement physician orders for medications, treatments, and tests</p>
                    </div>
                    <div className="border-l-4 border-red-500 pl-3">
                      <p className="font-semibold text-gray-900">🔬 Labs</p>
                      <p className="text-sm text-gray-600">Review laboratory results including blood work, chemistry panels, and cultures</p>
                    </div>
                    <div className="border-l-4 border-pink-500 pl-3">
                      <p className="font-semibold text-gray-900">💓 Vitals</p>
                      <p className="text-sm text-gray-600">Monitor vital signs - temperature, BP, heart rate, respiratory rate, O2 sat</p>
                    </div>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-indigo-600 mb-3">Row 3 - Clinical Care & Assessment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border-l-4 border-indigo-500 pl-3">
                      <p className="font-semibold text-gray-900">🗣️ Handover Notes</p>
                      <p className="text-sm text-gray-600">Communication tool for shift reports and nurse-to-nurse handoffs</p>
                    </div>
                    <div className="border-l-4 border-teal-500 pl-3">
                      <p className="font-semibold text-gray-900">💊 Medications</p>
                      <p className="text-sm text-gray-600">MAR (Medication Administration Record) - document all meds given</p>
                    </div>
                    <div className="border-l-4 border-cyan-500 pl-3">
                      <p className="font-semibold text-gray-900">📋 Assessments</p>
                      <p className="text-sm text-gray-600">Complete clinical assessment forms (head-to-toe, focused, specialty)</p>
                    </div>
                  </div>
                </div>

                {/* Row 4 */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-emerald-600 mb-3">Row 4 - Monitoring & Discharge</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-l-4 border-emerald-500 pl-3">
                      <p className="font-semibold text-gray-900">💧 Intake & Output</p>
                      <p className="text-sm text-gray-600">Track all fluids in/out including IVs, oral intake, urine output</p>
                    </div>
                    <div className="border-l-4 border-slate-500 pl-3">
                      <p className="font-semibold text-gray-900">📤 Discharge Summary</p>
                      <p className="text-sm text-gray-600">Prepare discharge documentation and patient education materials</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Key Features */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
                ⭐ Key Features & Tips
              </h2>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">🔍 Finding Information Quickly</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Use the <strong>breadcrumb navigation</strong> at the top to return to Overview</li>
                    <li>Each module has its own <strong>color-coded card</strong> for easy identification</li>
                    <li>Look for <strong>badges</strong> on cards (like "NEW" or "URGENT") for important items</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">📋 Documentation Best Practices</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Always <strong>document immediately</strong> after providing care</li>
                    <li>Be thorough with <strong>vital signs</strong> - include all measurements and times</li>
                    <li>Complete <strong>assessment forms</strong> fully for comprehensive patient evaluation</li>
                    <li>Use <strong>handover notes</strong> to communicate important updates to the next shift</li>
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-amber-900 mb-2">💊 Medication Safety</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Always check <strong>5 Rights</strong>: Right Patient, Drug, Dose, Route, Time</li>
                    <li>Review <strong>Doctor's Orders</strong> before administering any medication</li>
                    <li>Document in the <strong>Medications/MAR</strong> section immediately after giving meds</li>
                    <li>Watch for <strong>allergies</strong> listed in patient information</li>
                  </ul>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">🎯 Priority Setting</h3>
                  <p className="text-gray-700 mb-2">Use this order to prioritize your patient care:</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                    <li><strong>Vitals First</strong> - Check and document vital signs</li>
                    <li><strong>Assessments</strong> - Complete head-to-toe or focused assessment</li>
                    <li><strong>Medications Due</strong> - Check MAR for scheduled meds</li>
                    <li><strong>Doctor's Orders</strong> - Review for new orders to implement</li>
                    <li><strong>Labs</strong> - Check for critical results that need action</li>
                    <li><strong>I&O</strong> - Monitor fluid balance throughout shift</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* Common Workflows */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
                🔄 Common Workflows
              </h2>

              <div className="space-y-5">
                <div className="bg-white border-2 border-gray-300 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📍 Workflow 1: Starting Your Shift</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                    <li>Click <strong>ID Bracelet</strong> to verify patient identity</li>
                    <li>Review <strong>Handover Notes</strong> from previous shift</li>
                    <li>Check <strong>Advanced Directives</strong> for code status</li>
                    <li>Obtain and document <strong>Vitals</strong></li>
                    <li>Review <strong>Doctor's Orders</strong> for new orders</li>
                    <li>Check <strong>Medications</strong> for scheduled doses</li>
                  </ol>
                </div>

                <div className="bg-white border-2 border-gray-300 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">💊 Workflow 2: Administering Medication</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                    <li>Click <strong>Doctor's Orders</strong> to verify medication order</li>
                    <li>Check patient <strong>allergies</strong> in overview section</li>
                    <li>Obtain necessary <strong>Vitals</strong> (e.g., BP before antihypertensive)</li>
                    <li>Verify 5 Rights using <strong>ID Bracelet</strong></li>
                    <li>Document administration in <strong>Medications/MAR</strong></li>
                  </ol>
                </div>

                <div className="bg-white border-2 border-gray-300 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Workflow 3: Responding to Abnormal Labs</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                    <li>Review <strong>Labs</strong> section for critical values</li>
                    <li>Check <strong>Vitals</strong> for related changes</li>
                    <li>Document findings in <strong>Assessments</strong></li>
                    <li>Review <strong>Doctor's Orders</strong> for relevant orders</li>
                    <li>Add note to <strong>Handover Notes</strong> for next shift</li>
                  </ol>
                </div>

                <div className="bg-white border-2 border-gray-300 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🏁 Workflow 4: Ending Your Shift</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                    <li>Complete final <strong>Vitals</strong> check</li>
                    <li>Document end-of-shift <strong>Assessment</strong></li>
                    <li>Update <strong>I&O</strong> totals for the shift</li>
                    <li>Write comprehensive <strong>Handover Notes</strong> for incoming nurse</li>
                    <li>Review <strong>Patient Record</strong> to ensure all documentation is complete</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* Quick Reference */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
                📚 Quick Reference Guide
              </h2>

              <div className="bg-gradient-to-br from-slate-50 to-gray-100 border border-gray-300 rounded-lg p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-400">
                      <th className="text-left py-2 px-3 font-bold text-gray-900">Module</th>
                      <th className="text-left py-2 px-3 font-bold text-gray-900">When to Use</th>
                      <th className="text-left py-2 px-3 font-bold text-gray-900">Key Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    <tr>
                      <td className="py-3 px-3 font-semibold">Vitals</td>
                      <td className="py-3 px-3">Every 4 hours, before meds, when status changes</td>
                      <td className="py-3 px-3">Take & document all vital signs</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold">Medications</td>
                      <td className="py-3 px-3">Before scheduled times, PRN as needed</td>
                      <td className="py-3 px-3">Document administration, note effects</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold">Assessments</td>
                      <td className="py-3 px-3">Start of shift, q4-8h, with changes</td>
                      <td className="py-3 px-3">Complete assessment forms thoroughly</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold">Labs</td>
                      <td className="py-3 px-3">When results available, before treatments</td>
                      <td className="py-3 px-3">Review results, identify abnormals</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold">I&O</td>
                      <td className="py-3 px-3">Continuously throughout shift</td>
                      <td className="py-3 px-3">Document all intake/output in real-time</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold">Handover</td>
                      <td className="py-3 px-3">Start and end of shift</td>
                      <td className="py-3 px-3">Read at start, write at end of shift</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Tips & Tricks */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
                💡 Tips & Tricks
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-semibold text-blue-900 mb-1">⚡ Quick Access</p>
                  <p className="text-sm text-gray-700">Click "Overview" breadcrumb at any time to return to the main module selection screen</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="font-semibold text-green-900 mb-1">✅ Complete Records</p>
                  <p className="text-sm text-gray-700">Use "View Patient Record" to see all your documentation in one place before ending your shift</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="font-semibold text-amber-900 mb-1">🎯 Stay Organized</p>
                  <p className="text-sm text-gray-700">Use hacMap to organize your nursing care plan and keep track of interventions</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="font-semibold text-purple-900 mb-1">📱 Print Records</p>
                  <p className="text-sm text-gray-700">Many modules allow printing - useful for clinical conferences or reviews</p>
                </div>
              </div>
            </section>

            {/* Need Help */}
            <section className="mb-8">
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-red-900 mb-3">🆘 Need Help?</h2>
                <p className="text-gray-700 mb-3">
                  If you're having trouble or have questions:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Ask your <strong>clinical instructor</strong> for guidance</li>
                  <li>Review this guide - you can access it anytime by clicking <strong>"Quick Intro"</strong> next to the ID Bracelet button</li>
                  <li>Practice in the system - it's a safe learning environment!</li>
                  <li>Collaborate with classmates to learn features together</li>
                </ul>
              </div>
            </section>

            {/* Footer */}
            <section className="mt-12 pt-6 border-t-2 border-gray-300">
              <p className="text-center text-gray-600 text-sm">
                <strong>hacCare Clinical Simulation Platform</strong><br />
                Student Quick Start Guide | Version 1.0 | November 2025
              </p>
              <p className="text-center text-gray-500 text-xs mt-2">
                This guide covers the essential features of the hacCare patient care system.<br />
                For additional support, contact your clinical instructor.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentQuickIntro;
