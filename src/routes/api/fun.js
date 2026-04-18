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

// ─── Trivia ───────────────────────────────────────────────────────────────────
router.get('/trivia', async (req, res) => {
  const category = req.query.category || '9'; // 9=general
  try {
    const { data } = await axios.get(`https://opentdb.com/api.php?amount=1&type=multiple&category=${category}`, { timeout: 6000 });
    if (!data.results?.length) throw new Error('No results');
    const q = data.results[0];
    const answers = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random()-0.5);
    res.json({ success: true, data: { question: q.question.replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&amp;/g,'&'), correct: q.correct_answer, options: answers, category: q.category, difficulty: q.difficulty } });
  } catch {
    const fallback = [
      { question:'What is the capital of Nigeria?', correct:'Abuja', options:['Lagos','Abuja','Kano','Ibadan'], category:'Geography', difficulty:'easy' },
      { question:'Who wrote the novel "Things Fall Apart"?', correct:'Chinua Achebe', options:['Wole Soyinka','Chinua Achebe','Ben Okri','Chimamanda Adichie'], category:'Literature', difficulty:'easy' },
      { question:'What does CPU stand for?', correct:'Central Processing Unit', options:['Central Processing Unit','Computer Power Unit','Core Processing Utility','Central Program Unit'], category:'Technology', difficulty:'easy' },
      { question:'Which planet is known as the Red Planet?', correct:'Mars', options:['Venus','Jupiter','Mars','Saturn'], category:'Science', difficulty:'easy' },
    ];
    res.json({ success: true, data: fallback[Math.floor(Math.random()*fallback.length)] });
  }
});

// ─── Would You Rather ─────────────────────────────────────────────────────────
router.get('/wouldyourather', (req, res) => {
  const questions = [
    { a:'Always have to speak in rhymes', b:'Always have to sing instead of talk' },
    { a:'Be able to fly but only 1 meter above the ground', b:'Be able to become invisible but only in complete darkness' },
    { a:'Know when you\'re going to die', b:'Know how you\'re going to die' },
    { a:'Have unlimited battery on your phone', b:'Have unlimited data on your phone' },
    { a:'Be able to code 10x faster', b:'Never write bugs again' },
    { a:'Earn ₦1M but work 80 hours/week', b:'Earn ₦500k and work 20 hours/week' },
    { a:'Have access to any book ever written', b:'Have access to any course ever made' },
    { a:'Always be 10 minutes early', b:'Always be exactly on time' },
    { a:'Have a rewind button for your life', b:'Have a pause button for your life' },
    { a:'Know all languages', b:'Be able to play all instruments' },
  ];
  res.json({ success: true, data: questions[Math.floor(Math.random()*questions.length)] });
});

// ─── Riddle ───────────────────────────────────────────────────────────────────
router.get('/riddle', (req, res) => {
  const riddles = [
    { riddle:'I speak without a mouth and hear without ears. I have no body but I come alive with the wind. What am I?', answer:'An echo' },
    { riddle:'The more you take, the more you leave behind. What am I?', answer:'Footsteps' },
    { riddle:'I have cities, but no houses live there. I have mountains, but no trees grow there. I have water, but no fish swim there. What am I?', answer:'A map' },
    { riddle:'What has hands but cannot clap?', answer:'A clock' },
    { riddle:'What can you catch but not throw?', answer:'A cold' },
    { riddle:'I am not alive, but I grow. I have no lungs, but I need air. I have no mouth, but fire kills me. What am I?', answer:'Fire' },
    { riddle:'What has keys but no locks, space but no room, and you can enter but can\'t go inside?', answer:'A keyboard' },
    { riddle:'What gets wetter the more it dries?', answer:'A towel' },
  ];
  res.json({ success: true, data: riddles[Math.floor(Math.random()*riddles.length)] });
});

// ─── Coin Flip ────────────────────────────────────────────────────────────────
router.get('/coin', (req, res) => {
  const result = Math.random() > 0.5 ? 'heads' : 'tails';
  res.json({ success: true, data: { result, emoji: result==='heads'?'🪙':'🔵' } });
});

// ─── Dice Roll ────────────────────────────────────────────────────────────────
router.get('/dice', (req, res) => {
  const sides = Math.min(Math.max(parseInt(req.query.sides)||6,2),100);
  const count = Math.min(Math.max(parseInt(req.query.count)||1,1),10);
  const rolls = Array.from({length:count},()=>Math.floor(Math.random()*sides)+1);
  res.json({ success: true, data: { rolls, sum: rolls.reduce((a,b)=>a+b,0), count, sides } });
});

// ─── Magic 8 Ball ─────────────────────────────────────────────────────────────
router.get('/8ball', (req, res) => {
  const answers = ['It is certain','It is decidedly so','Without a doubt','Yes definitely','You may rely on it','As I see it yes','Most likely','Outlook good','Yes','Signs point to yes','Reply hazy try again','Ask again later','Better not tell you now','Cannot predict now','Concentrate and ask again','Don\'t count on it','My reply is no','My sources say no','Outlook not so good','Very doubtful'];
  const answer = answers[Math.floor(Math.random()*answers.length)];
  const positive = answers.indexOf(answer) < 10;
  const neutral  = answers.indexOf(answer) >= 10 && answers.indexOf(answer) < 15;
  res.json({ success: true, data: { answer, sentiment: positive?'positive':neutral?'neutral':'negative', question: req.query.q || null } });
});
