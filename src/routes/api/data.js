/**
 * /api/v1/data — Data Conversion & Manipulation
 * Endpoints: /csv-to-json  /json-to-csv  /xml-to-json  /json-to-xml
 *            /flatten  /paginate
 *
 * npm install csv-parse csv-stringify xml2js
 */

const express   = require('express');
const router    = express.Router();
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const xml2js    = require('xml2js');

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/data/csv-to-json
   Body: { "csv": "name,age\nAlice,30\nBob,25", "delimiter": "," }
   ────────────────────────────────────────────────────────────────── */
router.post('/csv-to-json', (req, res) => {
  const { csv, delimiter = ',' } = req.body;
  if (!csv) return res.status(400).json({ success: false, error: 'csv (string) is required' });

  try {
    const records = parse(csv, {
      columns:          true,
      delimiter,
      skip_empty_lines: true,
      trim:             true,
    });
    res.json({ success: true, count: records.length, data: records });
  } catch (e) {
    res.status(400).json({ success: false, error: 'CSV parse error: ' + e.message });
  }
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/data/json-to-csv
   Body: { "data": [{"name":"Alice","age":30}], "delimiter": "," }
   ────────────────────────────────────────────────────────────────── */
router.post('/json-to-csv', (req, res) => {
  const { data, delimiter = ',' } = req.body;
  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ success: false, error: 'data must be a JSON array' });
  }
  if (data.length === 0) {
    return res.status(400).json({ success: false, error: 'data array is empty' });
  }

  try {
    const csv = stringify(data, { header: true, delimiter });
    res.json({ success: true, rows: data.length, csv });
  } catch (e) {
    res.status(400).json({ success: false, error: 'CSV stringify error: ' + e.message });
  }
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/data/xml-to-json
   Body: { "xml": "<root><user><name>Alice</name></user></root>" }
   ────────────────────────────────────────────────────────────────── */
router.post('/xml-to-json', async (req, res) => {
  const { xml } = req.body;
  if (!xml) return res.status(400).json({ success: false, error: 'xml (string) is required' });

  try {
    const result = await xml2js.parseStringPromise(xml, {
      explicitArray: false,
      mergeAttrs:    true,
      trim:          true,
    });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(400).json({ success: false, error: 'XML parse error: ' + e.message });
  }
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/data/json-to-xml
   Body: { "data": {"user":{"name":"Alice","age":30}}, "root": "root" }
   ────────────────────────────────────────────────────────────────── */
router.post('/json-to-xml', (req, res) => {
  const { data, root = 'root', pretty = true } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ success: false, error: 'data must be a JSON object' });
  }

  try {
    const builder = new xml2js.Builder({
      rootName:     root,
      renderOpts:   { pretty: Boolean(pretty), indent: '  ' },
      xmldec:       { version: '1.0', encoding: 'UTF-8' },
    });
    const xml = builder.buildObject(data);
    res.json({ success: true, xml });
  } catch (e) {
    res.status(400).json({ success: false, error: 'XML build error: ' + e.message });
  }
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/data/flatten
   Flattens a deeply nested JSON object into dot-notation keys.
   Body: { "data": {"a":{"b":{"c":1}}}, "separator": "." }
   Result: { "a.b.c": 1 }
   ────────────────────────────────────────────────────────────────── */
router.post('/flatten', (req, res) => {
  const { data, separator = '.' } = req.body;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ success: false, error: 'data must be a JSON object (not array)' });
  }

  function flatten(obj, prefix = '') {
    const result = {};
    for (const key of Object.keys(obj)) {
      const fullKey = prefix ? `${prefix}${separator}${key}` : key;
      const val     = obj[key];
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        Object.assign(result, flatten(val, fullKey));
      } else {
        result[fullKey] = val;
      }
    }
    return result;
  }

  const flat  = flatten(data);
  const count = Object.keys(flat).length;
  res.json({ success: true, key_count: count, separator, data: flat });
});

/* ──────────────────────────────────────────────────────────────────
   POST /api/v1/data/paginate
   Paginate any JSON array server-side.
   Body: { "data": [...], "page": 1, "per_page": 10 }
   ────────────────────────────────────────────────────────────────── */
router.post('/paginate', (req, res) => {
  const { data, page = 1, per_page = 10 } = req.body;
  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ success: false, error: 'data must be a JSON array' });
  }

  const p   = Math.max(1, parseInt(page));
  const pp  = Math.min(Math.max(1, parseInt(per_page)), 200);
  const total       = data.length;
  const total_pages = Math.ceil(total / pp);
  const start       = (p - 1) * pp;
  const items       = data.slice(start, start + pp);

  res.json({
    success:     true,
    page:        p,
    per_page:    pp,
    total_items: total,
    total_pages,
    has_prev:    p > 1,
    has_next:    p < total_pages,
    from:        start + 1,
    to:          Math.min(start + pp, total),
    data:        items,
  });
});

module.exports = router;
