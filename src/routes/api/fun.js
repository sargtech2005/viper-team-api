const express = require('express');
const router  = express.Router();
const axios   = require('axios');

// ─── Joke ─────────────────────────────────────────────────────────────────────
router.get('/joke', async (req, res) => {
  const category = req.query.category || 'Any';
  const allowed  = ['Any','Programming','Misc','Pun','Spooky','Christmas'];
  const cat      = allowed.includes(category) ? category : 'Any';
  try {
    const { data } = await axios.get(
      `https://v2.jokeapi.dev/joke/${cat}?blacklistFlags=nsfw,racist,sexist,explicit&type=twopart`,
      { timeout: 6000 }
    );
    if (data.error) throw new Error(data.message);
    res.json({
      success: true,
      data: { category: data.category, setup: data.setup, delivery: data.delivery, id: data.id },
    });
  } catch {
    // Built-in fallback jokes
    const jokes = [
      { category:'Programming', setup:'Why do programmers prefer dark mode?', delivery:'Because light attracts bugs.' },
      { category:'Programming', setup:'Why did the developer go broke?', delivery:'Because he used up all his cache.' },
      { category:'Misc', setup:'What do you call a fish without eyes?', delivery:'A fsh.' },
      { category:'Pun', setup:'I told my wife she was drawing her eyebrows too high.', delivery:'She looked surprised.' },
    ];
    const j = jokes[Math.floor(Math.random() * jokes.length)];
    res.json({ success: true, data: j });
  }
});

// ─── Quote — zenquotes.io (quotable.io is dead) ────────────────────────────
router.get('/quote', async (req, res) => {
  try {
    const { data } = await axios.get('https://zenquotes.io/api/random', { timeout: 6000 });
    const q = Array.isArray(data) ? data[0] : data;
    res.json({
      success: true,
      data: { quote: q.q, author: q.a },
    });
  } catch {
    // Built-in fallback quotes
    const quotes = [
      { quote: 'The best way to predict the future is to invent it.', author: 'Alan Kay' },
      { quote: 'Code is like humor. When you have to explain it, it is bad.', author: 'Cory House' },
      { quote: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
      { quote: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', author: 'Martin Fowler' },
      { quote: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' },
      { quote: 'It works on my machine.', author: 'Every Developer' },
    ];
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    res.json({ success: true, data: q });
  }
});

// ─── Fact ─────────────────────────────────────────────────────────────────────
router.get('/fact', async (req, res) => {
  try {
    const { data } = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en', { timeout: 6000 });
    res.json({ success: true, data: { fact: data.text, source: data.source_url } });
  } catch {
    const facts = [
      'A group of flamingos is called a flamboyance.',
      'Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that was still good.',
      'Bananas are technically berries, but strawberries are not.',
      'Octopuses have three hearts, two branchial and one systemic.',
      'The shortest war in recorded history lasted between 38 and 45 minutes.',
      'A day on Venus is longer than a year on Venus.',
    ];
    res.json({ success: true, data: { fact: facts[Math.floor(Math.random() * facts.length)] } });
  }
});

module.exports = router;
