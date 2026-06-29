const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Statische Dateien (Frontend)
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Hauptseite ausliefern
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// API Routes
app.post('/api/login', async (req, res) => {
  try {
    const { user, password } = req.body;
    const userExists = await db.checkUser(user, password);
    if (userExists) {
      res.json({ success: true, user });
    } else {
      res.status(401).send('Ungültige Anmeldedaten oder Benutzer nicht gefunden');
    }
  } catch (err) {
    res.status(500).send('Datenbankfehler: ' + err.message);
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { user, password } = req.body;
    const success = await db.createUser(user, password);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(400).send('Registrierung fehlgeschlagen (Name evtl. vergeben)');
    }
  } catch (err) {
    res.status(500).send('Datenbankfehler: ' + err.message);
  }
});

app.get('/api/entries', async (req, res) => {
  const entries = await db.getAllEntries();
  res.json(entries);
});

app.post('/api/entries', async (req, res) => {
  const entry = req.body;
  await db.saveEntry(entry);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});