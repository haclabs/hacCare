/**
 * Professional PDF Export Service for Simulation Debrief Reports
 * Generates high-quality, print-ready PDFs with preserved styling
 */

import { format } from 'date-fns';
import { loadPdfLibraries } from '../../utils/pdfLoader';

export interface PdfExportOptions {
  filename?: string;
  title?: string;
  orientation?: 'portrait' | 'landscape';
  quality?: number;
}

/**
 * Export the debrief report to PDF
 * @param elementId - The DOM element ID to convert to PDF
 * @param options - Export configuration options
 */
export async function exportDebriefToPdf(
  elementId: string,
  options: PdfExportOptions = {}
): Promise<void> {
  const {
    filename = `Simulation_Debrief_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`,
    title = 'Clinical Simulation Debrief Report',
    orientation = 'portrait',
    quality = 2
  } = options;

  try {
    // Dynamically load PDF libraries only when needed
    const { jsPDF, html2canvas } = await loadPdfLibraries();
    
    // Get the element to export
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    // Show loading indicator
    const loadingOverlay = showLoadingOverlay();

    try {
      // Temporarily show print view and hide screen view
      const screenViews = element.querySelectorAll('.print\\:hidden');
      const printViews = element.querySelectorAll('.print\\:block');
      
      screenViews.forEach(el => (el as HTMLElement).style.display = 'none');
      printViews.forEach(el => (el as HTMLElement).style.display = 'block');

      // Wait for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Convert to canvas with high quality
      const canvas = await html2canvas(element, {
        scale: quality,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794, // A4 width in pixels at 96 DPI
        allowTaint: true,
        imageTimeout: 0
      });

      // Restore original visibility
      screenViews.forEach(el => (el as HTMLElement).style.display = '');
      printViews.forEach(el => (el as HTMLElement).style.display = '');

      // Calculate PDF dimensions
      const imgWidth = orientation === 'portrait' ? 210 : 297; // A4 dimensions in mm
      const pageHeight = orientation === 'portrait' ? 297 : 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Create PDF
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Add title metadata
      pdf.setProperties({
        title,
        subject: 'Simulation Performance Debrief',
        author: 'hacCare Clinical Simulation Platform',
        keywords: 'simulation, debrief, performance, clinical',
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
      pdf.save(filename);

    } finally {
      // Hide loading indicator
      hideLoadingOverlay(loadingOverlay);
    }

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again or use the print function.');
    throw error;
  }
}

/**
 * Show loading overlay during PDF generation
 */
function showLoadingOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.id = 'pdf-loading-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 2rem;
    border-radius: 0.5rem;
    text-align: center;
    max-width: 300px;
  `;

  content.innerHTML = `
    <div style="margin-bottom: 1rem;">
      <div style="
        border: 4px solid #f3f4f6;
        border-top: 4px solid #3b82f6;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto;
      "></div>
    </div>
    <h3 style="font-size: 1.125rem; font-weight: 600; color: #1f2937; margin-bottom: 0.5rem;">Generating PDF</h3>
    <p style="font-size: 0.875rem; color: #6b7280;">Please wait while we create your debrief report...</p>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  return overlay;
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay(overlay: HTMLElement): void {
  if (overlay && overlay.parentNode) {
    overlay.parentNode.removeChild(overlay);
  }
}
