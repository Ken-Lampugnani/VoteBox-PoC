//problem login wird beim reloaden zu current login gesetzt

<template>
  <div class="app">
    <!-- Login Screen -->
    <div v-if="!currentUser" class="login-container">
      <div class="login-box">
        <h1>🗳️ VoteBox Login</h1>
        <p>Melde dich an, um fortzufahren</p>
        
        <div class="form-group">
          <label>Benutzername</label>
          <input 
            v-model="loginUsername" 
            type="text" 
            placeholder="Benutzername"
            @keyup.enter="login"
          />
        </div>

        <div class="form-group">
          <label>Passwort</label>
          <input 
            v-model="loginPassword" 
            type="password" 
            placeholder="Passwort"
            @keyup.enter="login"
          />
        </div>

        <button @click="login" class="login-btn">Anmelden</button>

        <div v-if="loginError" class="error-message">
          {{ loginError }}
        </div>

        <div class="test-accounts">
          <p><strong>Test-Accounts:</strong></p>
          <p>Voter1: <code>voter1 / test123</code></p>
          <p>Voter2: <code>voter2 / test123</code></p>
          <p>Voter3: <code>voter3 / test123</code></p>
          <p>Voter4: <code>voter4 / test123</code></p>
          <p>Voter5: <code>voter5 / test123</code></p>
          <p>Admin: <code>admin / admin123</code></p>
          <p>Validator: <code>validator / val123</code></p>
        </div>
      </div>
    </div>

    <!-- Main App -->
    <div v-else>
      <header>
        <div class="header-content">
          <div>
<div class="title-with-logo">
  <img src="./votebox_logo.png" alt="Logo" class="logo" />
  <h1>VoteBox</h1>
</div>
            <p>Angemeldet als: <strong>{{ currentUser.username }}</strong> ({{ getRoleName(currentUser.role) }})</p>
          </div>
          <button @click="logout" class="logout-btn">Abmelden</button>
        </div>
      </header>

      <div v-if="showSuccess" class="success-message">
        ✓ {{ successMessage }}
      </div>

      <!-- VOTER VIEW -->
      <div v-if="currentUser.role === 'voter'" class="voter-view">
        <!-- Vorschlag einreichen -->
        <div class="form-container">
          <h2>Neuen Vorschlag einreichen</h2>
          
          <div class="form-group">
            <label>Titel deines Vorschlags</label>
            <input 
              v-model="title" 
              type="text" 
              placeholder="z.B. Längere Mittagspause"
            />
          </div>

          <div class="form-group">
            <label>Beschreibung</label>
            <textarea 
              v-model="description" 
              rows="4"
              placeholder="Erkläre deine Idee genauer..."
            ></textarea>
          </div>

          <div class="checkbox-group">
            <input 
              v-model="isAnonymous" 
              type="checkbox" 
              id="anonymous"
            />
            <label for="anonymous">Vorschlag anonym einreichen</label>
          </div>

          <div v-if="!isAnonymous" class="form-group">
            <label>Dein Name</label>
            <input 
              v-model="authorName" 
              type="text" 
              placeholder="Max Mustermann"
            />
          </div>

          <button @click="submitProposal" class="submit-btn">
            📤 Vorschlag einreichen
          </button>
        </div>

        <!-- Veröffentlichte Vorschläge zum Abstimmen -->
        <div class="proposals-container">
<h2>Vorschläge zur Abstimmung ({{ proposals.filter(p => p.status === 'entscheidung_pending').length }})</h2>

          
          <div v-if="proposals.length === 0" class="no-proposals">
            Noch keine veröffentlichten Vorschläge.
          </div>

          <div v-else class="proposals-list">
            <div 
v-for="proposal in proposals.filter(p => p.status === 'entscheidung_pending')"
              :key="proposal.id"
              class="proposal-card"
              :class="'status-' + proposal.status"
            >
              <div class="proposal-header">
                <h3>{{ proposal.title }}</h3>
                <span class="status-badge" :class="'badge-' + proposal.status">
                  {{ getStatusText(proposal.status) }}
                </span>
              </div>
              <p class="proposal-description">{{ proposal.description }}</p>
              <!--Phase + Relevanz (Fortschritt) -->
<div class="proposal-indicators">
  <div class="phase-pill" :class="'phase-' + getPhaseKey(proposal)">
    {{ getPhaseText(proposal) }}
  </div>

  <div class="relevance">
    <div class="relevance-top">
      <span class="relevance-label">
        Relevanz: {{ Math.min(proposal.votes, RELEVANCE_THRESHOLD) }}/{{ RELEVANCE_THRESHOLD }}
      </span>
      <span v-if="proposal.votes >= RELEVANCE_THRESHOLD" class="relevance-ok">
        ✓ Relevanz erreicht
      </span>
      <span v-else class="relevance-missing">
        Noch {{ RELEVANCE_THRESHOLD - proposal.votes }} Stimme(n)
      </span>
    </div>

    <div class="progress">
      <div
        class="progress-bar"
        :style="{ width: Math.min((proposal.votes / RELEVANCE_THRESHOLD) * 100, 100) + '%' }"
      ></div>
    </div>
  </div>
</div>

              <div class="proposal-footer">
                <span>von: <strong>{{ proposal.author }}</strong></span>
                <span class="votes">👍 {{ proposal.votes }} Stimmen</span>
              </div>
              
              <button 
v-if="proposal.status === 'entscheidung_pending' && !hasVoted(proposal)"
                @click="vote(proposal.id)"
                class="vote-btn"
              >
                👍 Abstimmen
              </button>
              <span v-else-if="hasVoted(proposal)" class="voted-text">
                ✓ Du hast abgestimmt
              </span>

              <!-- Commitment Button -->
<div class="commitment">
  <button
v-if="['entscheidung_pending', 'in_bearbeitung', 'angenommen'].includes(proposal.status) && !hasCommitted(proposal)"
    @click="commit(proposal.id)"
    class="commit-btn"
  >
    🤝 Ich helfe mit
  </button>

  <span v-else-if="hasCommitted(proposal)" class="committed-text">
    ✓ Du hilfst mit
  </span>

  <div class="commitment-count">
    🤝 {{ proposal.commitments?.length || 0 }} Person(en) helfen mit
  </div>
</div>

            </div>
          </div>
        </div>
      </div>

      <!-- VALIDATOR VIEW -->
      <div v-if="currentUser.role === 'validator'" class="validator-view">
        <div class="proposals-container">
          <h2>Vorschläge zur Validierung</h2>
          
          <div v-if="proposals.length === 0" class="no-proposals">
            Keine Vorschläge zur Validierung vorhanden.
          </div>

          <div v-else class="proposals-list">
            <div 
              v-for="proposal in proposals" 
              :key="proposal.id"
              class="proposal-card admin-card"
            >
              <div class="proposal-header">
                <h3>{{ proposal.title }}</h3>
                <span class="status-badge" :class="'badge-' + proposal.status">
                  {{ getStatusText(proposal.status) }}
                </span>
              </div>
              <p class="proposal-description">{{ proposal.description }}</p>
              <!--Phase + Relevanz (Fortschritt) -->
<div class="proposal-indicators">
  <div class="phase-pill" :class="'phase-' + getPhaseKey(proposal)">
    {{ getPhaseText(proposal) }}
  </div>

  <div class="relevance">
    <div class="relevance-top">
      <span class="relevance-label">
        Relevanz: {{ Math.min(proposal.votes, RELEVANCE_THRESHOLD) }}/{{ RELEVANCE_THRESHOLD }}
      </span>
      <span v-if="proposal.votes >= RELEVANCE_THRESHOLD" class="relevance-ok">
        ✓ Relevanz erreicht
      </span>
      <span v-else class="relevance-missing">
        Noch {{ RELEVANCE_THRESHOLD - proposal.votes }} Stimme(n)
      </span>
    </div>

    <div class="progress">
      <div
        class="progress-bar"
        :style="{ width: Math.min((proposal.votes / RELEVANCE_THRESHOLD) * 100, 100) + '%' }"
      ></div>
    </div>
  </div>
</div>

              <div class="proposal-meta">
                <span>von: <strong>{{ proposal.author }}</strong></span>
                <span>Eingereicht: {{ formatDate(proposal.timestamp) }}</span>
                <span>👍 {{ proposal.votes }} Stimmen</span>
              </div>
              
              <div v-if="proposal.status === 'validierung'" class="admin-actions">
                <button @click="approveProposal(proposal.id)" class="approve-btn">
                  ✓ Freigeben
                </button>
                <button @click="rejectProposal(proposal.id)" class="reject-btn">
                  ✗ Ablehnen
                </button>
              </div>

              <div v-if="proposal.rejectionReason" class="rejection-reason">
                Grund: {{ proposal.rejectionReason }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ADMIN VIEW -->
      <div v-if="currentUser.role === 'admin'" class="admin-view">
        <div class="proposals-container">
          <h2>Alle Vorschläge verwalten</h2>
          
          <!-- Filter Tabs -->
          <div class="filter-tabs">
            <button 
              @click="filterStatus = 'all'"
              :class="{ active: filterStatus === 'all' }"
            >
              Alle ({{ proposals.length }})
            </button>
            <button 
              @click="filterStatus = 'rechtliche_prüfung'"
              :class="{ active: filterStatus === 'rechtliche_prüfung' }"
            >
              Rechtliche Prüfung ({{ countByStatus('rechtliche_prüfung') }})
            </button>
            <button 
              @click="filterStatus = 'entscheidung_pending'"
              :class="{ active: filterStatus === 'entscheidung_pending' }"
            >
              Entscheidung ({{ proposals.filter(p => p.status === 'entscheidung_pending' && p.votes >= RELEVANCE_THRESHOLD).length }})
            </button>
          </div>

          <div v-if="filteredProposals.length === 0" class="no-proposals">
            Keine Vorschläge in dieser Kategorie.
          </div>

          <div v-else class="proposals-list">
            <div 
              v-for="proposal in filteredProposals" 
              :key="proposal.id"
              class="proposal-card admin-card"
            >
              <div class="proposal-header">
                <h3>{{ proposal.title }}</h3>
                <span class="status-badge" :class="'badge-' + proposal.status">
                  {{ getStatusText(proposal.status) }}
                </span>
              </div>
              <p class="proposal-description">{{ proposal.description }}</p>
              <!-- Phase + Relevanz (Fortschritt) -->
<div class="proposal-indicators">
  <div class="phase-pill" :class="'phase-' + getPhaseKey(proposal)">
    {{ getPhaseText(proposal) }}
  </div>

  <div class="relevance">
    <div class="relevance-top">
      <span class="relevance-label">
        Relevanz: {{ Math.min(proposal.votes, RELEVANCE_THRESHOLD) }}/{{ RELEVANCE_THRESHOLD }}
      </span>
      <span v-if="proposal.votes >= RELEVANCE_THRESHOLD" class="relevance-ok">
        ✓ Relevanz erreicht
      </span>
      <span v-else class="relevance-missing">
        Noch {{ RELEVANCE_THRESHOLD - proposal.votes }} Stimme(n)
      </span>
    </div>

    <div class="progress">
      <div
        class="progress-bar"
        :style="{ width: Math.min((proposal.votes / RELEVANCE_THRESHOLD) * 100, 100) + '%' }"
      ></div>
    </div>
  </div>
</div>

<div class="proposal-meta">
  <span>von: <strong>{{ proposal.author }}</strong></span>
  <span>Eingereicht: {{ formatDate(proposal.timestamp) }}</span>
  <span>👍 {{ proposal.votes }} Stimmen (Schwelle: {{ RELEVANCE_THRESHOLD }})</span>
  <span>🤝 {{ proposal.commitments?.length || 0 }} helfen mit</span>
</div>



              <!-- Rechtliche Prüfung -->
              <div v-if="proposal.status === 'rechtliche_prüfung'" class="admin-actions">
                <h4>Rechtliche Validierung</h4>
                <button @click="legalCheck(proposal.id, true)" class="approve-btn">
                  ✓ Rechtlich OK
                </button>
                <button @click="legalCheck(proposal.id, false)" class="reject-btn">
                  ✗ Rechtlich abgelehnt
                </button>
              </div>

              <!-- Schulleitung Entscheidung -->
              <div v-if="proposal.status === 'entscheidung_pending'" class="admin-actions">
                <h4>Entscheidung der Schulleitung</h4>
                <button @click="makeDecision(proposal.id, 'angenommen')" class="approve-btn">
                  ✓ Angenommen
                </button>
                <button @click="makeDecision(proposal.id, 'in_bearbeitung')" class="processing-btn">
                  ⏳ In Bearbeitung
                </button>
                <button @click="makeDecision(proposal.id, 'abgelehnt')" class="reject-btn">
                  ✗ Abgelehnt
                </button>
              </div>

              <!-- Vorschlag löschen -->
              <button @click="deleteProposal(proposal.id)" class="delete-btn">
                🗑️ Löschen
              </button>

              <div v-if="proposal.rejectionReason" class="rejection-reason">
                Grund: {{ proposal.rejectionReason }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';
const RELEVANCE_THRESHOLD = 5;

export default {
  name: 'App',
  data() {
    return {
      currentUser: null,
      loginUsername: '',
      loginPassword: '',
      loginError: '',
      
      proposals: [],
      title: '',
      description: '',
      isAnonymous: false,
      authorName: '',
      showSuccess: false,
      successMessage: '',
      
      filterStatus: 'all',
      RELEVANCE_THRESHOLD
    };
  },
computed: {
  filteredProposals() {
    if (this.filterStatus === 'all') {
      return this.proposals;
    }

    // Entscheidung: nur anzeigen wenn Status passt UND Relevanzschwelle erreicht
    if (this.filterStatus === 'entscheidung_pending') {
      return this.proposals.filter(
        p => p.status === 'entscheidung_pending' && p.votes >= this.RELEVANCE_THRESHOLD
      );
    }

    // Standardfilter für andere Tabs
    return this.proposals.filter(p => p.status === this.filterStatus);
  }
},


mounted() {
  const saved = sessionStorage.getItem('session_user');
  if (!saved) return;

  try {
    this.currentUser = JSON.parse(saved);
    this.loadProposals();
  } catch (e) {
    sessionStorage.removeItem('session_user');
  }
},





  methods: {
  async commit(proposalId) {
  try {
    await axios.post(`${API_URL}/proposals/${proposalId}/commit`, {
      username: this.currentUser.username
    });
    this.showSuccessMessage('Danke für deine Unterstützung!');
    this.loadProposals();
  } catch (error) {
    alert(error.response?.data?.message || 'Commitment nicht möglich');
  }
},

hasCommitted(proposal) {
  return proposal.commitments?.includes(this.currentUser.username);
},

    async login() {
      try {
        const response = await axios.post(`${API_URL}/login`, {
          username: this.loginUsername,
          password: this.loginPassword
        });
        
if (response.data.success) {
  this.currentUser = response.data.user;

  // LOGIN PERSISTENT SPEICHERN
// genau 1 Session speichern (überschreibt immer)
sessionStorage.setItem('session_user', JSON.stringify(this.currentUser));




  this.loginError = '';
  this.loadProposals();
}

      } catch (error) {
        this.loginError = 'Ungültige Anmeldedaten';
      }
    },
    
logout() {
sessionStorage.removeItem('session_user');

  this.currentUser = null;
  this.proposals = [];
  this.loginUsername = '';
  this.loginPassword = '';
  this.loginError = '';
},



    
    async loadProposals() {
      try {
        const response = await axios.get(`${API_URL}/proposals`, {
          params: { role: this.currentUser.role }
        });
        this.proposals = response.data;
      } catch (error) {
        console.error('Fehler beim Laden:', error);
      }
    },
    
    async submitProposal() {
      if (!this.title.trim() || !this.description.trim()) {
        alert('Bitte fülle Titel und Beschreibung aus!');
        return;
      }
      
      if (!this.isAnonymous && !this.authorName.trim()) {
        alert('Bitte gib deinen Namen ein oder wähle anonym!');
        return;
      }

      try {
        await axios.post(`${API_URL}/proposals`, {
          title: this.title,
          description: this.description,
          author: this.authorName,
          isAnonymous: this.isAnonymous,
          submitter: this.currentUser.username
        });

        this.title = '';
        this.description = '';
        this.authorName = '';
        this.isAnonymous = false;
        
        this.showSuccessMessage('Vorschlag erfolgreich eingereicht!');
        this.loadProposals();
      } catch (error) {
        alert('Fehler beim Einreichen');
      }
    },
    
    async vote(proposalId) {
      try {
        await axios.post(`${API_URL}/proposals/${proposalId}/vote`, {
          username: this.currentUser.username
        });
        this.showSuccessMessage('Deine Stimme wurde gezählt!');
        this.loadProposals();
      } catch (error) {
        alert(error.response?.data?.message || 'Fehler beim Abstimmen');
      }
    },
    
    async approveProposal(proposalId) {
      try {
        await axios.post(`${API_URL}/proposals/${proposalId}/approve`);
        this.showSuccessMessage('Vorschlag freigegeben!');
        this.loadProposals();
      } catch (error) {
        alert('Fehler beim Freigeben');
      }
    },
    
    async rejectProposal(proposalId) {
      const reason = prompt('Grund für Ablehnung:');
      if (!reason) return;
      
      try {
        await axios.post(`${API_URL}/proposals/${proposalId}/reject`, { reason });
        this.showSuccessMessage('Vorschlag abgelehnt');
        this.loadProposals();
      } catch (error) {
        alert('Fehler beim Ablehnen');
      }
    },
    
    async legalCheck(proposalId, approved) {
      try {
        await axios.post(`${API_URL}/proposals/${proposalId}/legal-check`, { approved });
        this.showSuccessMessage(approved ? 'Rechtlich freigegeben' : 'Rechtlich abgelehnt');
        this.loadProposals();
      } catch (error) {
        alert('Fehler bei rechtlicher Prüfung');
      }
    },
    
    async makeDecision(proposalId, decision) {
      try {
        await axios.post(`${API_URL}/proposals/${proposalId}/decision`, { decision });
        this.showSuccessMessage(`Entscheidung: ${decision}`);
        this.loadProposals();
      } catch (error) {
        alert('Fehler bei Entscheidung');
      }
    },
    
    async deleteProposal(proposalId) {
      if (!confirm('Vorschlag wirklich löschen?')) return;
      
      try {
        await axios.delete(`${API_URL}/proposals/${proposalId}`);
        this.showSuccessMessage('Vorschlag gelöscht');
        this.loadProposals();
      } catch (error) {
        alert('Fehler beim Löschen');
      }
    },
    
    hasVoted(proposal) {
      return proposal.voters?.includes(this.currentUser.username);
    },
    
    countByStatus(status) {
      return this.proposals.filter(p => p.status === status).length;
    },
    
    showSuccessMessage(message) {
      this.successMessage = message;
      this.showSuccess = true;
      setTimeout(() => {
        this.showSuccess = false;
      }, 3000);
    },
    
    getRoleName(role) {
      const roles = {
        voter: 'Schüler',
        admin: 'Schulleitung',
        validator: 'Validator'
      };
      return roles[role] || role;
    },
    
    getStatusText(status) {
      const statuses = {
        validierung: 'In Validierung',
        veröffentlicht: 'Veröffentlicht',
        rechtliche_prüfung: 'Rechtliche Prüfung',
        entscheidung_pending: 'Entscheidung ausstehend',
        angenommen: 'Angenommen',
        in_bearbeitung: 'In Bearbeitung',
        abgelehnt: 'Abgelehnt',
        abgelehnt_filter: 'Abgelehnt (Filter)',
        abgelehnt_validator: 'Abgelehnt (Validator)',
        abgelehnt_rechtlich: 'Abgelehnt (Rechtlich)'
      };
      return statuses[status] || status;
    },
    
    getPhaseKey(proposal) {
  // Für CSS-Klassen (kurz & stabil)
  if (proposal.status === 'validierung') return 'validation';
  if (proposal.status === 'rechtliche_prüfung') return 'legal';
  if (proposal.status === 'entscheidung_pending') return 'voting';
  if (proposal.status === 'in_bearbeitung') return 'implementation';
  if (proposal.status === 'angenommen') return 'accepted';
  if (proposal.status?.startsWith('abgelehnt')) return 'rejected';
  return 'other';
},

getPhaseText(proposal) {
  // Klar lesbarer Text
  if (proposal.status === 'validierung') return '🧾 In Validierung';
  if (proposal.status === 'rechtliche_prüfung') return '⚖️ Rechtliche Prüfung';
  if (proposal.status === 'entscheidung_pending') return '🗳️ Im Voting';
  if (proposal.status === 'in_bearbeitung') return '🛠️ In Umsetzung';
  if (proposal.status === 'angenommen') return '✅ Angenommen';
  if (proposal.status?.startsWith('abgelehnt')) return '❌ Abgelehnt';
  return 'Unbekannt';
},


    formatDate(timestamp) {
      return new Date(timestamp).toLocaleString('de-DE');
    }
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
background: linear-gradient(135deg, #120ee9ff 0%, #0065fdff 100%);
  min-height: 100vh;
}

.app {
  min-height: 100vh;
}
.commitment {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}


.commit-btn {
  padding: 10px 16.5px;        /* gleiche Breite */
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1em;            /*gleiche Schriftgrösse */
}


.commit-btn:hover {
  background: #059669;
}

.committed-text {
  color: #059669;
  font-weight: 600;
}

.commitment-count {
  font-size: 0.9em;
  color: #374151;
}

/* LOGIN */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 100%;
}

.login-box h1 {
  text-align: center;
  color: #333;
  margin-bottom: 10px;
}

.login-box > p {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
}

.login-btn {
  width: 100%;
  padding: 15px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.login-btn:hover {
  background: #5568d3;
}

.error-message {
  background: #f44336;
  color: white;
  padding: 12px;
  border-radius: 6px;
  margin-top: 15px;
  text-align: center;
}

.test-accounts {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
  font-size: 0.9em;
}

.test-accounts p {
  margin: 5px 0;
  color: #666;
}

.test-accounts code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}

/* HEADER */
header {
  background: rgba(255, 255, 255, 0.95);
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

header h1 {
  color: #333;
  font-size: 2em;
  margin-bottom: 5px;
}

header p {
  color: #666;
  font-size: 0.9em;
}

.logout-btn {
  padding: 10px 20px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s;
}

.logout-btn:hover {
  background: #d32f2f;
}

/* MAIN CONTENT */
.voter-view,
.validator-view,
.admin-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.success-message {
  background: #4caf50;
  color: white;
  padding: 15px;
  border-radius: 8px;
  margin: 0 20px 20px 20px;
  text-align: center;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.form-container,
.proposals-container {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
  font-family: inherit;
}

.checkbox-group {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.submit-btn {
  width: 100%;
  padding: 15px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.submit-btn:hover {
  background: #5568d3;
}
.title-with-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-with-logo h1 {
  margin: 0;
}

.logo {
  height: 60px;
  width: auto;
}

/* FILTER TABS */
.filter-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-tabs button {
  padding: 10px 20px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
}

.filter-tabs button.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

/* PROPOSALS */
.no-proposals {
  text-align: center;
  color: #999;
  padding: 40px;
}

.proposal-indicators {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.phase-pill {
  width: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.85em;
  font-weight: 700;
  border: 1px solid rgba(0,0,0,0.08);
}

/* Phase colors */
.phase-validation { background: #fff3cd; color: #856404; }
.phase-legal { background: #ffe0b2; color: #7a4a00; }
.phase-voting { background: #dbeafe; color: #1e40af; }
.phase-implementation { background: #e0f2fe; color: #075985; }
.phase-accepted { background: #dcfce7; color: #166534; }
.phase-rejected { background: #fee2e2; color: #991b1b; }
.phase-other { background: #f3f4f6; color: #374151; }

.relevance {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.relevance-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.relevance-label {
  font-weight: 700;
  color: #333;
  font-size: 0.9em;
}

.relevance-ok {
  font-weight: 700;
  color: #166534;
  font-size: 0.9em;
}

.relevance-missing {
  font-weight: 600;
  color: #7a4a00;
  font-size: 0.9em;
}

.progress {
  height: 10px;
  background: #eee;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,0.06);
}

.progress-bar {
  height: 100%;
  background: #667eea;
  border-radius: 999px;
  transition: width 0.25s ease;
}

.proposals-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.proposal-card {
  border: 2px solid #e0e0e0;
  padding: 20px;
  border-radius: 8px;
  transition: all 0.3s;
}

.proposal-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.admin-card {
  background: #fafafa;
}

.proposal-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 10px;
  gap: 15px;
}

.proposal-header h3 {
  color: #333;
  font-size: 1.2em;
  flex: 1;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8em;
  font-weight: 600;
  white-space: nowrap;
}

.badge-validierung { background: #ffc107; color: #000; }
.badge-veröffentlicht { background: #4caf50; color: white; }
.badge-rechtliche_prüfung { background: #ff9800; color: white; }
.badge-entscheidung_pending { background: #2196f3; color: white; }
.badge-angenommen { background: #4caf50; color: white; }
.badge-in_bearbeitung { background: #03a9f4; color: white; }
.badge-abgelehnt { background: #f44336; color: white; }
.badge-abgelehnt_filter { background: #9e9e9e; color: white; }
.badge-abgelehnt_validator { background: #9e9e9e; color: white; }
.badge-abgelehnt_rechtlich { background: #9e9e9e; color: white; }

.proposal-description {
  color: #666;
  margin-bottom: 15px;
  line-height: 1.5;
}

.proposal-footer,
.proposal-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
  color: #666;
  gap: 15px;
  flex-wrap: wrap;
}

.proposal-meta {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.votes {
  font-weight: 600;
  color: #667eea;
}

/* BUTTONS */
.vote-btn {
  margin-top: 15px;
  padding: 10px 20px;
  background: #4eb910ff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s;
  font-size: 1em;
}

.vote-btn:hover {
  background: #45a049;
}

.voted-text {
  margin-top: 15px;
  display: inline-block;
  color: #4caf50;
  font-weight: 600;
}

.admin-actions {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.admin-actions h4 {
  width: 100%;
  margin-bottom: 10px;
  color: #333;
}

.approve-btn {
  padding: 10px 20px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s;
}

.approve-btn:hover {
  background: #45a049;
}

.reject-btn {
  padding: 10px 20px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s;
}

.reject-btn:hover {
  background: #d32f2f;
}

.processing-btn {
  padding: 10px 20px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s;
}

.processing-btn:hover {
  background: #1976d2;
}

.delete-btn {
  margin-top: 10px;
  padding: 8px 16px;
  background: #9e9e9e;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background 0.3s;
}

.delete-btn:hover {
  background: #757575;
}

.rejection-reason {
  margin-top: 10px;
  padding: 10px;
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  border-radius: 4px;
  font-size: 0.9em;
  color: #856404;
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .proposal-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .proposal-footer,
  .proposal-meta {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .admin-actions {
    flex-direction: column;
  }
  
  .admin-actions button {
    width: 100%;
  }
}
</style>