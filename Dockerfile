# Basis-Image nutzen
FROM node:18-slim

# Arbeitsverzeichnis im Container
WORKDIR /app

# Abhängigkeiten kopieren
COPY package*.json ./

# Abhängigkeiten installieren
RUN npm install

# Gesamten Code kopieren
COPY . .

# Port freigeben (Render/Heroku setzen den Port automatisch via Umgebungsvariable)
EXPOSE 3000

# Startbefehl
CMD ["node", "backend/server.js"]
