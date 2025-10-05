const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Google Sheets setup
const sheets = google.sheets("v4");
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_JSON),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});
const spreadsheetId = process.env.SHEET_ID;

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SENDER_EMAIL,
    pass: process.env.APP_PASSWORD
  }
});

// GET events
app.get("/api/events", async (req,res)=>{
  try{
    const client = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId,
      range: "Sheet1!A2:E"
    });
    const rows = response.data.values || [];
    const events = rows.map(r=>({ title:r[0], description:r[1], date:r[2], venue:r[3], organizer:r[4] }));
    res.json(events);
  }catch(err){ res.status(500).json({error: err.message}); }
});

// POST add event
app.post("/api/events", async(req,res)=>{
  try{
    const { title, description, date, venue, organizer } = req.body;
    if(!title||!description||!date||!venue||!organizer) return res.status(400).json({error:"All fields required"});
    const client = await auth.getClient();
    await sheets.spreadsheets.values.append({
      auth: client,
      spreadsheetId,
      range: "Sheet1!A:E",
      valueInputOption:"RAW",
      requestBody:{ values:[[title,description,date,venue,organizer]] }
    });
    res.json({ message: "Event added successfully!" });
  }catch(err){ res.status(500).json({error: err.message}); }
});

// POST participant registration
app.post("/api/register", async(req,res)=>{
  try{
    const { name, regNumber, email, eventTitle } = req.body;
    if(!name||!regNumber||!email||!eventTitle) return res.status(400).json({error:"All fields required"});
    const qrData = `Event: ${eventTitle}\nName: ${name}\nReg#: ${regNumber}`;
    const qrCodeURL = await QRCode.toDataURL(qrData);
    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: `Event Registration: ${eventTitle}`,
      html: `<p>Registered for <b>${eventTitle}</b></p><img src="${qrCodeURL}">`
    });
    res.json({ message:"Registered successfully! QR code sent to email.", qrCodeURL });
  }catch(err){ res.status(500).json({error:err.message}); }
});

app.listen(process.env.PORT||3000, ()=>console.log(`Server running on port ${process.env.PORT||3000}`));
