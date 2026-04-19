/**
 * /api/v1/spotify — Spotify Music Metadata
 * Endpoints: /search  /track  /artist  /album
 *
 * Uses Spotify Web API (Client Credentials — no user login needed)
 * Sign up at: https://developer.spotify.com/dashboard
 * Add to .env:
 *   SPOTIFY_CLIENT_ID=your_client_id
 *   SPOTIFY_CLIENT_SECRET=your_client_secret
 *
 * ⚠️  IMPORTANT NOTE ON DOWNLOADS:
 *   Full audio download/streaming from Spotify is NOT possible via
 *   any legal API — it violates copyright law & Spotify's ToS.
 *   These endpoints provide metadata + official 30-second MP3 previews
 *   (preview_url) which Spotify legally provides for free.
 *   preview_url fields are direct .mp3 links playable in any <audio> tag.
 *
 * No extra npm install needed — uses existing axios.
 */

const express = require('express');
const router  = express.Router();
const axios   = require('axios');

// ── Token cache (Client Credentials token lasts 3600s) ─────────────
let _token  = null;
let _expiry = 0;

async function getToken() {
  if (_token && Date.now() < _expiry) return _token;

  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) {
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env');
  }

  const creds = Buffer.from(`${id}:${secret}`).toString('base64');
  const { data } = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  _token  = data.access_token;
  _expiry = Date.now() + (data.expires_in - 120) * 1000; // refresh 2 min early
  return _token;
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── Helpers ─────────────────────────────────────────────────────────
function formatDuration(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function trackSummary(t) {
  return {
    id:          t.id,
    name:        t.name,
    artists:     t.artists?.map(a => a.name).join(', '),
    album:       t.album?.name,
    release:     t.album?.release_date,
    duration:    t.duration_ms ? formatDuration(t.duration_ms) : null,
    explicit:    t.explicit,
    popularity:  t.popularity,
    preview_url: t.preview_url || null, // 30-second MP3 — play directly in <audio>
    spotify_url: t.external_urls?.spotify,
    cover:       t.album?.images?.[0]?.url || null,
  };
}

/* ──────────────────────────────────────────────────────────────────
   GET /api/v1/spotify/search
   ?q=Burna+Boy&type=track&limit=10
   type: track | artist | album | playlist
   ────────────────────────────────────────────────────────────────── */
router.get('/search', async (req, res) => {
  const { q, type = 'track', limit = 10 } = req.query;
  if (!q) return res.status(400).json({ success: false, error: 'q (search query) is required' });

  const validTypes = ['track', 'artist', 'album', 'playlist'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ success: false, error: `type must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const token    = await getToken();
    const { data } = await axios.get('https://api.spotify.com/v1/search', {
      headers: authHeader(token),
      params:  { q, type, limit: Math.min(parseInt(limit) || 10, 50), market: 'NG' },
    });

    let results;
    if (type === 'track') {
      results = (data.tracks?.items || []).map(trackSummary);
    } else if (type === 'artist') {
      results = (data.artists?.items || []).map(a => ({
        id:          a.id,
        name:        a.name,
        genres:      a.genres,
        followers:   a.followers?.total,
        popularity:  a.popularity,
        image:       a.images?.[0]?.url || null,
        spotify_url: a.external_urls?.spotify,
      }));
    } else if (type === 'album') {
      results = (data.albums?.items || []).map(a => ({
        id:           a.id,
        name:         a.name,
        artists:      a.artists?.map(x => x.name).join(', '),
        release:      a.release_date,
        total_tracks: a.total_tracks,
        cover:        a.images?.[0]?.url || null,
        spotify_url:  a.external_urls?.spotify,
      }));
    } else {
      results = (data.playlists?.items || []).map(p => ({
        id:          p.id,
        name:        p.name,
        owner:       p.owner?.display_name,
        tracks:      p.tracks?.total,
        cover:       p.images?.[0]?.url || null,
        spotify_url: p.external_urls?.spotify,
      }));
    }

    res.json({ success: true, query: q, type, count: results.length, results });
  } catch (e) {
    res.status(e.response?.status || 500).json({
      success: false,
      error:   e.response?.data?.error?.message || e.message,
    });
  }
});

/* ──────────────────────────────────────────────────────────────────
   GET /api/v1/spotify/track
   ?id=4uLU6hMCjMI75M1A2tKUQC
   Returns full track info including 30-second preview MP3.
   ────────────────────────────────────────────────────────────────── */
router.get('/track', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id (Spotify track ID) is required' });

  try {
    const token    = await getToken();
    const { data } = await axios.get(`https://api.spotify.com/v1/tracks/${id}`, {
      headers: authHeader(token),
    });

    res.json({
      success: true,
      id:          data.id,
      name:        data.name,
      artists:     data.artists.map(a => ({ id: a.id, name: a.name, url: a.external_urls?.spotify })),
      album: {
        id:       data.album.id,
        name:     data.album.name,
        type:     data.album.album_type,
        release:  data.album.release_date,
        tracks:   data.album.total_tracks,
        cover:    data.album.images?.[0]?.url || null,
        url:      data.album.external_urls?.spotify,
      },
      duration:    formatDuration(data.duration_ms),
      duration_ms: data.duration_ms,
      explicit:    data.explicit,
      popularity:  data.popularity,
      track_number: data.track_number,
      disc_number: data.disc_number,
      isrc:        data.external_ids?.isrc || null,
      // ✅ Official 30-second preview (legal, from Spotify)
      preview_url: data.preview_url || null,
      preview_note: data.preview_url
        ? 'Direct MP3 — play with <audio src="..."> or any audio player'
        : 'No preview available for this track',
      spotify_url: data.external_urls?.spotify,
    });
  } catch (e) {
    res.status(e.response?.status || 500).json({
      success: false,
      error:   e.response?.data?.error?.message || e.message,
    });
  }
});

/* ──────────────────────────────────────────────────────────────────
   GET /api/v1/spotify/artist
   ?id=3TVXtAsR1Inumwj472S9r4
   Returns artist info + top 5 tracks in Nigeria market.
   ────────────────────────────────────────────────────────────────── */
router.get('/artist', async (req, res) => {
  const { id, market = 'NG' } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id (Spotify artist ID) is required' });

  try {
    const token = await getToken();
    const headers = authHeader(token);

    const [artistRes, topTracksRes, albumsRes] = await Promise.all([
      axios.get(`https://api.spotify.com/v1/artists/${id}`,             { headers }),
      axios.get(`https://api.spotify.com/v1/artists/${id}/top-tracks`,  { headers, params: { market } }),
      axios.get(`https://api.spotify.com/v1/artists/${id}/albums`,      { headers, params: { limit: 5, include_groups: 'album,single' } }),
    ]);

    const a = artistRes.data;
    res.json({
      success:     true,
      id:          a.id,
      name:        a.name,
      genres:      a.genres,
      followers:   a.followers.total,
      popularity:  a.popularity,
      image:       a.images?.[0]?.url || null,
      spotify_url: a.external_urls?.spotify,
      top_tracks:  topTracksRes.data.tracks.slice(0, 5).map(trackSummary),
      latest_releases: albumsRes.data.items.map(alb => ({
        id:       alb.id,
        name:     alb.name,
        type:     alb.album_type,
        release:  alb.release_date,
        tracks:   alb.total_tracks,
        cover:    alb.images?.[0]?.url || null,
        url:      alb.external_urls?.spotify,
      })),
    });
  } catch (e) {
    res.status(e.response?.status || 500).json({
      success: false,
      error:   e.response?.data?.error?.message || e.message,
    });
  }
});

/* ──────────────────────────────────────────────────────────────────
   GET /api/v1/spotify/album
   ?id=2noRn2Aes5aoNVsU6iWThc
   Returns album info + all tracks with preview URLs.
   ────────────────────────────────────────────────────────────────── */
router.get('/album', async (req, res) => {
  const { id, market = 'NG' } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id (Spotify album ID) is required' });

  try {
    const token    = await getToken();
    const { data } = await axios.get(`https://api.spotify.com/v1/albums/${id}`, {
      headers: authHeader(token),
      params:  { market },
    });

    res.json({
      success:      true,
      id:           data.id,
      name:         data.name,
      type:         data.album_type,
      artists:      data.artists.map(a => ({ id: a.id, name: a.name })),
      release:      data.release_date,
      total_tracks: data.total_tracks,
      genres:       data.genres,
      label:        data.label,
      popularity:   data.popularity,
      cover:        data.images?.[0]?.url || null,
      spotify_url:  data.external_urls?.spotify,
      tracks:       data.tracks.items.map(t => ({
        id:           t.id,
        number:       t.track_number,
        name:         t.name,
        artists:      t.artists.map(a => a.name).join(', '),
        duration:     formatDuration(t.duration_ms),
        explicit:     t.explicit,
        preview_url:  t.preview_url || null, // 30-second MP3
        spotify_url:  t.external_urls?.spotify,
      })),
    });
  } catch (e) {
    res.status(e.response?.status || 500).json({
      success: false,
      error:   e.response?.data?.error?.message || e.message,
    });
  }
});

module.exports = router;
