const express = require('express')
const path = require('path');

const app = express()
const port = 3000

require('dotenv').config();

const API_KEY = process.env.API_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY;

app.get('/test', (req, res) => {
  const api_key = req.query.api_key;
  const admin_key = req.query.admin_key;

  console.log(`Received api_key: ${api_key}, admin_key: ${admin_key}`);

  if (!api_key || !admin_key) {
    return res.status(400).send('Missing api_key or admin_key parameter');
  }

  if (api_key !== API_KEY || admin_key !== ADMIN_KEY) {
    return res.status(403).send('Forbidden');
  }

  res.sendFile(path.join(__dirname, 'html-pages', 'index.html'));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

// http://localhost:3000/test?api_key=nigger&admin_key=sadam_hussain