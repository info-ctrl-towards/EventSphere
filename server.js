const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Google Sheets setup
const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
  keyFile: 'service-account.json', // Upload your JSON key here
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const spreadsheetId = process.env.SHEET_ID;

// GET all events
app.get('/api/events', async (req, res) => {
  try {
    const client = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId,
      range: 'Sheet1!A2:E' // Sheet name + columns
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

// POST new event
app.post('/api/events', async (req, res) => {
  try {
    const client = await auth.getClient();
    const { title, description, date, venue, organizer } = req.body;
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
    res.status(500).json({ error: err.message });
  }
});

// Simple test route
app.get('/', (req, res) => res.send('Event Sphere Backend Running'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
