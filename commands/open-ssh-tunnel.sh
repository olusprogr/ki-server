#!/bin/bash

# Alle alten SSH-Regeln löschen
sudo ufw --force delete allow 22
sudo ufw --force delete allow 22/tcp
sudo ufw --force delete allow "22 (v6)"

# SSH global erlauben
sudo ufw allow 22/tcp

# UFW neu laden
sudo ufw reload

# Status ausgeben
sudo ufw status verbose