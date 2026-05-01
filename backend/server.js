const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Test-Benutzer (bleibt In-Memory — Authentifizierung ist nicht Teil dieses Projekts)
const users = {
  voter1:    { username: 'voter1',    password: 'test123',  role: 'voter' },
  voter2:    { username: 'voter2',    password: 'test123',  role: 'voter' },
  voter3:    { username: 'voter3',    password: 'test123',  role: 'voter' },
  voter4:    { username: 'voter4',    password: 'test123',  role: 'voter' },
  voter5:    { username: 'voter5',    password: 'test123',  role: 'voter' },
  admin:     { username: 'admin',     password: 'admin123', role: 'admin' },
  validator: { username: 'validator', password: 'val123',   role: 'validator' },
};

const RELEVANCE_THRESHOLD = 2;

// ── HILFSFUNKTION ─────────────────────────────────────
// Liest ein Proposal aus der DB und hängt votes[], commitments[] und messages[] an,
// damit das Frontend exakt dasselbe Format wie vorher bekommt.
function getProposalById(id) {
  const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(id);
  if (!proposal) return null;
  return enrichProposal(proposal);
}

function enrichProposal(proposal) {
  const voters = db
    .prepare('SELECT username FROM votes WHERE proposal_id = ?')
    .all(proposal.id)
    .map(r => r.username);

  const commitments = db
    .prepare('SELECT username FROM commitments WHERE proposal_id = ?')
    .all(proposal.id)
    .map(r => r.username);

  const messages = db
    .prepare('SELECT * FROM messages WHERE proposal_id = ? ORDER BY id ASC')
    .all(proposal.id);

  return {
    id:                proposal.id,
    title:             proposal.title,
    description:       proposal.description,
    author:            proposal.author,
    submitter:         proposal.submitter,
    timestamp:         proposal.timestamp,
    status:            proposal.status,
    rejectionReason:   proposal.rejection_reason,
    legalCheck:        proposal.legal_check === 1,
    schoolDecision:    proposal.school_decision,
    commitmentEnabled: proposal.commitment_enabled === 1,
    votes:             voters.length,
    voters,
    commitments,
    messages,
  };
}

function getAllProposals() {
  const rows = db.prepare('SELECT * FROM proposals ORDER BY id DESC').all();
  return rows.map(enrichProposal);
}

// ── LOGIN ─────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (user && user.password === password) {
    res.json({ success: true, user: { username: user.username, role: user.role } });
  } else {
    res.status(401).json({ success: false, message: 'Ungültige Anmeldedaten' });
  }
});

// ── PROPOSALS ABRUFEN (rollenbasiert) ─────────────────
app.get('/api/proposals', (req, res) => {
  const { role } = req.query;
  const all = getAllProposals();

  if (role === 'voter') {
    return res.json(all.filter(p =>
      p.status === 'entscheidung_pending' ||
      p.status === 'angenommen' ||
      p.status === 'abgelehnt'
    ));
  }
  if (role === 'validator') {
    return res.json(all.filter(p => p.status === 'validierung'));
  }
  return res.json(all);
});

// ── ÜBERSICHT (rollenunabhängig) ───────────────────────
app.get('/api/proposals/overview', (req, res) => {
  res.json(getAllProposals());
});

// ── PROPOSAL EINREICHEN ────────────────────────────────
app.post('/api/proposals', (req, res) => {
  const { title, description, author, isAnonymous, submitter } = req.body;

  const inappropriateWords = ['badword1', 'badword2'];
  const hasInappropriateContent = inappropriateWords.some(word =>
    title.toLowerCase().includes(word) || description.toLowerCase().includes(word)
  );

  const status          = hasInappropriateContent ? 'abgelehnt_filter' : 'validierung';
  const rejectionReason = hasInappropriateContent ? 'Unangemessener Inhalt erkannt' : null;

  const result = db.prepare(`
    INSERT INTO proposals (title, description, author, submitter, timestamp, status, rejection_reason, legal_check, school_decision, commitment_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, 0)
  `).run(
    title,
    description,
    isAnonymous ? 'Anonym' : author,
    submitter,
    new Date().toISOString(),
    status,
    rejectionReason
  );

  res.status(201).json(getProposalById(result.lastInsertRowid));
});

// ── ABSTIMMEN ─────────────────────────────────────────
app.post('/api/proposals/:id/vote', (req, res) => {
  const id = parseInt(req.params.id);
  const { username } = req.body;

  const proposal = getProposalById(id);
  if (!proposal) return res.status(404).json({ message: 'Vorschlag nicht gefunden' });
  if (proposal.status !== 'entscheidung_pending')
    return res.status(403).json({ message: 'Abstimmen ist in diesem Status nicht erlaubt' });
  if (proposal.voters.includes(username))
    return res.status(400).json({ message: 'Du hast bereits abgestimmt' });

  try {
    db.prepare('INSERT INTO votes (proposal_id, username) VALUES (?, ?)').run(id, username);
  } catch (e) {
    // UNIQUE-Constraint verletzt — Doppelabstimmung
    return res.status(400).json({ message: 'Du hast bereits abgestimmt' });
  }

  res.json(getProposalById(id));
});

// ── VALIDATOR: FREIGEBEN ──────────────────────────────
app.post('/api/proposals/:id/approve', (req, res) => {
  const id = parseInt(req.params.id);
  const { commitmentEnabled } = req.body;

  const proposal = getProposalById(id);
  if (!proposal) return res.status(404).json({ message: 'Vorschlag nicht gefunden' });
  if (proposal.status !== 'validierung')
    return res.status(400).json({ message: 'Nur Vorschläge im Status "validierung" können freigegeben werden' });

  db.prepare(`
    UPDATE proposals SET status = 'rechtliche_prüfung', commitment_enabled = ? WHERE id = ?
  `).run(commitmentEnabled === true ? 1 : 0, id);

  res.json(getProposalById(id));
});

// ── VALIDATOR: ABLEHNEN ───────────────────────────────
app.post('/api/proposals/:id/reject', (req, res) => {
  const id = parseInt(req.params.id);

  const proposal = getProposalById(id);
  if (!proposal) return res.status(404).json({ message: 'Vorschlag nicht gefunden' });

  db.prepare(`
    UPDATE proposals SET status = 'abgelehnt_validator', rejection_reason = ? WHERE id = ?
  `).run('Formelle Erwartungen nicht erfüllt', id);

  res.json(getProposalById(id));
});

// ── ADMIN: RECHTLICHE PRÜFUNG ─────────────────────────
app.post('/api/proposals/:id/legal-check', (req, res) => {
  const id = parseInt(req.params.id);
  const { approved, reason } = req.body;

  const proposal = getProposalById(id);
  if (!proposal) return res.status(404).json({ message: 'Vorschlag nicht gefunden' });

  if (approved) {
    db.prepare(`
      UPDATE proposals SET status = 'entscheidung_pending', legal_check = 1 WHERE id = ?
    `).run(id);
  } else {
    db.prepare(`
      UPDATE proposals SET status = 'abgelehnt_rechtlich', rejection_reason = ? WHERE id = ?
    `).run(reason || null, id);
  }

  res.json(getProposalById(id));
});

// ── ADMIN: SCHULENTSCHEID ─────────────────────────────
app.post('/api/proposals/:id/decision', (req, res) => {
  const id = parseInt(req.params.id);
  const { decision, reason } = req.body;

  const proposal = getProposalById(id);
  if (!proposal) return res.status(404).json({ message: 'Vorschlag nicht gefunden' });
  if (proposal.votes < RELEVANCE_THRESHOLD)
    return res.status(403).json({ message: `Entscheidung erst ab ${RELEVANCE_THRESHOLD} Stimmen möglich` });

  if (decision === 'angenommen') {
    db.prepare(`
      UPDATE proposals SET status = 'angenommen', school_decision = 'angenommen', rejection_reason = NULL WHERE id = ?
    `).run(id);
  } else if (decision === 'abgelehnt') {
    db.prepare(`
      UPDATE proposals SET status = 'abgelehnt', school_decision = 'abgelehnt', rejection_reason = ? WHERE id = ?
    `).run(reason || null, id);
  }

  res.json(getProposalById(id));
});

// ── ADMIN: PROPOSAL LÖSCHEN ───────────────────────────
app.delete('/api/proposals/:id', (req, res) => {
  const id = parseInt(req.params.id);

  const proposal = getProposalById(id);
  if (!proposal) return res.status(404).json({ message: 'Vorschlag nicht gefunden' });

  db.prepare('DELETE FROM proposals WHERE id = ?').run(id);
  res.json({ message: 'Vorschlag gelöscht' });
});

// ── COMMITMENT ────────────────────────────────────────
app.post('/api/proposals/:id/commit', (req, res) => {
  const id = parseInt(req.params.id);
  const { username } = req.body;

  const proposal = getProposalById(id);
  if (!proposal) return res.status(404).json({ message: 'Vorschlag nicht gefunden' });
  if (!proposal.commitmentEnabled)
    return res.status(403).json({ message: 'Mithelfen ist für diesen Vorschlag nicht aktiviert' });
  if (!['entscheidung_pending', 'angenommen'].includes(proposal.status))
    return res.status(403).json({ message: 'Commitment in diesem Status nicht möglich' });
  if (proposal.commitments.includes(username))
    return res.status(400).json({ message: 'Du hast dich bereits eingetragen' });

  try {
    db.prepare('INSERT INTO commitments (proposal_id, username) VALUES (?, ?)').run(id, username);
  } catch (e) {
    return res.status(400).json({ message: 'Du hast dich bereits eingetragen' });
  }

  res.json(getProposalById(id));
});

// ── CHAT: NACHRICHTEN ABRUFEN ─────────────────────────
app.get('/api/proposals/:id/messages', (req, res) => {
  const id = parseInt(req.params.id);
  const { username, role } = req.query;

  const proposal = getProposalById(id);
  if (!proposal) return res.status(404).json({ message: 'Vorschlag nicht gefunden' });

  const isAdmin     = role === 'admin';
  const isCommitted = proposal.commitments.includes(username);
  if (!isAdmin && !isCommitted)
    return res.status(403).json({ message: 'Kein Zugriff auf diesen Chat' });

  res.json(proposal.messages);
});

// ── CHAT: NACHRICHT SENDEN ────────────────────────────
app.post('/api/proposals/:id/messages', (req, res) => {
  const id = parseInt(req.params.id);
  const { username, role, text } = req.body;

  const proposal = getProposalById(id);
  if (!proposal) return res.status(404).json({ message: 'Vorschlag nicht gefunden' });
  if (!text?.trim()) return res.status(400).json({ message: 'Nachricht darf nicht leer sein' });

  const isAdmin     = role === 'admin';
  const isCommitted = proposal.commitments.includes(username);

  if (!isAdmin && !isCommitted)
    return res.status(403).json({ message: 'Kein Zugriff' });

  if (!isAdmin) {
    const adminStarted = proposal.messages.some(m => m.role === 'admin');
    if (!adminStarted)
      return res.status(403).json({ message: 'Warte bis der Admin den Chat startet' });
  }

  const timestamp = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO messages (proposal_id, username, role, text, timestamp) VALUES (?, ?, ?, ?, ?)
  `).run(id, username, role, text.trim(), timestamp);

  res.status(201).json({
    id: result.lastInsertRowid,
    username,
    role,
    text: text.trim(),
    timestamp,
  });
});

app.listen(PORT, () => {
  console.log(`Backend läuft auf http://localhost:${PORT}`);
});