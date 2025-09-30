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

app.get('/api/events', async (req, res) => {
  try {
    const client = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId,
      range: 'Sheet1!A2:E'
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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send('Event Sphere Backend Running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
