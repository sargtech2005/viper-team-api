/**
 * /api/v1/weather — Live Weather Data
 * Endpoints: /current  /forecast
 *
 * Powered by OpenWeatherMap (free tier: 1,000 calls/day)
 * Sign up at: https://openweathermap.org/api
 * Add to .env: OPENWEATHER_API_KEY=your_key_here
 *
 * No extra npm install needed — uses existing axios.
 */

const express = require('express');
const router  = express.Router();
const axios   = require('axios');

const BASE = 'https://api.openweathermap.org/data/2.5';
const getKey = () => process.env.OPENWEATHER_API_KEY;

function buildParams(query) {
  const key = getKey();
  if (!key) throw new Error('OPENWEATHER_API_KEY not set in .env');
  const p = { appid: key, units: query.units || 'metric' };
  if (query.city)      p.q   = query.city;
  else if (query.lat)  { p.lat = query.lat; p.lon = query.lon; }
  return p;
}

/* ──────────────────────────────────────────────────────────────────
   GET /api/v1/weather/current
   ?city=Lagos&units=metric
   OR ?lat=6.5244&lon=3.3792&units=metric
   units: metric (°C) | imperial (°F) | standard (K)
   ────────────────────────────────────────────────────────────────── */
router.get('/current', async (req, res) => {
  const { city, lat, lon } = req.query;
  if (!city && (!lat || !lon)) {
    return res.status(400).json({ success: false, error: 'Provide city OR lat+lon' });
  }

  try {
    const params     = buildParams(req.query);
    const { data }   = await axios.get(`${BASE}/weather`, { params, timeout: 10000 });
    const unitLabel  = req.query.units === 'imperial' ? '°F' : req.query.units === 'standard' ? 'K' : '°C';
    const sunrise    = new Date(data.sys.sunrise * 1000).toISOString();
    const sunset     = new Date(data.sys.sunset  * 1000).toISOString();

    res.json({
      success:     true,
      city:        data.name,
      country:     data.sys.country,
      coordinates: data.coord,
      weather: {
        condition:   data.weather[0].main,
        description: data.weather[0].description,
        icon:        `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
      },
      temperature: {
        current:    `${data.main.temp} ${unitLabel}`,
        feels_like: `${data.main.feels_like} ${unitLabel}`,
        min:        `${data.main.temp_min} ${unitLabel}`,
        max:        `${data.main.temp_max} ${unitLabel}`,
      },
      humidity:    `${data.main.humidity}%`,
      pressure:    `${data.main.pressure} hPa`,
      visibility:  data.visibility ? `${data.visibility / 1000} km` : null,
      wind: {
        speed:     `${data.wind.speed} ${req.query.units === 'imperial' ? 'mph' : 'm/s'}`,
        direction: `${data.wind.deg}°`,
      },
      clouds:      `${data.clouds.all}%`,
      sunrise,
      sunset,
      timezone:    `UTC${data.timezone >= 0 ? '+' : ''}${data.timezone / 3600}`,
      observed_at: new Date(data.dt * 1000).toISOString(),
    });
  } catch (e) {
    const msg = e.response?.data?.message || e.message;
    res.status(e.response?.status || 500).json({ success: false, error: msg });
  }
});

/* ──────────────────────────────────────────────────────────────────
   GET /api/v1/weather/forecast
   ?city=Lagos&units=metric&days=5
   Returns up to 5-day hourly forecast, grouped by date.
   ────────────────────────────────────────────────────────────────── */
router.get('/forecast', async (req, res) => {
  const { city, lat, lon, days = 5 } = req.query;
  if (!city && (!lat || !lon)) {
    return res.status(400).json({ success: false, error: 'Provide city OR lat+lon' });
  }

  try {
    const params     = buildParams(req.query);
    params.cnt       = Math.min(parseInt(days) * 8, 40); // 8 slots per day (3hr intervals)

    const { data }   = await axios.get(`${BASE}/forecast`, { params, timeout: 10000 });
    const unitLabel  = req.query.units === 'imperial' ? '°F' : req.query.units === 'standard' ? 'K' : '°C';

    // Group slots by date
    const grouped = {};
    for (const item of data.list) {
      const [date, time] = item.dt_txt.split(' ');
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push({
        time,
        temp:        `${item.main.temp} ${unitLabel}`,
        feels_like:  `${item.main.feels_like} ${unitLabel}`,
        condition:   item.weather[0].main,
        description: item.weather[0].description,
        icon:        `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`,
        humidity:    `${item.main.humidity}%`,
        wind_speed:  `${item.wind.speed} m/s`,
        clouds:      `${item.clouds.all}%`,
        rain_mm:     item.rain?.['3h'] || 0,
      });
    }

    res.json({
      success:  true,
      city:     data.city.name,
      country:  data.city.country,
      days:     Object.keys(grouped).length,
      units:    req.query.units || 'metric',
      forecast: grouped,
    });
  } catch (e) {
    const msg = e.response?.data?.message || e.message;
    res.status(e.response?.status || 500).json({ success: false, error: msg });
  }
});

module.exports = router;
