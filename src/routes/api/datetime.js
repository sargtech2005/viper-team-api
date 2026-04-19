const express = require('express');
const router  = express.Router();

// ─── Current Time ─────────────────────────────────────────────────────────────
router.get('/now', (req, res) => {
  const tz  = req.query.timezone || 'UTC';
  let date;
  try {
    date = new Date();
    const opts = { timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false };
    const local = new Intl.DateTimeFormat('en-CA', opts).format(date);
    res.json({ success: true, data: {
      utc:        date.toISOString(),
      unix:       Math.floor(date.getTime()/1000),
      timezone:   tz,
      local:      local,
      day_of_week:new Intl.DateTimeFormat('en', {weekday:'long',timeZone:tz}).format(date),
      day_of_year:Math.ceil((date - new Date(date.getFullYear(),0,1))/86400000)+1,
    }});
  } catch {
    res.status(400).json({ success: false, error: `Invalid timezone "${tz}". Use IANA timezone e.g. Africa/Lagos, America/New_York` });
  }
});

// ─── Unix Timestamp Convert ───────────────────────────────────────────────────
router.get('/timestamp', (req, res) => {
  const ts = req.query.ts;
  if (!ts) {
    // Return current timestamp
    const now = Date.now();
    return res.json({ success: true, data: { unix_ms: now, unix_s: Math.floor(now/1000), iso: new Date(now).toISOString() } });
  }
  const n = parseInt(ts);
  if (isNaN(n)) return res.status(400).json({ success: false, error: '`ts` must be a number.' });
  const ms = n > 1e10 ? n : n * 1000; // auto-detect ms vs s
  const d  = new Date(ms);
  if (isNaN(d.getTime())) return res.status(400).json({ success: false, error: 'Invalid timestamp.' });
  res.json({ success: true, data: { unix_s: Math.floor(ms/1000), unix_ms: ms, iso: d.toISOString(), utc: d.toUTCString(), year:d.getUTCFullYear(), month:d.getUTCMonth()+1, day:d.getUTCDate(), hour:d.getUTCHours(), minute:d.getUTCMinutes(), second:d.getUTCSeconds() } });
});

// ─── Date Difference ──────────────────────────────────────────────────────────
router.get('/diff', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ success: false, error: '`from` and `to` date params required (YYYY-MM-DD or ISO).' });
  const a = new Date(from), b = new Date(to);
  if (isNaN(a) || isNaN(b)) return res.status(400).json({ success: false, error: 'Invalid date. Use YYYY-MM-DD or ISO 8601 format.' });
  const ms = Math.abs(b - a);
  const s  = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60), d = Math.floor(h/24), wk = Math.floor(d/7);
  const months = Math.abs((b.getFullYear()-a.getFullYear())*12 + (b.getMonth()-a.getMonth()));
  const years  = Math.floor(months/12);
  res.json({ success: true, data: { from: a.toISOString(), to: b.toISOString(), milliseconds:ms, seconds:s, minutes:m, hours:h, days:d, weeks:wk, months, years, is_future: b > a } });
});

// ─── Add / Subtract Days ──────────────────────────────────────────────────────
router.get('/add', (req, res) => {
  const { date, days, months, years, hours } = req.query;
  const d = date ? new Date(date) : new Date();
  if (isNaN(d)) return res.status(400).json({ success: false, error: 'Invalid `date`. Use YYYY-MM-DD.' });
  const result = new Date(d);
  if (days)   result.setDate(result.getDate() + parseInt(days));
  if (months) result.setMonth(result.getMonth() + parseInt(months));
  if (years)  result.setFullYear(result.getFullYear() + parseInt(years));
  if (hours)  result.setHours(result.getHours() + parseInt(hours));
  res.json({ success: true, data: { original: d.toISOString(), result: result.toISOString(), result_date: result.toISOString().slice(0,10) } });
});

// ─── Format Date ──────────────────────────────────────────────────────────────
router.get('/format', (req, res) => {
  const { date, format = 'human', timezone = 'UTC' } = req.query;
  const d = date ? new Date(date) : new Date();
  if (isNaN(d)) return res.status(400).json({ success: false, error: 'Invalid `date`.' });

  const pad = n => String(n).padStart(2,'0');
  const months   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthsAb = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days     = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  // Get values in requested timezone
  const opts = { timeZone: timezone };
  const parts = new Intl.DateTimeFormat('en-US', { ...opts, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false }).formatToParts(d);
  const p = {};
  parts.forEach(({type,value}) => p[type]=value);

  const yr = p.year, mo = parseInt(p.month)-1, dy = parseInt(p.day), hr = p.hour==='24'?'00':p.hour, mi = p.minute, se = p.second;
  const dayName = days[new Date(`${yr}-${p.month}-${p.day}`).getDay()];

  const formats = {
    iso:     `${yr}-${p.month}-${p.day}T${hr}:${mi}:${se}Z`,
    human:   `${dayName}, ${months[mo]} ${parseInt(dy)}, ${yr}`,
    short:   `${p.month}/${p.day}/${yr}`,
    long:    `${dayName}, ${parseInt(dy)} ${months[mo]} ${yr} ${hr}:${mi}:${se}`,
    time:    `${hr}:${mi}:${se}`,
    time12:  `${((parseInt(hr)%12)||12)}:${mi}:${se} ${parseInt(hr)<12?'AM':'PM'}`,
    date:    `${yr}-${p.month}-${p.day}`,
    relative: (() => {
      const diff = (Date.now() - d.getTime()) / 1000;
      if (Math.abs(diff) < 60)  return 'just now';
      if (Math.abs(diff) < 3600) return `${Math.floor(Math.abs(diff)/60)} minutes ${diff>0?'ago':'from now'}`;
      if (Math.abs(diff) < 86400) return `${Math.floor(Math.abs(diff)/3600)} hours ${diff>0?'ago':'from now'}`;
      return `${Math.floor(Math.abs(diff)/86400)} days ${diff>0?'ago':'from now'}`;
    })(),
  };

  const result = formats[format];
  if (!result) return res.status(400).json({ success: false, error: `Format must be: ${Object.keys(formats).join(', ')}` });
  res.json({ success: true, data: { result, format, timezone, all: formats } });
});

// ─── Is Business Day ──────────────────────────────────────────────────────────
router.get('/businessday', (req, res) => {
  const { date } = req.query;
  const d = date ? new Date(date) : new Date();
  if (isNaN(d)) return res.status(400).json({ success: false, error: 'Invalid `date`. Use YYYY-MM-DD.' });
  const day = d.getUTCDay();
  const is_business_day = day >= 1 && day <= 5;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  res.json({ success: true, data: { date: d.toISOString().slice(0,10), day_of_week: days[day], is_business_day, is_weekend: !is_business_day } });
});

// ─── Timezone Lookup ──────────────────────────────────────────────────────────
// GET /api/v1/datetime/timezone?tz=Africa/Lagos  or  ?city=Lagos
router.get('/timezone', async (req, res) => {
  const axios = require('axios');
  const { tz, city } = req.query;
  if (!tz && !city) return res.status(400).json({ success: false, error: 'tz (e.g. Africa/Lagos) or city (e.g. Lagos) is required' });

  const CITY_MAP = {
    lagos:'Africa/Lagos', abuja:'Africa/Lagos', london:'Europe/London', newyork:'America/New_York',
    'new york':'America/New_York', losangeles:'America/Los_Angeles', paris:'Europe/Paris',
    berlin:'Europe/Berlin', dubai:'Asia/Dubai', tokyo:'Asia/Tokyo', beijing:'Asia/Shanghai',
    shanghai:'Asia/Shanghai', sydney:'Australia/Sydney', toronto:'America/Toronto',
    chicago:'America/Chicago', accra:'Africa/Accra', nairobi:'Africa/Nairobi', cairo:'Africa/Cairo',
    johannesburg:'Africa/Johannesburg', istanbul:'Europe/Istanbul', mumbai:'Asia/Kolkata',
    delhi:'Asia/Kolkata', singapore:'Asia/Singapore', moscow:'Europe/Moscow',
    amsterdam:'Europe/Amsterdam', madrid:'Europe/Madrid', rome:'Europe/Rome',
    seoul:'Asia/Seoul', bangkok:'Asia/Bangkok', jakarta:'Asia/Jakarta', karachi:'Asia/Karachi',
  };

  const timezone = tz || CITY_MAP[String(city).toLowerCase().trim()] || String(city);

  try {
    const { data } = await axios.get(`https://worldtimeapi.org/api/timezone/${encodeURIComponent(timezone)}`, { timeout: 8000 });
    const date = new Date(data.datetime);
    res.json({
      success: true, timezone: data.timezone, datetime: data.datetime,
      date: date.toISOString().slice(0,10), time: date.toTimeString().slice(0,8),
      utc_offset: data.utc_offset, utc_datetime: data.utc_datetime,
      dst: data.dst, dst_offset: data.dst_offset, abbreviation: data.abbreviation,
      unix: data.unixtime, week_number: data.week_number,
      day_of_week: data.day_of_week, day_of_year: data.day_of_year,
    });
  } catch (e) {
    if (e.response?.status === 404) return res.status(404).json({ success: false, error: `Unknown timezone: "${timezone}". Use IANA format e.g. Africa/Lagos` });
    res.status(500).json({ success: false, error: 'Timezone service error: ' + e.message });
  }
});

module.exports = router;
