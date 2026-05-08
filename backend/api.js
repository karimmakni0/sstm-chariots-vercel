// backend/api.js  –  Express API for SSTM chariot app
// Run: node api.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost').split(',');
app.use(cors({ origin: (origin, cb) => cb(null, true) })); // allow all on LAN
app.use(express.json({ limit: '25mb' }));

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'sstm_chariot_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '00256'
});

async function ensureLavageTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lavages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

ensureLavageTable().catch(e => console.error('Unable to initialize lavages table:', e.message));

const mapLavage = lavage => ({
  id: String(lavage.id),
  name: lavage.name,
  createdAt: lavage.created_at,
  updatedAt: lavage.updated_at,
  isDeleted: lavage.is_deleted,
  deletedAt: lavage.deleted_at
});

const uploadDir = path.join(__dirname, 'uploads', 'factures');
fs.mkdirSync(uploadDir, { recursive: true });

async function ensureInvoiceFilesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoice_files (
      id SERIAL PRIMARY KEY,
      file_name VARCHAR(255) NOT NULL,
      file_type VARCHAR(20) NOT NULL,
      mime_type VARCHAR(120) NOT NULL,
      file_path TEXT NOT NULL,
      company_id INT REFERENCES companies(id) ON DELETE SET NULL,
      invoice_number VARCHAR(50),
      uploaded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

ensureInvoiceFilesTable().catch(e => console.error('Unable to initialize invoice_files table:', e.message));

function cleanFileName(name) {
  return path.basename(name || '').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function extensionOf(name) {
  return path.extname(name || '').toLowerCase();
}

function validateImport(type, fileName, mimeType) {
  const ext = extensionOf(fileName);
  if (type === 'pdf') {
    return mimeType === 'application/pdf' && ext === '.pdf';
  }
  return ['.xls', '.xlsx'].includes(ext) && [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream'
  ].includes(mimeType);
}

async function importFactureFile(req, res, type) {
  const { fileName, mimeType, content, companyId = null, invoiceNumber = null } = req.body;
  if (!fileName || !mimeType || !content) {
    return res.status(400).json({ success: false, message: 'Fichier invalide', data: null });
  }
  if (!validateImport(type, fileName, mimeType)) {
    return res.status(400).json({ success: false, message: 'Type de fichier non autorisé', data: null });
  }

  try {
    const safeName = `${Date.now()}-${cleanFileName(fileName)}`;
    const filePath = path.join(uploadDir, safeName);
    await fs.promises.writeFile(filePath, Buffer.from(content, 'base64'));
    const { rows: [row] } = await pool.query(
      `INSERT INTO invoice_files (file_name,file_type,mime_type,file_path,company_id,invoice_number)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,file_name,file_type,mime_type,company_id,invoice_number,uploaded_at`,
      [fileName, type, mimeType, filePath, companyId || null, invoiceNumber || null]
    );
    res.status(201).json({
      success: true,
      message: 'Fichier importé avec succès',
      data: {
        id: String(row.id),
        fileName: row.file_name,
        fileType: row.file_type,
        mimeType: row.mime_type,
        companyId: row.company_id ? String(row.company_id) : null,
        invoiceNumber: row.invoice_number,
        uploadedAt: row.uploaded_at
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message, data: null });
  }
}

// ── Companies ────────────────────────────────────────────────────────────────
app.get('/api/companies', async (req, res) => {
  try {
    const { rows: companies } = await pool.query(
      'SELECT * FROM companies WHERE is_deleted = FALSE ORDER BY id'
    );
    const { rows: usages } = await pool.query(
      'SELECT * FROM chariot_usages ORDER BY id'
    );
    const result = companies.map(c => ({
      id:            String(c.id),
      name:          c.name,
      paymentStatus: c.payment_status,
      usages: usages
        .filter(u => u.company_id === c.id)
        .map(u => ({
          id:            String(u.id),
          chariotType:   u.chariot_type,
          hoursWorked:   parseFloat(u.hours_worked),
          pricePerHour:  parseFloat(u.price_per_hour),
          totalPrice:    parseFloat(u.total_price),
          paymentStatus: u.payment_status
        }))
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/companies/:id', async (req, res) => {
  try {
    const { rows: [c] } = await pool.query('SELECT * FROM companies WHERE id=$1 AND is_deleted = FALSE', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'Not found' });
    const { rows: usages } = await pool.query('SELECT * FROM chariot_usages WHERE company_id=$1', [c.id]);
    res.json({
      id: String(c.id), name: c.name, paymentStatus: c.payment_status,
      usages: usages.map(u => ({
        id: String(u.id), chariotType: u.chariot_type,
        hoursWorked: parseFloat(u.hours_worked), pricePerHour: parseFloat(u.price_per_hour),
        totalPrice: parseFloat(u.total_price), paymentStatus: u.payment_status
      }))
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/companies', async (req, res) => {
  const { name, paymentStatus = 'UNPAID', usages = [] } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [c] } = await client.query(
      'INSERT INTO companies (name, payment_status) VALUES ($1,$2) RETURNING *',
      [name, paymentStatus]
    );
    for (const u of usages) {
      await client.query(
        'INSERT INTO chariot_usages (company_id,chariot_type,hours_worked,price_per_hour,total_price,payment_status) VALUES ($1,$2,$3,$4,$5,$6)',
        [c.id, u.chariotType, u.hoursWorked, u.pricePerHour, u.totalPrice, u.paymentStatus || 'Unpaid']
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ id: String(c.id) });
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

app.put('/api/companies/:id', async (req, res) => {
  const { name, paymentStatus, usages = [] } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE companies SET name=$1, payment_status=$2 WHERE id=$3', [name, paymentStatus, req.params.id]);
    await client.query('DELETE FROM chariot_usages WHERE company_id=$1', [req.params.id]);
    for (const u of usages) {
      await client.query(
        'INSERT INTO chariot_usages (company_id,chariot_type,hours_worked,price_per_hour,total_price,payment_status) VALUES ($1,$2,$3,$4,$5,$6)',
        [req.params.id, u.chariotType, u.hoursWorked, u.pricePerHour, u.totalPrice, u.paymentStatus || 'Unpaid']
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

app.delete('/api/companies/:id', async (req, res) => {
  try {
    await pool.query('UPDATE companies SET is_deleted = TRUE, deleted_at = NOW() WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/companies/:id/restore', async (req, res) => {
  try {
    await pool.query('UPDATE companies SET is_deleted = FALSE, deleted_at = NULL WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/companies/:id/permanent', async (req, res) => {
  try {
    await pool.query('DELETE FROM companies WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Lavage ───────────────────────────────────────────────────────────────────
async function createLavage(req, res) {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Le nom est requis' });

  try {
    const { rows: [lavage] } = await pool.query(
      'INSERT INTO lavages (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(mapLavage(lavage));
  } catch (e) { res.status(500).json({ error: e.message }); }
}

async function getAllLavages(req, res) {
  try {
    const { rows } = await pool.query('SELECT * FROM lavages WHERE is_deleted = FALSE ORDER BY name');
    res.json(rows.map(mapLavage));
  } catch (e) { res.status(500).json({ error: e.message }); }
}

async function getLavageById(req, res) {
  try {
    const { rows: [lavage] } = await pool.query('SELECT * FROM lavages WHERE id=$1 AND is_deleted = FALSE', [req.params.id]);
    if (!lavage) return res.status(404).json({ error: 'Not found' });
    res.json(mapLavage(lavage));
  } catch (e) { res.status(500).json({ error: e.message }); }
}

async function updateLavage(req, res) {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Le nom est requis' });

  try {
    const { rows: [lavage] } = await pool.query(
      'UPDATE lavages SET name=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [name, req.params.id]
    );
    if (!lavage) return res.status(404).json({ error: 'Not found' });
    res.json(mapLavage(lavage));
  } catch (e) { res.status(500).json({ error: e.message }); }
}

async function deleteLavage(req, res) {
  try {
    const { rowCount } = await pool.query('UPDATE lavages SET is_deleted = TRUE, deleted_at = NOW() WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

async function restoreLavage(req, res) {
  try {
    const { rowCount } = await pool.query('UPDATE lavages SET is_deleted = FALSE, deleted_at = NULL WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

async function permanentDeleteLavage(req, res) {
  try {
    const { rowCount } = await pool.query('DELETE FROM lavages WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

app.post('/api/lavages', createLavage);
app.get('/api/lavages', getAllLavages);
app.get('/api/lavages/:id', getLavageById);
app.put('/api/lavages/:id', updateLavage);
app.delete('/api/lavages/:id', deleteLavage);
app.patch('/api/lavages/:id/restore', restoreLavage);
app.delete('/api/lavages/:id/permanent', permanentDeleteLavage);

// ── Invoices ─────────────────────────────────────────────────────────────────
app.post('/api/invoices', async (req, res) => {
  const { companyId, invoiceNumber, invoiceDate, ht, tva, ttc, items = [] } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [inv] } = await client.query(
      'INSERT INTO invoices (company_id,invoice_number,invoice_date,ht,tva,ttc) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [companyId, invoiceNumber, invoiceDate, ht, tva, ttc]
    );
    for (const item of items) {
      await client.query(
        'INSERT INTO invoice_items (invoice_id,designation,hours,price_per_hour,total) VALUES ($1,$2,$3,$4,$5)',
        [inv.id, item.designation, item.hours, item.pricePerHour, item.total]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ id: inv.id });
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

app.get('/api/invoices', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.*, c.name as company_name FROM invoices i
       JOIN companies c ON c.id=i.company_id 
       WHERE i.is_deleted = FALSE 
       ORDER BY i.created_at DESC`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    await pool.query('UPDATE invoices SET is_deleted = TRUE, deleted_at = NOW() WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/invoices/:id/restore', async (req, res) => {
  try {
    await pool.query('UPDATE invoices SET is_deleted = FALSE, deleted_at = NULL WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/invoices/:id/permanent', async (req, res) => {
  try {
    await pool.query('DELETE FROM invoices WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/factures/import/pdf', (req, res) => importFactureFile(req, res, 'pdf'));
app.post('/api/factures/import/excel', (req, res) => importFactureFile(req, res, 'excel'));

app.get('/api/factures/files', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.id,f.file_name,f.file_type,f.mime_type,f.company_id,f.invoice_number,f.uploaded_at,c.name AS company_name
       FROM invoice_files f
       LEFT JOIN companies c ON c.id=f.company_id
       ORDER BY f.uploaded_at DESC`
    );
    res.json({
      success: true,
      message: 'Fichiers factures',
      data: rows.map(row => ({
        id: String(row.id),
        fileName: row.file_name,
        fileType: row.file_type,
        mimeType: row.mime_type,
        companyId: row.company_id ? String(row.company_id) : null,
        companyName: row.company_name,
        invoiceNumber: row.invoice_number,
        uploadedAt: row.uploaded_at
      }))
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message, data: [] });
  }
});

// ── Trash ───────────────────────────────────────────────────────────────────
app.get('/api/trash', async (req, res) => {
  try {
    const { rows: companies } = await pool.query(
      'SELECT id, name, deleted_at FROM companies WHERE is_deleted = TRUE ORDER BY deleted_at DESC'
    );
    const { rows: invoices } = await pool.query(
      'SELECT i.id, i.invoice_number as name, i.deleted_at, c.name as company_name FROM invoices i JOIN companies c ON c.id = i.company_id WHERE i.is_deleted = TRUE ORDER BY i.deleted_at DESC'
    );
    const { rows: lavages } = await pool.query(
      'SELECT id, name, deleted_at FROM lavages WHERE is_deleted = TRUE ORDER BY deleted_at DESC'
    );

    res.json({
      companies: companies.map(c => ({ ...c, type: 'entreprise' })),
      invoices: invoices.map(i => ({ ...i, type: 'facture', name: `${i.name} (${i.company_name})` })),
      lavages: lavages.map(l => ({ ...l, type: 'lavage' }))
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'sstm_chariot_db' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Chatbot ───────────────────────────────────────────────────────────────────
const INTENTS = [
  {
    match: /revenu.*(total|global)|chiffre.*(affaire|total)|total.*(revenu|ca)/i,
    sql: `SELECT ROUND(SUM(total_price)::numeric,3) AS total FROM chariot_usages`,
    fmt: r => `💰 Chiffre d'affaires total : **${r[0].total} DT**`
  },
  {
    match: /impay|non.pay|unpaid/i,
    sql: `SELECT name FROM companies WHERE payment_status='UNPAID' AND is_deleted = FALSE ORDER BY name`,
    fmt: r => r.length
      ? `⚠️ Entreprises impayées (${r.length}) :\n${r.map(x=>`• ${x.name}`).join('\n')}`
      : `✅ Aucune entreprise impayée.`
  },
  {
    match: /pay.*(entreprise|client)|entreprise.*pay[ée]/i,
    sql: `SELECT name FROM companies WHERE payment_status='PAID' AND is_deleted = FALSE ORDER BY name`,
    fmt: r => `✅ Entreprises payées (${r.length}) :\n${r.map(x=>`• ${x.name}`).join('\n')}`
  },
  {
    match: /top.*(entreprise|client|3|cinq|5)|meilleur.*(client|entreprise)/i,
    sql: `SELECT c.name, ROUND(SUM(u.total_price)::numeric,3) AS revenue
          FROM companies c JOIN chariot_usages u ON u.company_id=c.id
          WHERE c.is_deleted = FALSE
          GROUP BY c.name ORDER BY revenue DESC LIMIT 3`,
    fmt: r => `🏆 Top 3 entreprises :\n${r.map((x,i)=>`${i+1}. ${x.name} — ${x.revenue} DT`).join('\n')}`
  },
  {
    match: /chariot.*(type|revenu|génér)|revenu.*chariot|type.*chariot/i,
    sql: `SELECT u.chariot_type, ROUND(SUM(u.total_price)::numeric,3) AS revenue, SUM(u.hours_worked) AS hours
          FROM chariot_usages u
          JOIN companies c ON c.id = u.company_id
          WHERE c.is_deleted = FALSE
          GROUP BY u.chariot_type ORDER BY revenue DESC`,
    fmt: r => `🚜 Revenus par type de chariot :\n${r.map(x=>`• ${x.chariot_type} : ${x.revenue} DT (${x.hours}h)`).join('\n')}`
  },
  {
    match: /heure.*(total|combien)|combien.*heure/i,
    sql: `SELECT ROUND(SUM(u.hours_worked)::numeric,1) AS total_hours FROM chariot_usages u JOIN companies c ON c.id = u.company_id WHERE c.is_deleted = FALSE`,
    fmt: r => `⏱️ Total heures travaillées : **${r[0].total_hours}h**`
  },
  {
    match: /montant.*impay|impay.*montant|total.*impay/i,
    sql: `SELECT ROUND(SUM(u.total_price)::numeric,3) AS total
          FROM chariot_usages u JOIN companies c ON c.id=u.company_id
          WHERE c.payment_status='UNPAID' AND c.is_deleted = FALSE`,
    fmt: r => `⚠️ Montant total impayé : **${r[0].total || 0} DT**`
  },
  {
    match: /montant.*pay[ée]|pay[ée].*montant|total.*pay[ée]/i,
    sql: `SELECT ROUND(SUM(u.total_price)::numeric,3) AS total
          FROM chariot_usages u JOIN companies c ON c.id=u.company_id
          WHERE c.payment_status='PAID' AND c.is_deleted = FALSE`,
    fmt: r => `✅ Montant total payé : **${r[0].total || 0} DT**`
  },
  {
    match: /combien.*entreprise|nombre.*entreprise|entreprise.*combien/i,
    sql: `SELECT COUNT(*) AS total, SUM(CASE WHEN payment_status='PAID' THEN 1 ELSE 0 END) AS paid,
                SUM(CASE WHEN payment_status='UNPAID' THEN 1 ELSE 0 END) AS unpaid FROM companies WHERE is_deleted = FALSE`,
    fmt: r => `🏢 Entreprises : **${r[0].total}** total (${r[0].paid} payées, ${r[0].unpaid} impayées)`
  },
  {
    match: /3t|3 tonne/i,
    sql: `SELECT ROUND(SUM(u.total_price)::numeric,3) AS rev, SUM(u.hours_worked) AS h FROM chariot_usages u JOIN companies c ON c.id = u.company_id WHERE u.chariot_type='3T' AND c.is_deleted = FALSE`,
    fmt: r => `🚜 Chariot 3T : ${r[0].h}h travaillées — ${r[0].rev} DT`
  },
  {
    match: /5t|5 tonne/i,
    sql: `SELECT ROUND(SUM(u.total_price)::numeric,3) AS rev, SUM(u.hours_worked) AS h FROM chariot_usages u JOIN companies c ON c.id = u.company_id WHERE u.chariot_type='5T' AND c.is_deleted = FALSE`,
    fmt: r => `🚜 Chariot 5T : ${r[0].h}h travaillées — ${r[0].rev} DT`
  },
  {
    match: /7t|7 tonne/i,
    sql: `SELECT ROUND(SUM(u.total_price)::numeric,3) AS rev, SUM(u.hours_worked) AS h FROM chariot_usages u JOIN companies c ON c.id = u.company_id WHERE u.chariot_type='7T' AND c.is_deleted = FALSE`,
    fmt: r => `🚜 Chariot 7T : ${r[0].h}h travaillées — ${r[0].rev} DT`
  },
  {
    match: /16t|16 tonne/i,
    sql: `SELECT ROUND(SUM(u.total_price)::numeric,3) AS rev, SUM(u.hours_worked) AS h FROM chariot_usages u JOIN companies c ON c.id = u.company_id WHERE u.chariot_type='16T' AND c.is_deleted = FALSE`,
    fmt: r => `🚜 Chariot 16T : ${r[0].h}h travaillées — ${r[0].rev} DT`
  },
  {
    match: /facture.*mois|mois.*facture|ce mois/i,
    sql: `SELECT COUNT(*) AS nb, ROUND(SUM(ttc)::numeric,3) AS total FROM invoices
          WHERE DATE_TRUNC('month', invoice_date)=DATE_TRUNC('month', CURRENT_DATE) AND is_deleted = FALSE`,
    fmt: r => `📄 Factures ce mois : **${r[0].nb}** — Total TTC : ${r[0].total || 0} DT`
  },
];

// Dynamic company name lookup
async function companyIntent(q, pool) {
  const { rows: companies } = await pool.query('SELECT id, name FROM companies WHERE is_deleted = FALSE');
  const found = companies.find(c => q.toLowerCase().includes(c.name.toLowerCase().split(' ')[0].toLowerCase()));
  if (!found) return null;
  const { rows } = await pool.query(
    `SELECT chariot_type, hours_worked, total_price, payment_status FROM chariot_usages WHERE company_id=$1`,
    [found.id]
  );
  if (!rows.length) return `ℹ️ Aucune utilisation trouvée pour **${found.name}**.`;
  const total = rows.reduce((s, r) => s + parseFloat(r.total_price), 0);
  const hours = rows.reduce((s, r) => s + parseFloat(r.hours_worked), 0);
  return `📊 **${found.name}** :\n${rows.map(r=>`• ${r.chariot_type} — ${r.hours_worked}h — ${r.total_price} DT (${r.payment_status})`).join('\n')}\n💰 Total : ${total.toFixed(3)} DT | ⏱️ ${hours}h`;
}

app.post('/api/chatbot/message', async (req, res) => {
  const q = (req.body.message || '').trim();
  if (!q) return res.json({ answer: 'Posez-moi une question sur vos données.' });
  try {
    // Try static intents first
    for (const intent of INTENTS) {
      if (intent.match.test(q)) {
        const { rows } = await pool.query(intent.sql);
        return res.json({ answer: intent.fmt(rows) });
      }
    }
    // Try dynamic company name lookup
    const companyAnswer = await companyIntent(q, pool);
    if (companyAnswer) return res.json({ answer: companyAnswer });

    res.json({ answer: `🤔 Je n'ai pas compris votre question.\n\nEssayez :\n• "Revenu total ?"\n• "Entreprises impayées ?"\n• "Top 3 entreprises ?"\n• "Revenus par type de chariot ?"` });
  } catch (e) {
    res.status(500).json({ answer: `❌ Erreur : ${e.message}` });
  }
});

const PORT = parseInt(process.env.API_PORT || '3000');
app.listen(PORT, '0.0.0.0', () => console.log(`API ready → http://0.0.0.0:${PORT}/api`));
