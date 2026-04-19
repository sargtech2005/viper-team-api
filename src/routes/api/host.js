/**
 * /api/v1/host — Host & IP Intelligence
 *
 * Endpoints:
 *   GET /api/v1/host/ip?ip=8.8.8.8               — IP geo + ASN + org info
 *   GET /api/v1/host/myip                          — caller's own IP info
 *   GET /api/v1/host/lookup?domain=google.com      — full domain intelligence
 *   GET /api/v1/host/reverse?ip=8.8.8.8            — reverse DNS
 *   GET /api/v1/host/ports?host=google.com         — common port scan (TCP connect)
 *   GET /api/v1/host/tech?url=https://example.com  — detect tech stack
 *
 * All free — no API keys required.
 */

const express = require('express');
const router  = express.Router();
const dns     = require('dns').promises;
const net     = require('net');
const axios   = require('axios');

/* ── Helpers ────────────────────────────────────────────────────── */

function cleanHost(h) {
  return (h || '').trim().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
}

function fail(res, msg, code = 500) {
  return res.status(code).json({ success: false, error: msg });
}

/* ─────────────────────────────────────────────────────────────────
   GET /api/v1/host/ip?ip=8.8.8.8
   Full geo + ASN + ISP info for any IPv4 / IPv6 address.
   Uses ip-api.com (free, 1000 req/min, no key needed)
   ───────────────────────────────────────────────────────────────── */
router.get('/ip', async (req, res) => {
  const { ip } = req.query;
  if (!ip) return fail(res, 'ip is required', 400);

  try {
    const { data } = await axios.get(
      `http://ip-api.com/json/${encodeURIComponent(ip.trim())}`,
      {
        params:  { fields: 'status,message,continent,country,countryCode,region,regionName,city,zip,lat,lon,timezone,offset,isp,org,as,asname,reverse,mobile,proxy,hosting,query' },
        timeout: 8000,
      }
    );

    if (data.status === 'fail') {
      return fail(res, data.message || 'Invalid IP address');
    }

    res.json({
      success: true,
      ip:      data.query,
      geo: {
        continent:    data.continent,
        country:      data.country,
        country_code: data.countryCode,
        region:       data.regionName,
        region_code:  data.region,
        city:         data.city,
        zip:          data.zip,
        latitude:     data.lat,
        longitude:    data.lon,
        timezone:     data.timezone,
        utc_offset:   data.offset,
      },
      network: {
        isp:          data.isp,
        org:          data.org,
        asn:          data.as,
        asn_name:     data.asname,
        reverse_dns:  data.reverse || null,
      },
      flags: {
        is_mobile:  data.mobile,
        is_proxy:   data.proxy,
        is_hosting: data.hosting,
      },
    });
  } catch (e) {
    fail(res, 'IP lookup failed: ' + e.message);
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/v1/host/myip
   Returns the caller's own IP address + geo info
   ───────────────────────────────────────────────────────────────── */
router.get('/myip', async (req, res) => {
  // Get real IP (behind Fly.io proxy)
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress ||
    '0.0.0.0';

  try {
    const { data } = await axios.get(
      `http://ip-api.com/json/${ip}`,
      {
        params:  { fields: 'status,country,countryCode,regionName,city,isp,org,as,proxy,hosting,query' },
        timeout: 8000,
      }
    );

    res.json({
      success:    true,
      ip,
      country:    data.country      || null,
      city:       data.city         || null,
      region:     data.regionName   || null,
      isp:        data.isp          || null,
      org:        data.org          || null,
      asn:        data.as           || null,
      is_proxy:   data.proxy        || false,
      is_hosting: data.hosting      || false,
    });
  } catch (e) {
    res.json({ success: true, ip, note: 'Geo lookup unavailable' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/v1/host/lookup?domain=google.com
   Full domain intelligence: A/AAAA/MX/NS/TXT records + IP geo
   ───────────────────────────────────────────────────────────────── */
router.get('/lookup', async (req, res) => {
  const { domain } = req.query;
  if (!domain) return fail(res, 'domain is required', 400);

  const host = cleanHost(domain);

  const safeResolve = async (type) => {
    try { return await dns.resolve(host, type); } catch { return []; }
  };

  try {
    const [a, aaaa, mx, ns, txt] = await Promise.all([
      safeResolve('A'),
      safeResolve('AAAA'),
      safeResolve('MX'),
      safeResolve('NS'),
      safeResolve('TXT'),
    ]);

    // Geo lookup for primary A record
    let ipInfo = null;
    if (a.length > 0) {
      try {
        const { data } = await axios.get(
          `http://ip-api.com/json/${a[0]}`,
          { params: { fields: 'country,countryCode,city,isp,org,as,hosting,proxy' }, timeout: 6000 }
        );
        ipInfo = {
          ip:         a[0],
          country:    data.country,
          city:       data.city,
          isp:        data.isp,
          org:        data.org,
          asn:        data.as,
          is_hosting: data.hosting,
          is_proxy:   data.proxy,
        };
      } catch (_) {}
    }

    res.json({
      success: true,
      domain:  host,
      dns: {
        a:    a,
        aaaa: aaaa,
        mx:   mx.map(r => ({ priority: r.priority, exchange: r.exchange })),
        ns:   ns,
        txt:  txt.map(r => r.join(' ')),
      },
      host_info: ipInfo,
    });
  } catch (e) {
    fail(res, 'Domain lookup failed: ' + e.message);
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/v1/host/reverse?ip=8.8.8.8
   Reverse DNS (PTR) lookup — IP → hostname
   ───────────────────────────────────────────────────────────────── */
router.get('/reverse', async (req, res) => {
  const { ip } = req.query;
  if (!ip) return fail(res, 'ip is required', 400);

  try {
    const hostnames = await dns.reverse(ip.trim());
    res.json({
      success:   true,
      ip,
      hostnames,
      primary:   hostnames[0] || null,
    });
  } catch (e) {
    // NXDOMAIN / ENOTFOUND = no PTR record, not a server error
    if (e.code === 'ENOTFOUND' || e.code === 'ENODATA') {
      return res.json({ success: true, ip, hostnames: [], primary: null, note: 'No PTR record found for this IP.' });
    }
    fail(res, 'Reverse DNS failed: ' + e.message);
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/v1/host/ports?host=google.com&ports=80,443,22,3306
   TCP port scan — checks if common ports are open.
   Default scans: 21,22,23,25,53,80,110,143,443,3306,5432,6379,8080,8443,27017
   ⚠️  Only scans up to 20 ports per request to prevent abuse.
   ───────────────────────────────────────────────────────────────── */
router.get('/ports', async (req, res) => {
  const { host, ports } = req.query;
  if (!host) return fail(res, 'host is required', 400);

  const DEFAULTS = [21, 22, 23, 25, 53, 80, 110, 143, 443, 3306, 5432, 6379, 8080, 8443, 27017];
  const PORT_NAMES = {
    21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
    80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS',
    3306: 'MySQL', 5432: 'PostgreSQL', 6379: 'Redis',
    8080: 'HTTP-Alt', 8443: 'HTTPS-Alt', 27017: 'MongoDB',
  };

  let portList = DEFAULTS;
  if (ports) {
    portList = ports.split(',').map(p => parseInt(p.trim())).filter(p => p > 0 && p <= 65535);
    if (portList.length === 0) return fail(res, 'No valid ports provided', 400);
    if (portList.length > 20) return fail(res, 'Maximum 20 ports per request', 400);
  }

  const h = cleanHost(host);

  // Resolve IP first
  let ip = null;
  try {
    const r = await dns.lookup(h);
    ip = r.address;
  } catch {
    return fail(res, `Could not resolve hostname: ${h}`);
  }

  // TCP connect check for each port (2s timeout each, run in parallel)
  const checkPort = (port) =>
    new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 2000;
      socket.setTimeout(timeout);
      socket
        .on('connect', () => { socket.destroy(); resolve({ port, open: true }); })
        .on('timeout',  () => { socket.destroy(); resolve({ port, open: false }); })
        .on('error',    () => { socket.destroy(); resolve({ port, open: false }); });
      socket.connect(port, ip);
    });

  try {
    const results = await Promise.all(portList.map(checkPort));
    const open    = results.filter(r => r.open).length;

    res.json({
      success:    true,
      host:       h,
      ip,
      ports_scanned: portList.length,
      open_count: open,
      results:    results.map(r => ({
        port:    r.port,
        service: PORT_NAMES[r.port] || null,
        open:    r.open,
        state:   r.open ? 'open' : 'closed',
      })),
    });
  } catch (e) {
    fail(res, 'Port scan failed: ' + e.message);
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/v1/host/tech?url=https://example.com
   Detect web technology stack via response headers + HTML analysis
   (Server, X-Powered-By, meta generators, framework signatures, etc.)
   No external API — pure header/HTML analysis.
   ───────────────────────────────────────────────────────────────── */
router.get('/tech', async (req, res) => {
  const { url } = req.query;
  if (!url) return fail(res, 'url is required', 400);

  const target = url.startsWith('http') ? url : `https://${url}`;

  try {
    const resp = await axios.get(target, {
      timeout:    12000,
      maxRedirects: 5,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ViperBot/1.0)' },
      // Get HTML for meta analysis too
      responseType: 'text',
    });

    const headers = resp.headers;
    const html    = resp.data || '';
    const tech    = [];

    /* ── Server / Backend ── */
    const server = headers['server'] || '';
    if (/nginx/i.test(server))   tech.push({ name: 'Nginx',   category: 'Web Server' });
    if (/apache/i.test(server))  tech.push({ name: 'Apache',  category: 'Web Server' });
    if (/cloudflare/i.test(server)) tech.push({ name: 'Cloudflare', category: 'CDN / Proxy' });
    if (/iis/i.test(server))     tech.push({ name: 'IIS',     category: 'Web Server' });
    if (/litespeed/i.test(server)) tech.push({ name: 'LiteSpeed', category: 'Web Server' });
    if (/openresty/i.test(server)) tech.push({ name: 'OpenResty', category: 'Web Server' });
    if (/fly\.io/i.test(server) || headers['fly-request-id']) {
      tech.push({ name: 'Fly.io', category: 'Hosting' });
    }
    if (/vercel/i.test(server) || headers['x-vercel-id']) {
      tech.push({ name: 'Vercel', category: 'Hosting' });
    }
    if (headers['x-served-by']?.includes('netlify') || headers['x-nf-request-id']) {
      tech.push({ name: 'Netlify', category: 'Hosting' });
    }
    if (headers['x-amz-request-id'] || headers['x-amz-id-2']) {
      tech.push({ name: 'AWS (S3/CloudFront)', category: 'Hosting / CDN' });
    }

    /* ── Language / Framework (X-Powered-By) ── */
    const powered = headers['x-powered-by'] || '';
    if (/php/i.test(powered))    tech.push({ name: 'PHP',        category: 'Language' });
    if (/express/i.test(powered)) tech.push({ name: 'Express.js', category: 'Framework' });
    if (/next\.?js/i.test(powered)) tech.push({ name: 'Next.js',  category: 'Framework' });
    if (/asp\.net/i.test(powered))  tech.push({ name: 'ASP.NET',  category: 'Framework' });

    /* ── Cookies → framework hints ── */
    const setCookie = headers['set-cookie']?.join(' ') || '';
    if (/laravel_session/i.test(setCookie)) tech.push({ name: 'Laravel', category: 'Framework' });
    if (/csrftoken/i.test(setCookie))       tech.push({ name: 'Django',  category: 'Framework' });
    if (/phpsessid/i.test(setCookie) && !tech.find(t => t.name === 'PHP')) {
      tech.push({ name: 'PHP', category: 'Language' });
    }
    if (/express:sess/i.test(setCookie) && !tech.find(t => t.name === 'Express.js')) {
      tech.push({ name: 'Express.js', category: 'Framework' });
    }
    if (/wordpress_logged_in|wp-settings/i.test(setCookie)) {
      tech.push({ name: 'WordPress', category: 'CMS' });
    }

    /* ── HTML analysis ── */
    if (/<meta[^>]+generator[^>]+"WordPress/i.test(html))  tech.push({ name: 'WordPress', category: 'CMS' });
    if (/<meta[^>]+generator[^>]+"Joomla/i.test(html))     tech.push({ name: 'Joomla',    category: 'CMS' });
    if (/<meta[^>]+generator[^>]+"Drupal/i.test(html))     tech.push({ name: 'Drupal',    category: 'CMS' });
    if (/shopify/i.test(html) && /cdn\.shopify\.com/i.test(html)) {
      tech.push({ name: 'Shopify', category: 'E-commerce' });
    }
    if (/__next/i.test(html) || /_next\/static/i.test(html)) {
      if (!tech.find(t => t.name === 'Next.js')) tech.push({ name: 'Next.js', category: 'Framework' });
    }
    if (/react/i.test(html) && /data-reactroot|__REACT/i.test(html)) {
      tech.push({ name: 'React', category: 'Frontend Framework' });
    }
    if (/vue\.js|__vue__/i.test(html)) {
      tech.push({ name: 'Vue.js', category: 'Frontend Framework' });
    }
    if (/angular/i.test(html) && /ng-version/i.test(html)) {
      tech.push({ name: 'Angular', category: 'Frontend Framework' });
    }
    if (/tailwindcss|tailwind\.css/i.test(html)) {
      tech.push({ name: 'Tailwind CSS', category: 'CSS Framework' });
    }
    if (/bootstrap\.css|bootstrap\.min\.js/i.test(html)) {
      tech.push({ name: 'Bootstrap', category: 'CSS Framework' });
    }
    if (/gtag\(|google-analytics\.com|googletagmanager/i.test(html)) {
      tech.push({ name: 'Google Analytics / GTM', category: 'Analytics' });
    }
    if (/cloudflareinsights|cf-beacon/i.test(html)) {
      if (!tech.find(t => t.name === 'Cloudflare')) tech.push({ name: 'Cloudflare', category: 'CDN / Proxy' });
    }

    // Deduplicate
    const seen   = new Set();
    const unique = tech.filter(t => {
      const k = t.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    res.json({
      success:     true,
      url:         target,
      final_url:   resp.request?.res?.responseUrl || target,
      http_status: resp.status,
      server:      server || null,
      powered_by:  powered || null,
      technologies: unique,
      tech_count:  unique.length,
      headers_sample: {
        server:            headers['server']           || null,
        'x-powered-by':    headers['x-powered-by']    || null,
        'content-type':    headers['content-type']    || null,
        'cache-control':   headers['cache-control']   || null,
        'x-frame-options': headers['x-frame-options'] || null,
        'strict-transport-security': headers['strict-transport-security'] || null,
        'cf-ray':          headers['cf-ray']          || null,
      },
    });
  } catch (e) {
    if (e.code === 'ECONNREFUSED') return fail(res, 'Connection refused — site may be down');
    if (e.code === 'ENOTFOUND')    return fail(res, 'Domain not found');
    fail(res, 'Tech detection failed: ' + e.message);
  }
});

module.exports = router;
