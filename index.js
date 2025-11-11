const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const questions = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/questions.json')));

// In-memory sessions
const sessions = {};

function frameHtml(title, bodyHtml, choices = [], uid = null) {
  if (!uid) uid = uuidv4();

  const postUrl = `${BASE_URL}/answer`;

  const buttonsMeta = choices
    .map(
      (label, i) => `
        <meta name="fc:frame:button:${i + 1}" content="${label}" />
        <meta name="fc:frame:post_url:${i + 1}" content="${postUrl}" />
        <meta name="fc:frame:post_body:${i + 1}" content="uid=${uid}&choice=${i}" />
      `
    )
    .join("");

  return `
  <!doctype html>
  <html>
    <head>
      <meta name="fc:frame" content="vNext" />
      ${buttonsMeta}
      <meta property="og:title" content="${title}" />
      <meta property="og:image" content="https://i.imgur.com/8Km9tLL.png" />
    </head>
    <body>
      <div style="text-align:center; font-size:20px; font-weight:600;">
        ${bodyHtml}
      </div>
    </body>
  </html>
  `;
}

app.get("/", (req, res) => {
  const uid = uuidv4();
  sessions[uid] = { idx: 0, score: 0 };

  const q = questions[0];
  res.send(frameHtml(q.q, "📌 Pilih jawaban di tombol bawah 👇", q.choices, uid));
});

app.post("/answer", (req, res) => {
  const { uid, choice } = req.body;

  if (!uid || choice === undefined) return res.send("Invalid session");

  const session = sessions[uid];
  const q = questions[session.idx];

  if (parseInt(choice) === q.answer) session.score++;

  session.idx++;

  if (session.idx >= questions.length) {
    const score = session.score;
    delete sessions[uid];
    return res.send(frameHtml(
      `Quiz selesai! Skor kamu: ${score}/${questions.length}`,
      "🔥 Terima kasih sudah bermain!",
      ["Main lagi"]
    ));
  }

  const nextQ = questions[session.idx];
  res.send(frameHtml(nextQ.q, `Skor sementara: ${session.score}`, nextQ.choices, uid));
});

app.listen(PORT, () => console.log(`✅ Server running at ${BASE_URL}`));
