const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Google Sheets setup
const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const spreadsheetId = process.env.SHEET_ID;

// =========== EVENTS =============
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
      title: r[0], description: r[1], date: r[2], venue: r[3], organizer: r[4]
    }));
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { title, description, date, venue, organizer } = req.body;
    if(!title||!description||!date||!venue||!organizer)
      return res.status(400).json({error:"All fields required."});
    const client = await auth.getClient();
    await sheets.spreadsheets.values.append({
      auth: client,
      spreadsheetId,
      range: 'Sheet1!A:E',
      valueInputOption: 'RAW',
      requestBody: { values: [[title, description, date, venue, organizer]] }
    });
    res.json({message:"Event added successfully!"});
  } catch (err) { res.status(500).json({error: err.message}); }
});

// =========== PARTICIPANTS ============
app.post('/api/register', async (req,res)=>{
  try{
    const {name,email,event} = req.body;
    if(!name||!email||!event) return res.status(400).json({error:"All fields required."});
    
    const qrData = `Name: ${name}\nEvent: ${event}\nEmail: ${email}`;
    const qrImage = await QRCode.toDataURL(qrData);

    // send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth:{ user: process.env.SENDER_EMAIL, pass: process.env.APP_PASSWORD }
    });
    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: `Registered for ${event}`,
      html: `<h3>Hello ${name}</h3><p>You registered for <b>${event}</b>.</p><img src="${qrImage}"/>`
    });
    res.json({message:`Registered successfully! QR code sent to ${email}`});
  }catch(err){ res.status(500).json({error: err.message}); }
});

app.get('/', (req,res)=>res.send('Event Sphere Backend Running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
