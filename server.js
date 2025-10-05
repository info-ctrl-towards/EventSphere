// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const spreadsheetId = process.env.SHEET_ID;

// Get all events
app.get('/api/events', async (req, res) => {
  try {
    const client = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId,
      range: 'Events!A2:E'
    });
    const rows = response.data.values || [];
    const events = rows.map(r => ({
      title: r[0],
      description: r[1],
      date: r[2],
      venue: r[3],
      organizer: r[4]
    }));
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add event
app.post('/api/events', async (req, res) => {
  try {
    const client = await auth.getClient();
    const { title, description, date, venue, organizer } = req.body;

    if (!title || !description || !date || !venue || !organizer) {
      return res.status(400).json({ error: "All fields are required." });
    }

    await sheets.spreadsheets.values.append({
      auth: client,
      spreadsheetId,
      range: 'Events!A:E',
      valueInputOption: 'RAW',
      requestBody: { values: [[title, description, date, venue, organizer]] }
    });

    res.json({ message: "Event added successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Participant registration
app.post('/api/register', async (req, res) => {
  try {
    const client = await auth.getClient();
    const { eventTitle, name, regNum, email } = req.body;

    if (!eventTitle || !name || !regNum || !email) {
      return res.status(400).json({ error: "All fields are required." });
    }

    await sheets.spreadsheets.values.append({
      auth: client,
      spreadsheetId,
      range: 'Participants!A:D',
      valueInputOption: 'RAW',
      requestBody: { values: [[eventTitle, name, regNum, email]] }
    });

    res.json({ message: "Participant registered successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send('Event Sphere Backend Running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
