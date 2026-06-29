const { Pool } = require('pg');

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
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbFile = path.join(__dirname, '../database.db');
  const sqliteDb = new sqlite3.Database(dbFile);

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
      // Einmaliges Löschen der Benutzer-Tabelle zum Zurücksetzen
      // await pool.query("DROP TABLE IF EXISTS users CASCADE");

      await pool.query(usersTable);
      await pool.query(entriesTable);
      console.log("Tabellen in Postgres geprüft/erstellt");
    } else {
      await pool.query(usersTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT'));
      await pool.query(entriesTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('TIMESTAMP', 'TEXT'));
      console.log("Tabellen in SQLite geprüft/erstellt");
    }
  } catch (err) {
    console.error("Fehler beim Erstellen der Tabellen:", err);
  }
};

initDb();

module.exports = {
  checkUser: async (username, password) => {
    try {
      const res = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
      return res.rows.length > 0;
    } catch (err) {
      console.error("Fehler bei checkUser:", err);
      return false;
    }
  },

  getUserCount: async () => {
    try {
      const res = await pool.query('SELECT COUNT(*) AS count FROM users');
      return parseInt(res.rows[0].count);
    } catch (err) {
      console.error("Fehler bei getUserCount:", err);
      return 0;
    }
  },

  createUser: async (username, password) => {
    try {
      await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, password]);
      return true;
    } catch (err) {
      console.error("Fehler bei createUser:", err);
      return false;
    }
  },

  getAllEntries: async () => {
    try {
      const res = await pool.query('SELECT * FROM entries ORDER BY createdAt DESC');
      return res.rows;
    } catch (err) {
      console.error("Fehler bei getAllEntries:", err);
      return [];
    }
  },

  saveEntry: async (entry) => {
    try {
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
    } catch (err) {
      console.error("Fehler bei saveEntry:", err);
    }
  }
};
