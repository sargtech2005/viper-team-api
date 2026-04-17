const ApiKey = require('../models/ApiKey');

const MAX_KEYS = 5;

exports.list = async (req, res) => {
  try {
    const keys = await ApiKey.listByUser(req.user.id);
    res.render('dashboard/api-keys', {
      title: 'API Keys — Viper-Team API',
      keys,
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
};

exports.generate = async (req, res) => {
  try {
    const count = await ApiKey.countByUser(req.user.id);
    if (count >= MAX_KEYS) {
      return res.status(400).json({ success: false, error: `Maximum ${MAX_KEYS} active API keys allowed.` });
    }
    const label = (req.body.label || 'My API Key').slice(0, 80);
    const key   = await ApiKey.generate(req.user.id, label);
    res.json({ success: true, key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to generate key.' });
  }
};

exports.deleteKey = async (req, res) => {
  try {
    await ApiKey.delete(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete key.' });
  }
};
