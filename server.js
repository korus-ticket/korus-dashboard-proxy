const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());

const METABASE_URL = process.env.METABASE_URL;
const METABASE_API_KEY = process.env.METABASE_API_KEY;

async function queryCard(cardId) {
  const response = await fetch(`${METABASE_URL}/api/card/${cardId}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': METABASE_API_KEY
    },
    body: JSON.stringify({
      parameters: [],
      ignore_cache: false,
      collection_preview: false,
      middleware: { disable_max_results: true }
    })
  });
  return response.json();
}

app.get('/commandes', async (req, res) => {
  try {
    const data = await queryCard(199);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/tickets', async (req, res) => {
  try {
    const data = await queryCard(200);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
