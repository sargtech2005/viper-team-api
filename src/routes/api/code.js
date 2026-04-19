/**
 * /api/v1/code — Code Utilities
 *
 * POST /api/v1/code/minify   { code, type: "js"|"css"|"html"|"json" }
 * POST /api/v1/code/format   { code, type: "json"|"html" }
 * POST /api/v1/code/count    { code }
 * POST /api/v1/code/escape   { code, type: "html"|"url"|"base64"|"unicode" }
 * POST /api/v1/code/unescape { code, type: "html"|"url"|"base64"|"unicode" }
 *
 * All local — zero external dependencies, no API calls.
 */

const express = require('express');
const router  = express.Router();
const fail    = (res, msg, code = 400) => res.status(code).json({ success: false, error: msg });

/* ── POST /minify ── */
router.post('/minify', (req, res) => {
  const { code, type = 'json' } = req.body || {};
  if (!code) return fail(res, 'code is required');
  const original_size = Buffer.byteLength(code, 'utf8');

  try {
    let minified;

    if (type === 'json') {
      minified = JSON.stringify(JSON.parse(code));
    }
    else if (type === 'html') {
      minified = code
        .replace(/<!--[\s\S]*?-->/g, '')           // remove comments
        .replace(/\s+/g, ' ')                       // collapse whitespace
        .replace(/>\s+</g, '><')                    // remove space between tags
        .replace(/\s+>/g, '>')                      // trim before >
        .replace(/<\s+/g, '<')                      // trim after <
        .trim();
    }
    else if (type === 'css') {
      minified = code
        .replace(/\/\*[\s\S]*?\*\//g, '')           // remove comments
        .replace(/\s+/g, ' ')                       // collapse whitespace
        .replace(/\s*([{}:;,>~+])\s*/g, '$1')       // remove space around symbols
        .replace(/;}/g, '}')                        // remove last semicolon in block
        .trim();
    }
    else if (type === 'js') {
      // Basic JS minification — removes comments and collapses whitespace
      // NOT a full parser — use for simple scripts, not production bundles
      minified = code
        .replace(/\/\*[\s\S]*?\*\//g, '')           // block comments
        .replace(/\/\/[^\n]*/g, '')                 // line comments
        .replace(/\n+/g, '\n')                      // collapse newlines
        .replace(/[ \t]+/g, ' ')                    // collapse spaces
        .replace(/ ?([\+\-\*\/\%\=\!\<\>\&\|\?\:\,\;\{\}\(\)\[\]]) ?/g, '$1') // strip spaces around operators
        .replace(/\n/g, ';')                        // replace newlines with semicolons (crude)
        .replace(/;;+/g, ';')                       // dedupe semicolons
        .trim();
    }
    else {
      return fail(res, 'type must be one of: json, html, css, js');
    }

    const minified_size = Buffer.byteLength(minified, 'utf8');
    const saved         = original_size - minified_size;
    const saved_pct     = Math.round((saved / original_size) * 100);

    res.json({
      success: true, type,
      original_size, minified_size,
      saved_bytes: saved,
      saved_percent: saved_pct + '%',
      minified,
    });
  } catch (e) {
    fail(res, `Minification failed: ${e.message}`);
  }
});

/* ── POST /format ── */
router.post('/format', (req, res) => {
  const { code, type = 'json', indent = 2 } = req.body || {};
  if (!code) return fail(res, 'code is required');
  const spaces = Math.min(parseInt(indent) || 2, 8);

  try {
    let formatted;

    if (type === 'json') {
      formatted = JSON.stringify(JSON.parse(code), null, spaces);
    }
    else if (type === 'html') {
      // Simple HTML indenter
      let level = 0;
      const pad = () => ' '.repeat(level * spaces);
      const selfClosing = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i;
      formatted = code
        .replace(/>\s*</g, '>\n<')
        .split('\n')
        .map(line => {
          line = line.trim();
          if (!line) return '';
          if (line.startsWith('</')) { level = Math.max(0, level - 1); return pad() + line; }
          const out = pad() + line;
          const tag = line.match(/^<([a-zA-Z][^\s>\/]*)/)?.[1];
          if (tag && !selfClosing.test(tag) && !line.startsWith('<!') && !line.endsWith('/>')) level++;
          return out;
        })
        .filter(Boolean)
        .join('\n');
    }
    else {
      return fail(res, 'type must be one of: json, html');
    }

    res.json({ success: true, type, indent: spaces, formatted });
  } catch (e) {
    fail(res, `Formatting failed: ${e.message}`);
  }
});

/* ── POST /count ── */
router.post('/count', (req, res) => {
  const { code } = req.body || {};
  if (!code) return fail(res, 'code is required');

  const lines       = code.split('\n');
  const blank       = lines.filter(l => l.trim() === '').length;
  const comments    = lines.filter(l => /^\s*(\/\/|#|\/\*|\*|<!--)/.test(l)).length;
  const code_lines  = lines.length - blank - comments;

  // Detect language
  let lang = 'Unknown';
  if (/^\s*(const|let|var|function|=\>|import|export|require)/.test(code)) lang = 'JavaScript';
  else if (/^\s*(def |class |import |from |if __name__)/.test(code)) lang = 'Python';
  else if (/^\s*(<?php|\$[a-z])/.test(code)) lang = 'PHP';
  else if (/^\s*(public|private|protected|class|import java)/.test(code)) lang = 'Java';
  else if (/<html|<head|<body|<div|<!DOCTYPE/i.test(code)) lang = 'HTML';
  else if (/^\s*[\.\#\@][a-z]|\{[\s\S]*?:/.test(code)) lang = 'CSS';
  else if (/^\s*\{[\s\S]*\}$/.test(code.trim())) { try { JSON.parse(code); lang = 'JSON'; } catch (_) {} }

  res.json({
    success: true,
    detected_language: lang,
    total_lines:   lines.length,
    code_lines,
    comment_lines: comments,
    blank_lines:   blank,
    characters:    code.length,
    bytes:         Buffer.byteLength(code, 'utf8'),
    words:         code.split(/\s+/).filter(Boolean).length,
  });
});

/* ── POST /escape ── */
router.post('/escape', (req, res) => {
  const { code, type = 'html' } = req.body || {};
  if (!code) return fail(res, 'code is required');

  try {
    let result;
    if (type === 'html') {
      result = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
    } else if (type === 'url') {
      result = encodeURIComponent(code);
    } else if (type === 'base64') {
      result = Buffer.from(code, 'utf8').toString('base64');
    } else if (type === 'unicode') {
      result = [...code].map(c => c.charCodeAt(0) > 127 ? `\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}` : c).join('');
    } else {
      return fail(res, 'type must be one of: html, url, base64, unicode');
    }
    res.json({ success: true, type, original: code, escaped: result });
  } catch (e) {
    fail(res, `Escape failed: ${e.message}`);
  }
});

/* ── POST /unescape ── */
router.post('/unescape', (req, res) => {
  const { code, type = 'html' } = req.body || {};
  if (!code) return fail(res, 'code is required');

  try {
    let result;
    if (type === 'html') {
      result = code.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#039;/g,"'");
    } else if (type === 'url') {
      result = decodeURIComponent(code);
    } else if (type === 'base64') {
      result = Buffer.from(code, 'base64').toString('utf8');
    } else if (type === 'unicode') {
      result = code.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    } else {
      return fail(res, 'type must be one of: html, url, base64, unicode');
    }
    res.json({ success: true, type, original: code, unescaped: result });
  } catch (e) {
    fail(res, `Unescape failed: ${e.message}`);
  }
});

module.exports = router;
