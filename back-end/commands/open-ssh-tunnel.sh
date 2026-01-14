#!/bin/bash

# Alle SSH-Regeln löschen (global und lokal)
sudo ufw --force delete allow 22 2>/dev/null || true
sudo ufw --force delete allow 22/tcp 2>/dev/null || true
sudo ufw --force delete allow "22 (v6)" 2>/dev/null || true
sudo ufw delete allow from 192.168.178.0/24 to any port 22 proto tcp 2>/dev/null || true

# SSH global erlauben
sudo ufw allow 22/tcp

# UFW neu laden
sudo ufw reload

# Status ausgeben
sudo ufw status verbose