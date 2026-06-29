const { Pool } = require('pg');

let pool;
let isPostgres = false;

// Wir prüfen, ob die Einzeldaten für die Datenbank vorhanden sind
if (process.env.DB_HOST) {
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 6543,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });
  isPostgres = true;
  console.log("PostgreSQL (Einzelwerte) erkannt. Verbinde...");
} else if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  isPostgres = true;
  console.log("DATABASE_URL erkannt. Verbinde...");
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
      // Einmaliger Reset für sauberen Start (Wird nur ausgeführt wenn Verbindung steht)
      // await pool.query("DROP TABLE IF EXISTS users CASCADE");

      await pool.query(usersTable);
      await pool.query(entriesTable);
      console.log("Tabellen in Postgres bereit!");
    } else {
      await pool.query(usersTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT'));
      await pool.query(entriesTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('TIMESTAMP', 'TEXT'));
    }
  } catch (err) {
    console.error("Datenbank-Initialisierungsfehler:", err.message);
  }
};

initDb();

module.exports = {
  checkUser: async (username, password) => {
    try {
      const res = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
      return res.rows.length > 0;
    } catch (err) {
      console.error("Login Fehler:", err.message);
      return false;
    }
  },
  getUserCount: async () => {
    try {
      const res = await pool.query('SELECT COUNT(*) AS count FROM users');
      return parseInt(res.rows[0].count);
    } catch (err) {
      return 0;
    }
  },
  createUser: async (username, password) => {
    try {
      await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, password]);
      return true;
    } catch (err) {
      console.error("Registrierung Fehler:", err.message);
      return false;
    }
  },
  getAllEntries: async () => {
    try {
      const res = await pool.query('SELECT * FROM entries ORDER BY createdAt DESC');
      return res.rows;
    } catch (err) {
      return [];
    }
  },
  saveEntry: async (entry) => {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
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
          currentTime, JSON.stringify(entry.photos || []), entry.userId
        ]
      );
    } catch (err) {
      console.error("Speichern Fehler:", err.message);
    }
  }
};
