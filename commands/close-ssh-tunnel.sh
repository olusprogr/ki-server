#!/bin/bash

# Alte globale SSH-Regeln löschen
sudo ufw --force delete allow 22
sudo ufw --force delete allow 22/tcp
sudo ufw --force delete allow 22 (v6)

# SSH nur für lokales Netzwerk erlauben
sudo ufw allow from 192.168.178.0/24 to any port 22 proto tcp

# UFW neu laden
sudo ufw reload

# Status prüfen
sudo ufw status verbose
