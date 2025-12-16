/**
 * Dynamic PDF Library Loader
 * 
 * Lazy loads jsPDF and html2canvas only when needed to reduce initial bundle size.
 * These libraries are ~500KB combined and only used for PDF export functionality.
 */

export interface PdfLibraries {
  jsPDF: typeof import('jspdf').default;
  html2canvas: typeof import('html2canvas').default;
}

let cachedLibraries: PdfLibraries | null = null;

/**
 * Dynamically import PDF libraries only when needed
 * Uses caching to avoid repeated imports
 */
export async function loadPdfLibraries(): Promise<PdfLibraries> {
  if (cachedLibraries) {
    return cachedLibraries;
  }

  const [jsPDFModule, html2canvasModule] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  cachedLibraries = {
    jsPDF: jsPDFModule.default,
    html2canvas: html2canvasModule.default,
  };

  return cachedLibraries;
}
