const { Pool } = require('pg');

// Wenn eine DATABASE_URL vorhanden ist (Supabase), nutzen wir Postgres.
// Ansonsten (lokal) nutzen wir weiterhin SQLite als Backup.
let pool;
let isPostgres = false;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  isPostgres = true;
  console.log("Nutze Supabase (PostgreSQL) Datenbank");
} else {
  // SQLite Fallback für lokale Entwicklung
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbFile = path.join(__dirname, '../database.db');
  const sqliteDb = new sqlite3.Database(dbFile);

  // Wir simulieren die Postgres-Schnittstelle für SQLite
  pool = {
    query: (text, params) => {
      return new Promise((resolve, reject) => {
        const method = text.trim().toLowerCase().startsWith('select') ? 'all' : 'run';
        sqliteDb[method](text.replace(/\$/g, '?'), params, function(err, rows) {
          if (err) reject(err);
          else resolve({ rows: rows || [], lastID: this.lastID });
        });
      });
    }
  };
  console.log("Nutze lokale SQLite Datenbank");
}

// Tabellen erstellen (falls sie noch nicht existieren)
const initDb = async () => {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT
    )`;

  const entriesTable = `
    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      machine TEXT,
      operator TEXT,
      additionalEmployee TEXT,
      date TEXT,
      workTime TEXT,
      incidentFrom TEXT,
      incidentTo TEXT,
      completedTasks TEXT,
      incidents TEXT,
      pendingWorks TEXT,
      issuer TEXT,
      issuerDate TEXT,
      issuerTime TEXT,
      photos TEXT,
      userId TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

  try {
    if (isPostgres) {
      await pool.query(usersTable);
      await pool.query(entriesTable);
    } else {
      // SQLite Syntax Anpassung (SERIAL -> INTEGER PRIMARY KEY AUTOINCREMENT)
      await pool.query(usersTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT'));
      await pool.query(entriesTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('TIMESTAMP', 'TEXT'));
    }
  } catch (err) {
    console.error("Fehler beim Erstellen der Tabellen:", err);
  }
};

initDb();

module.exports = {
  checkUser: async (username, password) => {
    const res = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
    return res.rows.length > 0;
  },

  getUserCount: async () => {
    const res = await pool.query('SELECT COUNT(*) AS count FROM users');
    return parseInt(res.rows[0].count);
  },

  createUser: async (username, password) => {
    try {
      await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, password]);
      return true;
    } catch (err) {
      return false;
    }
  },

  getAllEntries: async () => {
    const res = await pool.query('SELECT * FROM entries ORDER BY createdAt DESC');
    return res.rows;
  },

  saveEntry: async (entry) => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const photosJson = JSON.stringify(entry.photos || []);

    await pool.query(
      `INSERT INTO entries (
        machine, operator, additionalEmployee, date, workTime,
        incidentFrom, incidentTo, completedTasks,
        incidents, pendingWorks, issuer, issuerDate, issuerTime, photos, userId
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        entry.machine, entry.operator, entry.additionalEmployee, entry.date, entry.workTime,
        entry.incidentFrom, entry.incidentTo, entry.completedTasks,
        entry.incidents, entry.pendingWorks, entry.issuer, entry.issuerDate,
        currentTime, photosJson, entry.userId
      ]
    );
  }
};
