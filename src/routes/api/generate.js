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

module.exports = router;
