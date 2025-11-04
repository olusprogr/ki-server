const express = require('express')
const path = require('path');
const { exec } = require('child_process');

const app = express()
const port = 3000

const LAN_SUBNET = '192.168.178.0/24';

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

    if (!api_key || !admin_key) return res.status(400).send('Missing api_key or admin_key parameter');
    if (api_key !== API_KEY || admin_key !== ADMIN_KEY) return res.status(403).send('Forbidden');

    // Schritt 1: alte LAN-only Regeln löschen
    exec('sudo ufw --force delete allow 22', (err1) => {
        exec('sudo ufw --force delete allow 22/tcp', (err2) => {

            // Schritt 2: SSH komplett für alle erlauben (IPv4 & IPv6)
            exec('sudo ufw allow 22', (err3) => {
                if (err3) console.error(`Error setting IPv4 allow: ${err3}`);

                exec('sudo ufw allow 22/tcp', (err4) => {
                    if (err4) console.error(`Error setting IPv6 allow: ${err4}`);

                    // Schritt 3: UFW reload
                    exec('sudo ufw reload', (err5) => {
                        if (err5) console.error(`Error reloading UFW: ${err5}`);
                        res.send('SSH opened for all connections (IPv4 & IPv6).');
                    });
                });
            });
        });
    });
});


app.get('/close-ssh-tunnel', (req, res) => {
    const api_key = req.query.api_key;
    const admin_key = req.query.admin_key;

    if (!api_key || !admin_key) return res.status(400).send('Missing api_key or admin_key parameter');
    if (api_key !== API_KEY || admin_key !== ADMIN_KEY) return res.status(403).send('Forbidden');

    // Schritt 1: alle bestehenden Port-22-Regeln löschen (IPv4 + IPv6)
    exec('sudo ufw --force delete allow 22', (error1) => {
        exec('sudo ufw --force delete allow 22/tcp', (error2) => {
            // Schritt 2: SSH nur noch aus LAN erlauben
            exec(`sudo ufw allow from ${LAN_SUBNET} to any port 22 proto tcp`, (error3) => {
                if (error3) console.error(`Error setting LAN rule: ${error3}`);

                // Schritt 3: UFW neu laden, damit alles sofort gilt
                exec('sudo ufw reload', (error4) => {
                    if (error4) console.error(`Error reloading UFW: ${error4}`);
                    res.send('SSH closed for external connections, LAN still allowed.');
                });
            });
        });
    });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

// http://localhost:3000/test?api_key=nigger&admin_key=sadam_hussain
// http://192.168.178.210:3000/test?api_key=nigger&admin_key=sadam_hussain