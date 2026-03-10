const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

/**
 * Generate a PDF from HTML content and save it
 * @param {string} html - The HTML content to convert to PDF
 * @param {string} title - The title for the PDF file
 * @param {boolean} saveToFile - Whether to save the PDF to file system
 * @returns {Promise<{buffer: Buffer, filename: string, filepath: string}>} - The PDF buffer and file info
 */
async function generatePDF(html, title = 'document', saveToFile = false) {
  let browser;
  let filename = '';
  let filepath = '';
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set the HTML content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    filename = `${safeTitle}-${dateStr}-${timeStr}.pdf`;
    
    // Create reports directory if it doesn't exist
    const reportsDir = path.join(__dirname, '..', 'public', 'uploads', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    filepath = path.join(reportsDir, filename);

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 10px; color: #666; padding: 5px;">
          <span>${title}</span> - <span class="date"></span>
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 10px; color: #666; padding: 5px;">
          Page <span class="pageNumber"></span> sur <span class="totalPages"></span>
        </div>
      `
    });

    // Save to file if requested
    if (saveToFile) {
      fs.writeFileSync(filepath, pdfBuffer);
      console.log('PDF saved to:', filepath);
    }

    return {
      buffer: pdfBuffer,
      filename: filename,
      filepath: filepath
    };
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Erreur lors de la génération du PDF: ' + error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generate a PDF from a URL
 * @param {string} url - The URL to convert to PDF
 * @param {string} title - The title for the PDF file
 * @param {boolean} saveToFile - Whether to save the PDF to file system
 * @returns {Promise<{buffer: Buffer, filename: string, filepath: string}>} - The PDF buffer and file info
 */
async function generatePDFFromURL(url, title = 'document', saveToFile = false) {
  let browser;
  let filename = '';
  let filepath = '';
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Navigate to the URL
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    filename = `${safeTitle}-${dateStr}-${timeStr}.pdf`;
    
    // Create reports directory if it doesn't exist
    const reportsDir = path.join(__dirname, '..', 'public', 'uploads', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    filepath = path.join(reportsDir, filename);

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 10px; color: #666; padding: 5px;">
          <span>${title}</span> - <span class="date"></span>
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 10px; color: #666; padding: 5px;">
          Page <span class="pageNumber"></span> sur <span class="totalPages"></span>
        </div>
      `
    });

    // Save to file if requested
    if (saveToFile) {
      fs.writeFileSync(filepath, pdfBuffer);
      console.log('PDF saved to:', filepath);
    }

    return {
      buffer: pdfBuffer,
      filename: filename,
      filepath: filepath
    };
  } catch (error) {
    console.error('Error generating PDF from URL:', error);
    throw new Error('Erreur lors de la génération du PDF: ' + error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  generatePDF,
  generatePDFFromURL
};
