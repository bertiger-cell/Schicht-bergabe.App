const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.NODE_ENV === 'production' ? '/tmp/database.db' : path.join(__dirname, '../database.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
});

module.exports = {
  checkUser: (username, password) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ? AND password = ?',
        [username, password],
        (err, row) => {
          resolve(!!row);
        }
      );
    });
  },

  getUserCount: () => {
    return new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
        resolve(row.count);
      });
    });
  },

  createUser: (username, password) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, password],
        function(err) {
          if (err) resolve(false);
          else resolve(true);
        }
      );
    });
  },

  getAllEntries: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM entries ORDER BY createdAt DESC', [], (err, rows) => {
        resolve(rows);
      });
    });
  },

  saveEntry: (entry) => {
    return new Promise((resolve, reject) => {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);

      db.run(
        `INSERT INTO entries (
          machine, operator, additionalEmployee, date, workTime,
          incidentFrom, incidentTo, completedTasks,
          incidents, pendingWorks, issuer, issuerDate, issuerTime, photos, userId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.machine,
          entry.operator,
          entry.additionalEmployee,
          entry.date,
          entry.workTime,
          entry.incidentFrom,
          entry.incidentTo,
          entry.completedTasks,
          entry.incidents,
          entry.pendingWorks,
          entry.issuer,
          entry.issuerDate,
          currentTime,
          JSON.stringify(entry.photos || []),
          entry.userId
        ],
        (err) => {
          resolve();
        }
      );
    });
  }
};