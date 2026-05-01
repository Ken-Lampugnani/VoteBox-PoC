const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'votebox.db'));

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS proposals (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      title              TEXT    NOT NULL,
      description        TEXT    NOT NULL,
      author             TEXT    NOT NULL,
      submitter          TEXT    NOT NULL,
      timestamp          TEXT    NOT NULL,
      status             TEXT    NOT NULL DEFAULT 'validierung',
      rejection_reason   TEXT,
      legal_check        INTEGER NOT NULL DEFAULT 0,
      school_decision    TEXT,
      commitment_enabled INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS votes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      proposal_id INTEGER NOT NULL,
      username    TEXT    NOT NULL,
      UNIQUE (proposal_id, username),
      FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS commitments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      proposal_id INTEGER NOT NULL,
      username    TEXT    NOT NULL,
      UNIQUE (proposal_id, username),
      FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      proposal_id INTEGER NOT NULL,
      username    TEXT    NOT NULL,
      role        TEXT    NOT NULL,
      text        TEXT    NOT NULL,
      timestamp   TEXT    NOT NULL,
      FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
    );
  `);

  // Fremdschlüssel-Unterstützung aktivieren (SQLite hat das standardmässig aus)
  db.pragma('foreign_keys = ON');
}

initDB();

module.exports = db;