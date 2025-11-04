const express = require('express')
const path = require('path');
const { exec } = require('child_process');

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

app.get('/run-script', (req, res) => {
  const api_key = req.query.api_key;
  const admin_key = req.query.admin_key;

  if (!api_key || !admin_key) {
    return res.status(400).send('Missing api_key or admin_key parameter');
  }

  if (api_key !== API_KEY || admin_key !== ADMIN_KEY) {
    return res.status(403).send('Forbidden');
  }

  exec('ipconfig', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing script: ${error}`);
      return res.status(500).send('Error executing script');
    }
    const lines = stdout.split('\n').map(line => line.trim()).filter(Boolean);
    res.send(`Script executed successfully: ${lines.join('<br>')}`);
  });
});

app.get('/', (req, res) => {
  const api_key = req.query.api_key;
  const admin_key = req.query.admin_key;

  if (!api_key || !admin_key) {
    return res.status(400).send('Missing api_key or admin_key parameter');
  }

  if (api_key !== API_KEY || admin_key !== ADMIN_KEY) {
    return res.status(403).send('Forbidden');
  }

  res.redirect(`/test?api_key=${api_key}&admin_key=${admin_key}`);
});

app.get('/open-ssh-tunnel', (req, res) => {
    const api_key = req.query.api_key;
    const admin_key = req.query.admin_key;

    if (!api_key || !admin_key) {
        return res.status(400).send('Missing api_key or admin_key parameter');
    }

    if (api_key !== API_KEY || admin_key !== ADMIN_KEY) {
        return res.status(403).send('Forbidden');
    }

    exec('sudo ufw allow 22', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing script: ${error}`);
            return res.status(500).send('Error executing script');
        }
        exec('sudo systemctl start ssh', (err) => {
            if (err) console.error(`Error starting SSH: ${err}`);
            res.send(`SSH opened successfully: ${stdout}`);
        });
    });
});

app.get('/close-ssh-tunnel', (req, res) => {
    const api_key = req.query.api_key;
    const admin_key = req.query.admin_key;

    if (!api_key || !admin_key) {
        return res.status(400).send('Missing api_key or admin_key parameter');
    }

    if (api_key !== API_KEY || admin_key !== ADMIN_KEY) {
        return res.status(403).send('Forbidden');
    }

    exec('sudo ufw deny 22', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing script: ${error}`);
            return res.status(500).send('Error executing script');
        }
        exec('sudo systemctl stop ssh', (err) => {
            if (err) console.error(`Error stopping SSH: ${err}`);
            res.send(`SSH closed successfully: ${stdout}`);
        });
    });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

// http://localhost:3000/test?api_key=nigger&admin_key=sadam_hussain
// http://192.168.178.210:3000/test?api_key=nigger&admin_key=sadam_hussain