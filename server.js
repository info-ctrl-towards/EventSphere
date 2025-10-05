const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

let events = [];       // In-memory events storage
let participants = []; // In-memory participants

// ================= Events =================
app.get('/api/events', (req, res) => {
  res.json(events);
});

app.post('/api/events', (req, res) => {
  const { title, description, date, venue, organizer } = req.body;
  if(!title||!description||!date||!venue||!organizer){
    return res.status(400).json({error:"All fields are required."});
  }
  events.push({ title, description, date, venue, organizer });
  res.json({message:"Event added successfully!"});
});

// =============== Participant Registration =================
app.post('/api/register', async (req, res) => {
  const { name, email, event } = req.body;
  if(!name||!email||!event) return res.status(400).json({error:"All fields required."});

  const qrData = `Name: ${name}\nEvent: ${event}\nEmail: ${email}`;
  const qrImage = await QRCode.toDataURL(qrData);

  // send email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SENDER_EMAIL,
      pass: process.env.APP_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.SENDER_EMAIL,
    to: email,
    subject: `Registered for ${event}`,
    html: `<h3>Hello ${name},</h3>
           <p>You are successfully registered for <b>${event}</b>.</p>
           <p>Scan the QR code at the event:</p>
           <img src="${qrImage}"/>`
  };

  transporter.sendMail(mailOptions, (err, info)=>{
    if(err) return res.status(500).json({error: err.message});
    participants.push({name,email,event,qrImage});
    res.json({message:`Registered successfully! Email sent to ${email}`});
  });
});

// Simple check
app.get('/', (req,res)=> res.send('Event Sphere Backend Running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));
