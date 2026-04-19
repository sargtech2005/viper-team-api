/**
 * /api/v1/pdf — PDF Utilities
 * Endpoints: /generate  /extract  /merge
 *
 * /generate → Create a PDF from structured JSON content (pdfkit — pure JS, no Chrome)
 * /extract  → Extract text from a base64-encoded PDF (pdf-parse — pure JS)
 * /merge    → Merge multiple base64-encoded PDFs into one (pdf-lib — pure JS)
 *
 * npm install pdfkit pdf-parse pdf-lib
 */

const express = require('express');
const router  = express.Router();

function fail(res, msg, code = 400) {
  return res.status(code).json({ success: false, error: msg });
}

function loadDep(name) {
  try { return require(name); } catch {
    return null;
  }
}

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/pdf/generate
   Generate a clean PDF from structured content.
   Body: {
     "title": "Invoice #001",
     "subtitle": "Issued by Acme Corp",
     "sections": [
       { "heading": "Bill To", "body": "John Doe\njohn@example.com" },
       { "heading": "Items", "table": { "headers": ["Item","Qty","Price"], "rows": [["Widget",2,"$10"]] } }
     ],
     "footer": "Thank you for your business"
   }
   ────────────────────────────────────────────────────────────────── */
router.post('/generate', async (req, res) => {
  const PDFDocument = loadDep('pdfkit');
  if (!PDFDocument) return fail(res, 'pdfkit not installed on this server. Run: npm install pdfkit', 503);

  const { title, subtitle, sections = [], footer } = req.body;
  if (!title) return fail(res, 'title is required');
  if (!Array.isArray(sections)) return fail(res, 'sections must be an array');

  try {
    const doc    = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));

    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);

      // ── Header bar ──
      doc.rect(0, 0, doc.page.width, 80).fill('#7c3aed');
      doc.fillColor('#ffffff')
         .fontSize(22).font('Helvetica-Bold')
         .text(title, 50, 22, { width: doc.page.width - 100 });
      if (subtitle) {
        doc.fontSize(11).font('Helvetica')
           .text(subtitle, 50, 50, { width: doc.page.width - 100 });
      }

      let y = 110;
      doc.fillColor('#0f172a');

      // ── Sections ──
      for (const sec of sections) {
        if (y > doc.page.height - 120) { doc.addPage(); y = 50; }

        if (sec.heading) {
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#7c3aed')
             .text(sec.heading, 50, y);
          y += 20;
          doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
          y += 10;
          doc.fillColor('#0f172a');
        }

        if (sec.body) {
          doc.fontSize(10).font('Helvetica')
             .text(sec.body, 50, y, { width: doc.page.width - 100 });
          y += doc.heightOfString(sec.body, { width: doc.page.width - 100 }) + 18;
        }

        if (sec.table && sec.table.headers && sec.table.rows) {
          const colCount = sec.table.headers.length;
          const colW     = (doc.page.width - 100) / colCount;

          // Header row
          doc.rect(50, y, doc.page.width - 100, 22).fill('#f1f5f9');
          doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
          sec.table.headers.forEach((h, i) => {
            doc.text(h, 55 + i * colW, y + 6, { width: colW - 10 });
          });
          y += 22;

          // Data rows
          sec.table.rows.forEach((row, ri) => {
            if (y > doc.page.height - 100) { doc.addPage(); y = 50; }
            if (ri % 2 === 1) doc.rect(50, y, doc.page.width - 100, 20).fill('#f8fafc');
            doc.fillColor('#0f172a').fontSize(9).font('Helvetica');
            row.forEach((cell, i) => {
              doc.text(String(cell), 55 + i * colW, y + 5, { width: colW - 10 });
            });
            y += 20;
          });
          y += 16;
        }

        y += 8;
      }

      // ── Footer ──
      if (footer) {
        doc.moveTo(50, doc.page.height - 60).lineTo(doc.page.width - 50, doc.page.height - 60).strokeColor('#e2e8f0').lineWidth(1).stroke();
        doc.fontSize(9).font('Helvetica').fillColor('#64748b')
           .text(footer, 50, doc.page.height - 50, { align: 'center', width: doc.page.width - 100 });
      }

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);
    const base64    = pdfBuffer.toString('base64');

    res.json({
      success:   true,
      pdf_base64: base64,
      size_bytes: pdfBuffer.length,
      usage:     'Decode base64 and save as .pdf, or set as data: URI in an <a download> link',
    });
  } catch (e) {
    fail(res, 'PDF generation failed: ' + e.message, 500);
  }
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/pdf/extract
   Body: { "pdf_base64": "JVBERi0x..." }
   Extracts all text from a PDF document.
   ────────────────────────────────────────────────────────────────── */
router.post('/extract', async (req, res) => {
  const pdfParse = loadDep('pdf-parse');
  if (!pdfParse) return fail(res, 'pdf-parse not installed on this server. Run: npm install pdf-parse', 503);

  const { pdf_base64, pdf_url } = req.body;
  if (!pdf_base64 && !pdf_url) return fail(res, 'pdf_base64 or pdf_url is required');

  try {
    let buffer;
    if (pdf_url) {
      const axios = require('axios');
      const { data } = await axios.get(pdf_url, { responseType: 'arraybuffer', timeout: 15000 });
      buffer = Buffer.from(data);
    } else {
      buffer = Buffer.from(pdf_base64, 'base64');
    }

    const data = await pdfParse(buffer);

    res.json({
      success:       true,
      text:          data.text.trim(),
      pages:         data.numpages,
      info:          data.info || {},
      chars:         data.text.length,
      words:         data.text.trim().split(/\s+/).filter(Boolean).length,
    });
  } catch (e) {
    fail(res, 'PDF extraction failed: ' + e.message, 500);
  }
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/pdf/merge
   Body: { "pdfs": ["base64pdf1...", "base64pdf2..."] }
   Merges multiple PDFs into one, returns base64.
   ────────────────────────────────────────────────────────────────── */
router.post('/merge', async (req, res) => {
  const pdfLib = loadDep('pdf-lib');
  if (!pdfLib) return fail(res, 'pdf-lib not installed on this server. Run: npm install pdf-lib', 503);

  const { pdfs } = req.body;
  if (!Array.isArray(pdfs) || pdfs.length < 2) return fail(res, 'pdfs must be an array of at least 2 base64-encoded PDFs');
  if (pdfs.length > 10) return fail(res, 'Maximum 10 PDFs can be merged at once');

  try {
    const { PDFDocument } = pdfLib;
    const merged = await PDFDocument.create();
    let totalPages = 0;

    for (let i = 0; i < pdfs.length; i++) {
      let buf;
      try { buf = Buffer.from(pdfs[i], 'base64'); } catch {
        return fail(res, `pdfs[${i}] is not valid base64`);
      }
      const src   = await PDFDocument.load(buf);
      const pages = await merged.copyPages(src, src.getPageIndices());
      pages.forEach(p => merged.addPage(p));
      totalPages += src.getPageCount();
    }

    const pdfBytes = await merged.save();
    const base64   = Buffer.from(pdfBytes).toString('base64');

    res.json({
      success:       true,
      pdf_base64:    base64,
      total_pages:   totalPages,
      input_count:   pdfs.length,
      size_bytes:    pdfBytes.byteLength,
    });
  } catch (e) {
    fail(res, 'PDF merge failed: ' + e.message, 500);
  }
});

module.exports = router;
