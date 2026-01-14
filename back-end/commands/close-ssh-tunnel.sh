#!/bin/bash

# Alle SSH-Regeln löschen (global und lokal)
sudo ufw --force delete allow 22 2>/dev/null || true
sudo ufw --force delete allow 22/tcp 2>/dev/null || true
sudo ufw --force delete allow "22 (v6)" 2>/dev/null || true
sudo ufw delete allow from 192.168.178.0/24 to any port 22 proto tcp 2>/dev/null || true

# SSH nur für lokales Netzwerk erlauben
sudo ufw allow from 192.168.178.0/24 to any port 22 proto tcp

# UFW neu laden
sudo ufw reload

# Status prüfen
sudo ufw status verbose