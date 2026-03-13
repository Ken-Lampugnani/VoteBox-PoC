# 🗳️ VoteBox

Eine digitale Abstimmungsplattform für Schulen. Schüler\*innen können Vorschläge einreichen, darüber abstimmen und mit der Schulleitung kommunizieren.

---

## Voraussetzungen

- [Node.js](https://nodejs.org/) (v18 oder neuer)
- npm (wird mit Node.js mitgeliefert)
- Zwei Terminals (eines für Frontend, eines für Backend)

---

## Installation

### 1. Repository klonen oder Dateien herunterladen

```sh
git clone <repo-url>
cd VoteBox
```

### 2. Frontend-Abhängigkeiten installieren

```sh
cd frontend
npm install
```

### 3. Backend-Abhängigkeiten installieren

Im Ordner wo `server.js` liegt:

```sh
npm init -y
npm install express cors body-parser
```

> `npm init -y` erstellt eine `package.json` falls noch keine vorhanden ist.  
> Falls bereits eine `package.json` existiert, reicht `npm install`.

---

## Anwendung starten

Die Anwendung besteht aus **zwei Prozessen** die gleichzeitig laufen müssen.

### Terminal 1 — Backend starten

```sh
# Im Ordner wo server.js liegt
node server.js
```

✅ Erfolgreich wenn folgendes erscheint:
```
Backend läuft auf http://localhost:3000
```

### Terminal 2 — Frontend starten

```sh
cd frontend
npm run dev
```

✅ Erfolgreich wenn folgendes erscheint:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Im Browser öffnen

👉 **http://localhost:5173**

---

## Test-Accounts

| Rolle | Benutzername | Passwort | Beschreibung |
|---|---|---|---|
| Schüler | `voter1` – `voter5` | `test123` | Vorschläge einreichen & abstimmen |
| Validator | `validator` | `val123` | Formelle Prüfung von Vorschlägen |
| Schulleitung | `admin` | `admin123` | Rechtsprüfung, Entscheid, Chats |

---

## Workflow

```
Voter reicht ein → Validator prüft → Admin: Rechtsprüfung → Voting → Admin: Entscheid
```

| Schritt | Wer | Was passiert |
|---|---|---|
| 1 | Voter | Vorschlag einreichen (anonym oder mit Name) |
| 2 | Validator | Formelle Prüfung: Freigeben oder Ablehnen |
| 3 | Admin | Rechtliche Prüfung: OK oder Ablehnen (mit Begründung) |
| 4 | Voter | Abstimmen — ab **2 Stimmen** wird Entscheid freigeschaltet |
| 5 | Admin | Annehmen oder Ablehnen (mit Begründung) |
| 6 | Voter | Sieht Ergebnis + Begründung bei Ablehnung |

---

## Rollen-Übersicht

### 👩‍🎓 Voter (Schüler\*in)
- Vorschlag einreichen (anonym oder mit Name)
- Für Vorschläge abstimmen
- Commitment: „Ich helfe mit" bei Vorschlägen
- Abgelehnte Vorschläge mit Begründung einsehen
- Chat mit Admin (nur wenn committed & Admin hat gestartet)

### 🧾 Validator
- Eingereichte Vorschläge formal prüfen
- Freigeben → geht zur Rechtsprüfung
- Ablehnen → automatischer Grund: „Formelle Erwartungen nicht erfüllt"

### ⚙️ Admin (Schulleitung)
- Rechtliche Prüfung mit eigener Begründung
- Entscheid bei genug Stimmen (Angenommen / Abgelehnt + Begründung)
- Gruppen-Chat mit Committed-Votern pro Vorschlag starten
- Vorschläge löschen

---

## Technischer Aufbau

```
VoteBox/
├── frontend/          # Vue 3 + Vite
│   └── src/
│       ├── App.vue    # Gesamte Frontend-Logik
│       └── main.js
└── server.js          # Express Backend (REST API, Port 3000)
```

**Frontend:** Vue 3, Vite, Axios  
**Backend:** Node.js, Express, CORS, body-parser  
**Datenspeicher:** Im Arbeitsspeicher (kein DB) — Daten gehen beim Neustart verloren

### Pakete im Detail

| Paket | Wo | Zweck |
|---|---|---|
| `vue` | Frontend | UI-Framework |
| `vite` | Frontend | Dev-Server & Build-Tool |
| `axios` | Frontend | HTTP-Requests ans Backend |
| `express` | Backend | Web-Server / REST API |
| `cors` | Backend | Erlaubt Anfragen vom Frontend (Port 5173 → 3000) |
| `body-parser` | Backend | JSON-Body aus POST-Requests lesen |

---

## Wichtige Einstellungen

### Relevanzschwelle anpassen
Wie viele Stimmen ein Vorschlag braucht bevor der Admin entscheiden kann:

- **Backend:** `server.js` Zeile 28 → `const RELEVANCE_THRESHOLD = 2;`
- **Frontend:** `src/App.vue` Zeile 653 → `const RELEVANCE_THRESHOLD = 2;`

⚠️ Beide Werte müssen identisch sein.

### API-URL anpassen
Falls das Backend auf einem anderen Server läuft:

- `src/App.vue` Zeile 652 → `const API_URL = 'http://localhost:3000/api';`

---

## Bekannte Einschränkungen

- Daten werden nur **im RAM** gespeichert — nach `node server.js` Neustart sind alle Vorschläge weg
- Kein echtes Authentifizierungssystem (Passwörter im Klartext im Server)
- Für Produktion wäre eine Datenbank (z.B. SQLite, PostgreSQL) notwendig

---

## Entwicklung

```sh
# Frontend mit Hot-Reload
cd frontend && npm run dev

# Frontend für Produktion bauen
cd frontend && npm run build
```