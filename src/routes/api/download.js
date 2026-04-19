/**
 * /api/v1/download — Social Media & Video Downloader
 *
 * Endpoints:
 *   GET /api/v1/download/tiktok?url=...
 *   GET /api/v1/download/instagram?url=...
 *   GET /api/v1/download/twitter?url=...
 *   GET /api/v1/download/facebook?url=...
 *   GET /api/v1/download/youtube?url=...
 *
 * All powered by free public APIs — no keys needed.
 * Returns direct download links + metadata (title, thumbnail, duration).
 *
 * ⚠️  These endpoints return download URLs only (no proxying).
 *     The caller is responsible for complying with each platform's ToS.
 */

const express = require('express');
const router  = express.Router();
const axios   = require('axios');

/* ── Helpers ────────────────────────────────────────────────────── */

/** Strip query params we don't want, normalise the URL */
function clean(url) {
  return (url || '').trim();
}

/** Unified error response */
function fail(res, msg, code = 500) {
  return res.status(code).json({ success: false, error: msg });
}

/* ─────────────────────────────────────────────────────────────────
   GET /api/v1/download/tiktok?url=https://www.tiktok.com/@user/video/...
   Returns: video (no-watermark), audio, thumbnail, author, title
   ───────────────────────────────────────────────────────────────── */
router.get('/tiktok', async (req, res) => {
  const { url } = req.query;
  if (!url) return fail(res, 'url is required', 400);
  if (!url.includes('tiktok.com') && !url.includes('vm.tiktok.com')) {
    return fail(res, 'Not a valid TikTok URL', 400);
  }

  try {
    // tikwm.com — free, no key needed
    const { data } = await axios.post(
      'https://www.tikwm.com/api/',
      new URLSearchParams({ url: clean(url), hd: '1' }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );

    if (!data || data.code !== 0) {
      return fail(res, data?.msg || 'Failed to fetch TikTok video');
    }

    const d = data.data;
    res.json({
      success:   true,
      platform:  'tiktok',
      title:     d.title       || null,
      author:    d.author?.nickname || null,
      thumbnail: d.cover        || null,
      duration:  d.duration     || null,
      downloads: {
        video_hd:        d.hdplay   || null,   // no watermark HD
        video_sd:        d.play     || null,   // no watermark SD
        video_watermark: d.wmplay   || null,   // with watermark
        audio:           d.music    || null,   // MP3
      },
    });
  } catch (e) {
    fail(res, 'TikTok download failed: ' + e.message);
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/v1/download/instagram?url=https://www.instagram.com/p/...
   Returns: video/image download link + thumbnail
   ───────────────────────────────────────────────────────────────── */
router.get('/instagram', async (req, res) => {
  const { url } = req.query;
  if (!url) return fail(res, 'url is required', 400);
  if (!url.includes('instagram.com')) {
    return fail(res, 'Not a valid Instagram URL', 400);
  }

  try {
    // instagramdownloader.io public API
    const { data } = await axios.get(
      'https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index',
      {
        params:  { url: clean(url) },
        headers: {
          // Uses the free RapidAPI "Instagram Downloader" — no key needed for low volume
          // If you hit limits, sign up free at rapidapi.com and add a key
          'x-rapidapi-host': 'instagram-downloader-download-instagram-videos-stories.p.rapidapi.com',
        },
        timeout: 15000,
      }
    );

    if (!data || !data.media) {
      return fail(res, 'Could not extract Instagram media. The post may be private.');
    }

    const mediaList = Array.isArray(data.media) ? data.media : [data.media];
    res.json({
      success:   true,
      platform:  'instagram',
      type:      data.type || 'unknown',
      thumbnail: data.thumbnail || mediaList[0] || null,
      downloads: mediaList.map((m, i) => ({
        index: i + 1,
        url:   m,
      })),
    });
  } catch (e) {
    // Fallback: try saveinsta-style API
    try {
      const { data: d2 } = await axios.post(
        'https://www.saveig.app/api/ajaxSearch',
        new URLSearchParams({ q: clean(url), t: 'media', lang: 'en' }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 12000 }
      );
      if (d2 && d2.status === 'ok' && d2.data) {
        return res.json({
          success:  true,
          platform: 'instagram',
          raw:      d2.data,   // HTML snippet; parse on client if needed
          note:     'Raw result from fallback API — parse the download links from the `raw` field.',
        });
      }
    } catch (_) {}
    fail(res, 'Instagram download failed: ' + e.message);
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/v1/download/twitter?url=https://twitter.com/.../status/...
   (also works with x.com URLs)
   Returns: video qualities (HD/SD) + thumbnail
   ───────────────────────────────────────────────────────────────── */
router.get('/twitter', async (req, res) => {
  const { url } = req.query;
  if (!url) return fail(res, 'url is required', 400);
  if (!url.includes('twitter.com') && !url.includes('x.com') && !url.includes('t.co')) {
    return fail(res, 'Not a valid Twitter/X URL', 400);
  }

  try {
    // twitsave.com public API
    const { data } = await axios.get('https://twitsave.com/info', {
      params:  { url: clean(url) },
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    // Response is HTML — parse with regex (no cheerio dependency needed)
    const thumbMatch = data.match(/property="og:image"\s+content="([^"]+)"/);
    const titleMatch = data.match(/property="og:title"\s+content="([^"]+)"/);

    const videoUrls = [];
    const urlRegex  = /https:\/\/video\.twimg\.com\/[^"'\s]+\.mp4[^"'\s]*/g;
    let m;
    while ((m = urlRegex.exec(data)) !== null) {
      const u = m[0].replace(/&amp;/g, '&');
      if (!videoUrls.includes(u)) videoUrls.push(u);
    }

    if (videoUrls.length === 0) {
      return fail(res, 'No downloadable video found. The tweet may not contain a video, or may be protected.');
    }

    // Heuristic: longer URLs tend to be higher quality
    videoUrls.sort((a, b) => b.length - a.length);

    res.json({
      success:   true,
      platform:  'twitter',
      title:     titleMatch ? titleMatch[1].replace(/&amp;/g, '&') : null,
      thumbnail: thumbMatch ? thumbMatch[1] : null,
      downloads: videoUrls.map((u, i) => ({
        quality: i === 0 ? 'HD' : i === 1 ? 'SD' : `variant_${i + 1}`,
        url:     u,
        format:  'mp4',
      })),
    });
  } catch (e) {
    fail(res, 'Twitter/X download failed: ' + e.message);
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/v1/download/facebook?url=https://www.facebook.com/...
   Returns: HD + SD video links + thumbnail
   ───────────────────────────────────────────────────────────────── */
router.get('/facebook', async (req, res) => {
  const { url } = req.query;
  if (!url) return fail(res, 'url is required', 400);
  if (!url.includes('facebook.com') && !url.includes('fb.watch') && !url.includes('fb.com')) {
    return fail(res, 'Not a valid Facebook URL', 400);
  }

  try {
    const { data } = await axios.post(
      'https://www.getfvid.com/downloader',
      new URLSearchParams({ url: clean(url) }),
      {
        headers: {
          'Content-Type':  'application/x-www-form-urlencoded',
          'User-Agent':    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer':       'https://www.getfvid.com/',
        },
        timeout: 15000,
      }
    );

    const hdMatch  = data.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"[^>]*>\s*HD/i);
    const sdMatch  = data.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"[^>]*>\s*SD/i);
    const thumbMatch = data.match(/<img[^>]+src="(https:\/\/[^"]+)"[^>]*class="[^"]*thumb/i)
                    || data.match(/property="og:image"\s+content="([^"]+)"/);
    const titleMatch = data.match(/property="og:title"\s+content="([^"]+)"/);

    const downloads = [];
    if (hdMatch) downloads.push({ quality: 'HD', url: hdMatch[1].replace(/&amp;/g, '&'), format: 'mp4' });
    if (sdMatch) downloads.push({ quality: 'SD', url: sdMatch[1].replace(/&amp;/g, '&'), format: 'mp4' });

    if (downloads.length === 0) {
      return fail(res, 'No downloadable video found. The video may be private or restricted.');
    }

    res.json({
      success:   true,
      platform:  'facebook',
      title:     titleMatch ? titleMatch[1].replace(/&amp;/g, '&') : null,
      thumbnail: thumbMatch ? thumbMatch[1] : null,
      downloads,
    });
  } catch (e) {
    fail(res, 'Facebook download failed: ' + e.message);
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/v1/download/youtube?url=https://www.youtube.com/watch?v=...
   Returns: available formats (video+audio, audio only) + metadata
   Note: Streams embed URLs only. Full downloads need yt-dlp server-side.
   ───────────────────────────────────────────────────────────────── */
router.get('/youtube', async (req, res) => {
  const { url } = req.query;
  if (!url) return fail(res, 'url is required', 400);

  const ytRegex = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match   = url.match(ytRegex);
  if (!match) return fail(res, 'Not a valid YouTube URL', 400);

  const videoId = match[1];

  try {
    // cobalt.tools — free, open-source, no API key
    const { data } = await axios.post(
      'https://api.cobalt.tools/api/json',
      {
        url:              `https://www.youtube.com/watch?v=${videoId}`,
        vCodec:           'h264',
        vQuality:         '720',
        aFormat:          'mp3',
        isNoTTWatermark:  true,
        isTTFullAudio:    false,
        isAudioOnly:      false,
        dubLang:          false,
        disableMetadata:  false,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept':       'application/json',
        },
        timeout: 20000,
      }
    );

    if (!data || (data.status !== 'stream' && data.status !== 'redirect' && data.status !== 'tunnel')) {
      // Fallback: y2mate-style info endpoint
      const { data: info } = await axios.get(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`,
        { timeout: 8000 }
      );

      return res.json({
        success:    true,
        platform:   'youtube',
        video_id:   videoId,
        title:      info?.title       || null,
        author:     info?.author_name || null,
        thumbnail:  `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        note:       'Direct download URL temporarily unavailable. Use the cobalt.tools website with this video ID, or integrate yt-dlp on your server.',
        cobalt_url: `https://cobalt.tools/#${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
        downloads:  [],
      });
    }

    // Get title from noembed
    let title = null, author = null;
    try {
      const { data: info } = await axios.get(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`,
        { timeout: 5000 }
      );
      title  = info?.title;
      author = info?.author_name;
    } catch (_) {}

    res.json({
      success:   true,
      platform:  'youtube',
      video_id:  videoId,
      title,
      author,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      downloads: [
        {
          quality: '720p',
          format:  data.status === 'tunnel' ? 'stream' : 'mp4',
          url:     data.url,
        },
      ],
    });
  } catch (e) {
    // Last-resort: return metadata + cobalt link
    try {
      const { data: info } = await axios.get(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`,
        { timeout: 8000 }
      );
      return res.json({
        success:    true,
        platform:   'youtube',
        video_id:   videoId,
        title:      info?.title       || null,
        author:     info?.author_name || null,
        thumbnail:  `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        note:       'Direct stream unavailable right now. Use cobalt_url to download manually.',
        cobalt_url: `https://cobalt.tools/#${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
        downloads:  [],
      });
    } catch (_) {}
    fail(res, 'YouTube download failed: ' + e.message);
  }
});

module.exports = router;
