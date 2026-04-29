const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());

const METABASE_URL = process.env.METABASE_URL;
const METABASE_API_KEY = process.env.METABASE_API_KEY;

async function getCardDbId(cardId) {
  const response = await fetch(`${METABASE_URL}/api/card/${cardId}`, {
    headers: { 'X-API-KEY': METABASE_API_KEY }
  });
  const card = await response.json();
  return card.database_id;
}

async function querySQL(dbId, sql) {
  const response = await fetch(`${METABASE_URL}/api/dataset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': METABASE_API_KEY
    },
    body: JSON.stringify({
      database: dbId,
      type: 'native',
      native: { query: sql },
      parameters: []
    })
  });
  const data = await response.json();
  return data.data ? data.data.rows : [];
}

async function queryAllPages(cardId, sqlFn) {
  const dbId = await getCardDbId(cardId);
  const periods = [
    ['2025-01-01', '2025-12-31'],
    ['2026-01-01', '2026-06-30'],
  ];
  let allRows = [];
  let cols = null;

  for (const [from, to] of periods) {
    const sql = sqlFn(from, to);
    const response = await fetch(`${METABASE_URL}/api/dataset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': METABASE_API_KEY
      },
      body: JSON.stringify({
        database: dbId,
        type: 'native',
        native: { query: sql },
        parameters: []
      })
    });
    const data = await response.json();
    if (data.data) {
      if (!cols) cols = data.data.cols;
      allRows = allRows.concat(data.data.rows);
    }
  }
  return { data: { cols, rows: allRows } };
}

const sqlCommandes = (from, to) => `
SELECT
  o.id AS "ID",
  o.created_at AS "Created At",
  o.total_amount_incl_tax AS "Prix",
  org.legal_name AS "Distri"
FROM "order" o
JOIN organization org ON org.id = o.organization_id
WHERE o.status = 'confirmed'
  AND o.created_at >= '${from}'
  AND o.created_at < '${to}'
ORDER BY o.created_at ASC
`;

const sqlTickets = (from, to) => `
SELECT
  o.created_at AS "Created At",
  org.legal_name AS "Distri",
  oi.amount_incl_tax AS "Prix",
  ct.name AS "Catalogue",
  p.code AS "Produit"
FROM order_item_ticket oit
JOIN order_item oi ON oi.id = oit.order_item_id
JOIN "order" o ON o.id = oi.order_id
JOIN organization org ON org.id = o.organization_id
JOIN product p ON p.id = oi.product_id
JOIN product_base pb ON pb.id = p.base_id
JOIN catalog c ON c.id = pb.catalog_id
JOIN catalog_translation ct ON ct.catalog_id = c.id AND ct.language = 'fr'
WHERE o.status = 'confirmed'
  AND o.created_at >= '${from}'
  AND o.created_at < '${to}'
ORDER BY o.created_at ASC
`;

app.get('/commandes', async (req, res) => {
  try {
    const data = await queryAllPages(199, sqlCommandes);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/tickets', async (req, res) => {
  try {
    const data = await queryAllPages(200, sqlTickets);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
