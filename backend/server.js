const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Test-Benutzer
const users = {
  voter1: { username: 'voter1', password: 'test123', role: 'voter' },
  voter2: { username: 'voter2', password: 'test123', role: 'voter' },
  voter3: { username: 'voter3', password: 'test123', role: 'voter' },
  voter4: { username: 'voter4', password: 'test123', role: 'voter' },
  voter5: { username: 'voter5', password: 'test123', role: 'voter' },
  admin: { username: 'admin', password: 'admin123', role: 'admin' },
  validator: { username: 'validator', password: 'val123', role: 'validator' }
};

// Temporärer Speicher
let proposals = [
  {
    id: 1,
    title: 'Schüler-Pausenhof-Umgestaltung',
    description: 'Wir möchten den Pausenhof gemütlicher und attraktiver gestalten – mit Sitzmöglichkeiten, Pflanzen, Spielen und Graffiti-Wänden. Bevor wir Pläne umsetzen, sollen alle Schüler*innen über die besten Ideen abstimmen, damit wir genau wissen, welche Bereiche am wichtigsten sind und welche Vorschläge die größte Zustimmung haben.',
    author: 'Anonym',
    submitter: 'voter1',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    votes: 0,
    voters: [],
    commitments: [],
    status: 'validierung',
    rejectionReason: null,
    legalCheck: true,
    schoolDecision: null,
    messages: [],
    commitmentEnabled: false  // NEU: Validator entscheidet ob Mithelfen möglich ist
  },
  {
    id: 2,
    title: '17 Wochen Ferien pro Jahr',
    description: 'Wir schlagen vor, die Ferien auf insgesamt 17 Wochen im Jahr auszudehnen – also fast die Hälfte des Schuljahres. Das würde mehr Freizeit, Erholung und Möglichkeiten für Reisen bieten.',
    author: 'Max Muster',
    submitter: 'voter2',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    votes: 0,
    voters: [],
    commitments: [],
    status: 'validierung',
    rejectionReason: null,
    legalCheck: true,
    schoolDecision: null,
    messages: [],
    commitmentEnabled: false  // NEU
  },
];
let nextId = 3;

// Schwellenwert für Relevanzschwelle
const RELEVANCE_THRESHOLD = 2;

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  
  if (user && user.password === password) {
    res.json({ 
      success: true, 
      user: { username: user.username, role: user.role } 
    });
  } else {
    res.status(401).json({ success: false, message: 'Ungültige Anmeldedaten' });
  }
});

// Alle Vorschläge abrufen (rollenbasiert)
app.get('/api/proposals', (req, res) => {
  const { role } = req.query;

  if (role === 'voter') {
    return res.json(proposals.filter(p =>
      p.status === 'entscheidung_pending' ||
      p.status === 'angenommen' ||
      p.status === 'abgelehnt'
    ));
  }

  if (role === 'validator') {
    return res.json(proposals.filter(p => p.status === 'validierung'));
  }

  // Admin sieht ALLES
  return res.json(proposals);
});

// Alle Vorschläge für Übersicht (rollenunabhängig, nur lesen)
app.get('/api/proposals/overview', (req, res) => {
  return res.json(proposals);
});

// Vorschlag einreichen
app.post('/api/proposals', (req, res) => {
  const { title, description, author, isAnonymous, submitter } = req.body;
  
  const inappropriateWords = ['badword1', 'badword2'];
  const hasInappropriateContent = inappropriateWords.some(word => 
    title.toLowerCase().includes(word) || description.toLowerCase().includes(word)
  );
  
  const newProposal = {
    id: nextId++,
    title,
    description,
    author: isAnonymous ? 'Anonym' : author,
    submitter,
    timestamp: new Date().toISOString(),
    votes: 0,
    voters: [],
    commitments: [],
    status: hasInappropriateContent ? 'abgelehnt_filter' : 'validierung',
    rejectionReason: hasInappropriateContent ? 'Unangemessener Inhalt erkannt' : null,
    legalCheck: false,
    schoolDecision: null,
    messages: [],
    commitmentEnabled: false  // NEU: Standardmäßig deaktiviert
  };
  
  proposals.unshift(newProposal);
  res.status(201).json(newProposal);
});

// Vorschlag abstimmen
app.post('/api/proposals/:id/vote', (req, res) => {
  const { id } = req.params;
  const { username } = req.body;

  const proposal = proposals.find(p => p.id === parseInt(id));

  if (!proposal) {
    return res.status(404).json({ message: 'Vorschlag nicht gefunden' });
  }

  if (proposal.status !== 'entscheidung_pending') {
    return res.status(403).json({ message: 'Abstimmen ist in diesem Status nicht erlaubt' });
  }

  if (proposal.voters.includes(username)) {
    return res.status(400).json({ message: 'Du hast bereits abgestimmt' });
  }

  proposal.votes++;
  proposal.voters.push(username);

  return res.json(proposal);
});

// Validator: Vorschlag freigeben (mit optionaler Commitment-Aktivierung)
app.post('/api/proposals/:id/approve', (req, res) => {
  const { id } = req.params;
  const { commitmentEnabled } = req.body;  // NEU: Validator sendet diese Option mit
  const proposal = proposals.find(p => p.id === parseInt(id));

  if (!proposal) {
    return res.status(404).json({ message: 'Vorschlag nicht gefunden' });
  }

  if (proposal.status !== 'validierung') {
    return res.status(400).json({ message: 'Nur Vorschläge im Status "validierung" können freigegeben werden' });
  }

  proposal.status = 'rechtliche_prüfung';
  proposal.commitmentEnabled = commitmentEnabled === true;  // NEU: Setzt den Wert
  res.json(proposal);
});

// Validator: Vorschlag ablehnen
app.post('/api/proposals/:id/reject', (req, res) => {
  const { id } = req.params;
  const proposal = proposals.find(p => p.id === parseInt(id));
  
  if (!proposal) {
    return res.status(404).json({ message: 'Vorschlag nicht gefunden' });
  }
  
  proposal.status = 'abgelehnt_validator';
  proposal.rejectionReason = 'Formelle Erwartungen nicht erfüllt';
  res.json(proposal);
});

// Admin: Rechtliche Prüfung abschließen
app.post('/api/proposals/:id/legal-check', (req, res) => {
  const { id } = req.params;
  const { approved, reason } = req.body;
  const proposal = proposals.find(p => p.id === parseInt(id));

  if (!proposal) {
    return res.status(404).json({ message: 'Vorschlag nicht gefunden' });
  }

  if (approved) {
    proposal.status = 'entscheidung_pending';
    proposal.legalCheck = true;
  } else {
    proposal.status = 'abgelehnt_rechtlich';
    proposal.rejectionReason = reason || null;
  }

  res.json(proposal);
});

// Admin: Schulleitung Entscheidung
app.post('/api/proposals/:id/decision', (req, res) => {
  const { id } = req.params;
  const { decision, reason } = req.body;
  const proposal = proposals.find(p => p.id === parseInt(id));
  
  if (!proposal) {
    return res.status(404).json({ message: 'Vorschlag nicht gefunden' });
  }
  if (proposal.votes < RELEVANCE_THRESHOLD) {
    return res.status(403).json({
      message: `Entscheidung erst ab ${RELEVANCE_THRESHOLD} Stimmen möglich`
    });
  }

  proposal.schoolDecision = decision;
  
  switch(decision) {
    case 'angenommen':
      proposal.status = 'angenommen';
      proposal.rejectionReason = null;
      break;
    case 'abgelehnt':
      proposal.status = 'abgelehnt';
      proposal.rejectionReason = reason || null;
      break;
  }
  
  res.json(proposal);
});

// Vorschlag löschen (Admin)
app.delete('/api/proposals/:id', (req, res) => {
  const { id } = req.params;
  const index = proposals.findIndex(p => p.id === parseInt(id));
  
  if (index === -1) {
    return res.status(404).json({ message: 'Vorschlag nicht gefunden' });
  }
  
  proposals.splice(index, 1);
  res.json({ message: 'Vorschlag gelöscht' });
});

// Commitment: Mithelfen bei der Umsetzung
app.post('/api/proposals/:id/commit', (req, res) => {
  const { id } = req.params;
  const { username } = req.body;

  const proposal = proposals.find(p => p.id === parseInt(id));
  if (!proposal) {
    return res.status(404).json({ message: 'Vorschlag nicht gefunden' });
  }

  // NEU: Commitment ist nur erlaubt wenn der Validator es aktiviert hat
  if (!proposal.commitmentEnabled) {
    return res.status(403).json({ message: 'Mithelfen ist für diesen Vorschlag nicht aktiviert' });
  }

  if (!['entscheidung_pending', 'angenommen'].includes(proposal.status)) {
    return res.status(403).json({ message: 'Commitment in diesem Status nicht möglich' });
  }

  if (proposal.commitments.includes(username)) {
    return res.status(400).json({ message: 'Du hast dich bereits eingetragen' });
  }

  proposal.commitments.push(username);
  res.json(proposal);
});

// ── CHAT ──────────────────────────────────────────────

// Nachrichten eines Vorschlags abrufen
app.get('/api/proposals/:id/messages', (req, res) => {
  const { id } = req.params;
  const { username, role } = req.query;
  const proposal = proposals.find(p => p.id === parseInt(id));

  if (!proposal) return res.status(404).json({ message: 'Vorschlag nicht gefunden' });

  const isAdmin = role === 'admin';
  const isCommitted = proposal.commitments.includes(username);
  if (!isAdmin && !isCommitted) {
    return res.status(403).json({ message: 'Kein Zugriff auf diesen Chat' });
  }

  res.json(proposal.messages || []);
});

// Nachricht senden
app.post('/api/proposals/:id/messages', (req, res) => {
  const { id } = req.params;
  const { username, role, text } = req.body;
  const proposal = proposals.find(p => p.id === parseInt(id));

  if (!proposal) return res.status(404).json({ message: 'Vorschlag nicht gefunden' });
  if (!text?.trim()) return res.status(400).json({ message: 'Nachricht darf nicht leer sein' });

  const isAdmin = role === 'admin';
  const isCommitted = proposal.commitments.includes(username);

  if (!isAdmin && !isCommitted) {
    return res.status(403).json({ message: 'Kein Zugriff' });
  }
  if (!isAdmin) {
    const adminStarted = (proposal.messages || []).some(m => m.role === 'admin');
    if (!adminStarted) {
      return res.status(403).json({ message: 'Warte bis der Admin den Chat startet' });
    }
  }

  if (!proposal.messages) proposal.messages = [];

  const msg = {
    id: Date.now(),
    username,
    role,
    text: text.trim(),
    timestamp: new Date().toISOString()
  };

  proposal.messages.push(msg);
  res.status(201).json(msg);
});

app.listen(PORT, () => {
  console.log(`Backend läuft auf http://localhost:${PORT}`);
});