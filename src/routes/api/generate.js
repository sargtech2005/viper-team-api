const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');

// ─── Random Name Generator ────────────────────────────────────────────────────
router.get('/name', (req, res) => {
  const count  = Math.min(Math.max(parseInt(req.query.count) || 1, 1), 20);
  const gender = req.query.gender || 'any'; // male|female|any
  const origin = req.query.origin || 'any'; // nigerian|western|any

  const maleNigerian   = ['Chukwuemeka','Oluwaseun','Adebayo','Babatunde','Emeka','Ifeanyi','Tunde','Seun','Kola','Segun','Nnamdi','Obinna','Chisom','Eze','Amara','Chidi','Uche','Kunle','Femi','Wale'];
  const femaleNigerian = ['Chiamaka','Adaeze','Funmilayo','Blessing','Grace','Faith','Chidinma','Nneka','Adaora','Yetunde','Folake','Amaka','Ifeoma','Ngozi','Sola','Toyin','Bukola','Ronke','Abimbola','Aisha'];
  const maleWestern    = ['James','William','Oliver','Noah','Liam','Ethan','Lucas','Mason','Logan','Elijah','Henry','Jack','Michael','Daniel','Sebastian','Alexander','Matthew','Benjamin','Samuel','David'];
  const femaleWestern  = ['Emma','Olivia','Ava','Isabella','Sophia','Mia','Charlotte','Amelia','Harper','Evelyn','Emily','Abigail','Ella','Sofia','Madison','Scarlett','Victoria','Aria','Grace','Chloe'];
  const lastNigerian   = ['Okonkwo','Adeyemi','Nwosu','Babangida','Okafor','Ibrahim','Abdullahi','Nwachukwu','Oduya','Adebisi','Eze','Obi','Adesanya','Musa','Bello','Umeh','Chukwu','Okonjo','Akinwale','Osagie'];
  const lastWestern    = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Anderson','Taylor','Thomas','Jackson','White','Harris','Martin','Thompson','Robinson','Clark','Lewis'];

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  const names = Array.from({ length: count }, () => {
    const isMale = gender === 'male' ? true : gender === 'female' ? false : Math.random() > 0.5;
    const isNig  = origin === 'nigerian' ? true : origin === 'western' ? false : Math.random() > 0.5;
    const first  = pick(isNig ? (isMale ? maleNigerian : femaleNigerian) : (isMale ? maleWestern : femaleWestern));
    const last   = pick(isNig ? lastNigerian : lastWestern);
    return { first, last, full: `${first} ${last}`, gender: isMale ? 'male' : 'female', origin: isNig ? 'nigerian' : 'western' };
  });

  res.json({ success: true, data: { names, count } });
});

// ─── Random Address ───────────────────────────────────────────────────────────
router.get('/address', (req, res) => {
  const count   = Math.min(Math.max(parseInt(req.query.count) || 1, 1), 10);
  const country = req.query.country || 'nigeria';

  const ng = {
    streets: ['Broad Street','Victoria Island','Adeola Odeku','Allen Avenue','Opebi Road','Awolowo Road','Bode Thomas','Toyin Street','Ikeja GRA','Lekki Phase 1','Agege Motor Road','Funsho Williams','Eric Moore','Burma Road','Ikorodu Road'],
    cities:  ['Lagos','Abuja','Kano','Ibadan','Port Harcourt','Benin City','Enugu','Kaduna','Owerri','Calabar','Jos','Maiduguri','Sokoto','Abeokuta','Uyo'],
    states:  ['Lagos State','Abuja FCT','Kano State','Oyo State','Rivers State','Edo State','Enugu State','Kaduna State','Imo State','Cross River State'],
  };
  const us = {
    streets: ['Main Street','Oak Avenue','Elm Street','Maple Drive','Cedar Lane','Pine Street','Washington Blvd','Park Avenue','Lake Shore Drive','Sunset Blvd'],
    cities:  ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','Austin'],
    states:  ['New York','California','Texas','Florida','Illinois','Pennsylvania','Ohio','Georgia','Michigan','Arizona'],
  };

  const pool = country.toLowerCase().includes('us') || country.toLowerCase().includes('america') ? us : ng;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  const addresses = Array.from({ length: count }, () => {
    const num = Math.floor(Math.random() * 200) + 1;
    return {
      street:  `${num} ${pick(pool.streets)}`,
      city:    pick(pool.cities),
      state:   pick(pool.states),
      country: country.toLowerCase().includes('us') ? 'United States' : 'Nigeria',
      zip:     country.toLowerCase().includes('us') ? String(10000 + Math.floor(Math.random()*90000)) : String(100000 + Math.floor(Math.random()*900000)),
    };
  });

  res.json({ success: true, data: { addresses, count } });
});

// ─── OTP Generator ────────────────────────────────────────────────────────────
router.get('/otp', (req, res) => {
  const length = Math.min(Math.max(parseInt(req.query.length) || 6, 4), 10);
  const type   = req.query.type || 'numeric'; // numeric | alphanumeric
  let charset  = '0123456789';
  if (type === 'alphanumeric') charset = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes  = crypto.randomBytes(length);
  const otp    = Array.from({ length }, (_, i) => charset[bytes[i] % charset.length]).join('');
  const expires_in_seconds = 300; // 5 min suggestion
  res.json({ success: true, data: { otp, length, type, expires_in_seconds } });
});

// ─── Token Generator ──────────────────────────────────────────────────────────
router.get('/token', (req, res) => {
  const length = Math.min(Math.max(parseInt(req.query.length) || 32, 8), 128);
  const type   = req.query.type || 'hex'; // hex | base64 | alphanumeric
  let token;
  if (type === 'base64') token = crypto.randomBytes(Math.ceil(length * 0.75)).toString('base64').slice(0, length);
  else if (type === 'alphanumeric') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = crypto.randomBytes(length);
    token = Array.from({ length }, (_, i) => chars[bytes[i] % chars.length]).join('');
  } else {
    token = crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }
  res.json({ success: true, data: { token, length: token.length, type } });
});

// ─── Colour Palette Generator ─────────────────────────────────────────────────
router.get('/palette', (req, res) => {
  const count  = Math.min(Math.max(parseInt(req.query.count) || 5, 2), 10);
  const scheme = req.query.scheme || 'random'; // random | monochrome | complementary

  function hslToHex(h,s,l) {
    s/=100; l/=100;
    const a=s*Math.min(l,1-l);
    const f=n=>{const k=(n+h/30)%12;const color=l-a*Math.max(Math.min(k-3,9-k,1),-1);return Math.round(255*color).toString(16).padStart(2,'0');};
    return '#'+f(0)+f(8)+f(4);
  }

  let colors;
  if (scheme === 'monochrome') {
    const h = Math.floor(Math.random()*360);
    const s = 60 + Math.floor(Math.random()*30);
    colors = Array.from({length:count},(_,i) => { const l = 20 + (i*(60/(count-1))); return { hex: hslToHex(h,s,l), hsl:`hsl(${h},${s}%,${Math.round(l)}%)` }; });
  } else if (scheme === 'complementary') {
    const h = Math.floor(Math.random()*360);
    const comp = (h+180)%360;
    colors = Array.from({length:count},(_,i) => { const base=i%2===0?h:comp; const l=30+Math.floor(Math.random()*40); const s=50+Math.floor(Math.random()*40); return { hex:hslToHex(base,s,l), hsl:`hsl(${base},${s}%,${l}%)` }; });
  } else {
    colors = Array.from({length:count},()=>{ const h=Math.floor(Math.random()*360),s=50+Math.floor(Math.random()*50),l=30+Math.floor(Math.random()*40); return { hex:hslToHex(h,s,l), hsl:`hsl(${h},${s}%,${l}%)` }; });
  }
  res.json({ success: true, data: { colors, count, scheme } });
});

// ─── Mock User Profile ────────────────────────────────────────────────────────
router.get('/user', (req, res) => {
  const count = Math.min(Math.max(parseInt(req.query.count) || 1, 1), 10);

  const firstM = ['James','Emeka','Noah','Tunde','Lucas','Chidi','David','Oluwaseun','Liam','Ifeanyi'];
  const firstF = ['Amara','Emma','Chiamaka','Olivia','Grace','Adaeze','Ava','Ngozi','Blessing','Charlotte'];
  const lasts  = ['Smith','Okonkwo','Johnson','Adeyemi','Williams','Nwosu','Brown','Ibrahim','Davis','Eze'];
  const domains= ['gmail.com','yahoo.com','outlook.com','hotmail.com','proton.me'];
  const jobs   = ['Software Engineer','Product Manager','Data Analyst','UX Designer','DevOps Engineer','Backend Developer','Fullstack Developer','Business Analyst','QA Engineer','System Admin'];
  const pick   = arr => arr[Math.floor(Math.random()*arr.length)];

  const users = Array.from({length:count}, () => {
    const isMale = Math.random()>0.5;
    const first  = pick(isMale?firstM:firstF);
    const last   = pick(lasts);
    const year   = 1980+Math.floor(Math.random()*30);
    const mon    = String(1+Math.floor(Math.random()*12)).padStart(2,'0');
    const day    = String(1+Math.floor(Math.random()*28)).padStart(2,'0');
    return {
      id:         uuidv4(),
      name:       `${first} ${last}`,
      gender:     isMale?'male':'female',
      email:      `${first.toLowerCase()}.${last.toLowerCase()}${Math.floor(Math.random()*99)+1}@${pick(domains)}`,
      username:   `${first.toLowerCase()}${Math.floor(Math.random()*999)+1}`,
      dob:        `${year}-${mon}-${day}`,
      phone:      `+234${Math.floor(7000000000+Math.random()*2999999999)}`,
      job:        pick(jobs),
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${first}+${last}`,
    };
  });

  res.json({ success: true, data: { users, count } });
});

// ─── Initials Avatar (SVG) ────────────────────────────────────────────────────
// GET /api/v1/generate/avatar?name=John+Doe&size=80&bg=7c3aed
router.get('/avatar', (req, res) => {
  const { name = 'Viper API', size = '80', bg = '7c3aed', color = 'ffffff', rounded = 'true', bold = 'true' } = req.query;
  const sz  = Math.min(Math.max(parseInt(size) || 80, 20), 400);
  const r   = rounded !== 'false' ? sz / 2 : 8;
  const fw  = bold !== 'false' ? 'bold' : 'normal';
  const fs  = Math.round(sz * 0.38);
  const parts    = String(name).trim().split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2 ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase() : String(name).slice(0,2).toUpperCase();
  const safeBg    = bg.replace(/[^0-9a-fA-F]/g,'').slice(0,6) || '7c3aed';
  const safeColor = color.replace(/[^0-9a-fA-F]/g,'').slice(0,6) || 'ffffff';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}"><rect width="${sz}" height="${sz}" rx="${r}" ry="${r}" fill="#${safeBg}"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="${fs}" font-weight="${fw}" fill="#${safeColor}">${initials}</text></svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

// ─── Invoice PDF Generator ────────────────────────────────────────────────────
// POST /api/v1/generate/invoice
// npm install pdfkit
router.post('/invoice', async (req, res) => {
  let PDFDocument;
  try { PDFDocument = require('pdfkit'); }
  catch { return res.status(503).json({ success: false, error: 'pdfkit not installed. Run: npm install pdfkit' }); }

  const { invoice_number = 'INV-001', date = new Date().toISOString().slice(0,10), due_date, from = {}, to = {}, items = [], currency = 'USD', notes, tax_percent = 0 } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, error: 'items array is required and must not be empty' });

  try {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));

    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
      const W = doc.page.width;

      // Header
      doc.rect(0, 0, W, 90).fill('#7c3aed');
      doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text('INVOICE', 50, 28);
      doc.fontSize(10).font('Helvetica').fillColor('rgba(255,255,255,0.75)').text(`#${invoice_number}`, 50, 58);
      doc.fillColor('#ffffff').fontSize(10).text(`Date: ${date}`, W-180, 35).text(due_date ? `Due: ${due_date}` : '', W-180, 52);

      // From / To
      let y = 115;
      doc.fillColor('#7c3aed').fontSize(9).font('Helvetica-Bold').text('FROM', 50, y).text('TO', W/2, y);
      y += 14;
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold');
      doc.text(from.name || 'Your Company', 50, y, { width: W/2-60 });
      doc.text(to.name   || 'Client Name',  W/2, y, { width: W/2-50 });
      y += 14;
      doc.fontSize(9).font('Helvetica').fillColor('#64748b');
      if (from.email)   { doc.text(from.email,   50,   y); }
      if (from.address) { doc.text(from.address, 50,   y+13); }
      if (to.email)     { doc.text(to.email,     W/2,  y); }
      if (to.address)   { doc.text(to.address,   W/2,  y+13); }

      y = 230;
      // Table header
      doc.rect(50, y, W-100, 24).fill('#f1f5f9');
      const cols = [50, 280, 370, 460];
      doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
      doc.text('DESCRIPTION', cols[0]+5, y+7).text('QTY', cols[1], y+7).text('UNIT PRICE', cols[2], y+7).text('TOTAL', cols[3], y+7);
      y += 24;

      // Rows
      let subtotal = 0;
      items.forEach((item, i) => {
        if (y > doc.page.height - 120) { doc.addPage(); y = 50; }
        const qty = parseFloat(item.qty)||1, price = parseFloat(item.price)||0, total = qty*price;
        subtotal += total;
        if (i%2===1) doc.rect(50, y, W-100, 22).fill('#f8fafc');
        doc.fillColor('#0f172a').fontSize(9).font('Helvetica');
        doc.text(item.description||'-', cols[0]+5, y+6, { width:225 });
        doc.text(String(qty),            cols[1], y+6);
        doc.text(`${currency} ${price.toFixed(2)}`, cols[2], y+6);
        doc.text(`${currency} ${total.toFixed(2)}`, cols[3], y+6);
        y += 22;
      });

      // Totals
      y += 12;
      const taxAmt = subtotal * (parseFloat(tax_percent)/100);
      const grand  = subtotal + taxAmt;
      const drawT  = (label, amount, bold=false) => {
        doc.fillColor(bold?'#7c3aed':'#64748b').fontSize(bold?11:9).font(bold?'Helvetica-Bold':'Helvetica');
        doc.text(label, W-220, y).text(`${currency} ${amount.toFixed(2)}`, cols[3], y);
        y += bold ? 18 : 14;
      };
      doc.moveTo(50,y).lineTo(W-50,y).strokeColor('#e2e8f0').lineWidth(1).stroke(); y+=10;
      drawT('Subtotal', subtotal);
      if (tax_percent > 0) drawT(`Tax (${tax_percent}%)`, taxAmt);
      doc.moveTo(W-220,y).lineTo(W-50,y).strokeColor('#7c3aed').lineWidth(1.5).stroke(); y+=8;
      drawT('TOTAL DUE', grand, true);

      if (notes) {
        y += 20;
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Bold').text('NOTES', 50, y); y+=13;
        doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(notes, 50, y, { width: W-100 });
      }

      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
         .text('Generated by Viper API', 50, doc.page.height-40, { align:'center', width:W-100 });
      doc.end();
    });

    const buf = Buffer.concat(chunks);
    res.json({ success: true, pdf_base64: buf.toString('base64'), size_bytes: buf.length, invoice_number });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Invoice generation failed: ' + e.message });
  }
});

module.exports = router;
