// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Google Sheets setup using Secret File
const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
  keyFile: '/etc/secrets/service-account.json', // Secret File path in Render
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const spreadsheetId = process.env.SHEET_ID; // Set this in Render environment

// GET all events
app.get('/api/events', async (req, res) => {
  try {
    const client = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId,
      range: 'Sheet1!A2:E' // Adjust your sheet range if needed
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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST new event
app.post('/api/events', async (req, res) => {
  try {
    const client = await auth.getClient();
    const { title, description, date, venue, organizer } = req.body;

    if (!title || !description || !date || !venue || !organizer) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    await sheets.spreadsheets.values.append({
      auth: client,
      spreadsheetId,
      range: 'Sheet1!A:E',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[title, description, date, venue, organizer]]
      }
    });

    res.json({ message: 'Event added successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/', (req, res) => res.send('Event Sphere Backend Running'));

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
