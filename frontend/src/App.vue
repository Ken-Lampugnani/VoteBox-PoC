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
    <div v-else :class="['theme-' + currentUser.role]">
      <header>
        <div class="header-content">
          <div>
            <div class="title-with-logo">
              <img src="./votebox_logo.png" alt="Logo" class="logo" />
              <h1>VoteBox</h1>
            </div>
            <p>Angemeldet als: <strong>{{ currentUser.username }}</strong>
              <span class="role-badge">{{ getRoleName(currentUser.role) }}</span>
            </p>
          </div>
          <button @click="logout" class="logout-btn">Abmelden</button>
        </div>
      </header>

      <!-- NAV TABS -->
      <div class="main-nav">
        <div class="main-nav-inner">
          <button
            @click="activeTab = 'main'"
            :class="{ 'nav-tab': true, 'nav-tab-active': activeTab === 'main' }"
          >
            <span class="nav-icon">{{ currentUser.role === 'voter' ? '🗳️' : currentUser.role === 'validator' ? '🧾' : '⚙️' }}</span>
            {{ currentUser.role === 'voter' ? 'Abstimmen' : currentUser.role === 'validator' ? 'Validierung' : 'Verwaltung' }}
          </button>
          <button
            @click="activeTab = 'overview'"
            :class="{ 'nav-tab': true, 'nav-tab-active': activeTab === 'overview' }"
          >
            <span class="nav-icon">📊</span>
            Übersicht
          </button>
          <button
            v-if="currentUser.role !== 'validator'"
            @click="activeTab = 'chats'"
            :class="{ 'nav-tab': true, 'nav-tab-active': activeTab === 'chats' }"
          >
            <span class="nav-icon">💬</span>
            Chats
            <span v-if="unreadCount > 0" class="nav-badge">{{ unreadCount }}</span>
          </button>
        </div>
      </div>

      <div v-if="showSuccess" class="success-message">
        ✓ {{ successMessage }}
      </div>

      <!-- VOTER VIEW -->
      <div v-if="currentUser.role === 'voter' && activeTab === 'main'" class="voter-view">
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

              <!-- COMMITMENT: nur anzeigen wenn vom Validator aktiviert -->
              <div v-if="proposal.commitmentEnabled" class="commitment">
                <button
                  v-if="['entscheidung_pending', 'angenommen'].includes(proposal.status) && !hasCommitted(proposal)"
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

        <!-- Abgelehnte Vorschläge mit Begründung -->
        <div class="proposals-container" v-if="proposals.filter(p => p.status === 'abgelehnt').length > 0">
          <h2>❌ Abgelehnte Vorschläge ({{ proposals.filter(p => p.status === 'abgelehnt').length }})</h2>
          <div class="proposals-list">
            <div
              v-for="proposal in proposals.filter(p => p.status === 'abgelehnt')"
              :key="proposal.id"
              class="proposal-card proposal-card-rejected"
            >
              <div class="proposal-header">
                <h3>{{ proposal.title }}</h3>
                <span class="status-badge badge-abgelehnt">Abgelehnt</span>
              </div>
              <p class="proposal-description">{{ proposal.description }}</p>
              <div class="proposal-footer">
                <span>von: <strong>{{ proposal.author }}</strong></span>
                <span class="votes">👍 {{ proposal.votes }} Stimmen</span>
              </div>
              <div class="rejection-feedback">
                <span class="rejection-feedback-label">📋 Begründung der Schulleitung</span>
                <p v-if="proposal.rejectionReason" class="rejection-feedback-text">
                  {{ proposal.rejectionReason }}
                </p>
                <p v-else class="rejection-feedback-none">
                  Keine Begründung angegeben.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- VALIDATOR VIEW -->
      <div v-if="currentUser.role === 'validator' && activeTab === 'main'" class="validator-view">
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
              
              <!-- VALIDATOR AKTIONEN mit Commitment-Checkbox -->
              <div v-if="proposal.status === 'validierung'" class="admin-actions">
                <!-- NEU: Commitment-Option vor der Freigabe -->
                <div class="commitment-toggle">
                  <label class="commitment-toggle-label">
                    <input
                      type="checkbox"
                      v-model="commitmentToggles[proposal.id]"
                    />
                    <span>🤝 Mithelfen-Funktion für diesen Vorschlag aktivieren</span>
                  </label>
                  <p class="commitment-toggle-hint">
                    Aktiviere dies, wenn Schüler*innen sich bei der Umsetzung einbringen sollen.
                  </p>
                </div>

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
      <div v-if="currentUser.role === 'admin' && activeTab === 'main'" class="admin-view">
        <div class="proposals-container">
          <h2>Alle Vorschläge verwalten</h2>
          
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
                <!-- Zeigt dem Admin ob Commitment aktiv ist -->
                <span v-if="proposal.commitmentEnabled" class="commitment-active-badge">🤝 Mithelfen aktiv</span>
                <span v-else class="commitment-inactive-badge">🤝 Mithelfen inaktiv</span>
              </div>

              <div v-if="proposal.status === 'rechtliche_prüfung'" class="admin-actions">
                <h4>Rechtliche Validierung</h4>
                <button @click="legalCheck(proposal.id, true)" class="approve-btn">
                  ✓ Rechtlich OK
                </button>
                <div class="reject-with-reason">
                  <textarea
                    v-model="legalReasons[proposal.id]"
                    class="rejection-input"
                    placeholder="Begründung für rechtliche Ablehnung (optional)..."
                    rows="2"
                  ></textarea>
                  <button @click="legalCheck(proposal.id, false)" class="reject-btn">
                    ✗ Rechtlich abgelehnt
                  </button>
                </div>
              </div>

              <div v-if="proposal.status === 'entscheidung_pending'" class="admin-actions">
                <h4>Entscheidung der Schulleitung</h4>
                <button @click="makeDecision(proposal.id, 'angenommen')" class="approve-btn">
                  ✓ Angenommen
                </button>
                <div class="reject-with-reason">
                  <textarea
                    v-model="rejectionReasons[proposal.id]"
                    class="rejection-input"
                    placeholder="Begründung für Ablehnung (optional)..."
                    rows="2"
                  ></textarea>
                  <button @click="makeDecision(proposal.id, 'abgelehnt')" class="reject-btn">
                    ✗ Abgelehnt
                  </button>
                </div>
              </div>

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

      <!-- ÜBERSICHT TAB (alle Rollen) -->
      <div v-if="activeTab === 'overview'" class="overview-view">
        <div class="overview-header-bar">
          <h2>Übersicht aller Vorschläge</h2>
          <p class="overview-subtitle">Statusübersicht aller eingereichten Ideen</p>
        </div>

        <!-- Stat-Karten -->
        <div class="overview-stats">
          <div class="stat-card stat-total">
            <div class="stat-number">{{ overviewProposals.length }}</div>
            <div class="stat-label">Gesamt</div>
          </div>
          <div class="stat-card stat-accepted">
            <div class="stat-number">{{ overviewProposals.filter(p => p.status === 'angenommen').length }}</div>
            <div class="stat-label">Angenommen</div>
          </div>
          <div class="stat-card stat-voting">
            <div class="stat-number">{{ overviewProposals.filter(p => p.status === 'entscheidung_pending').length }}</div>
            <div class="stat-label">Im Voting</div>
          </div>
          <div class="stat-card stat-rejected">
            <div class="stat-number">{{ overviewProposals.filter(p => p.status?.startsWith('abgelehnt')).length }}</div>
            <div class="stat-label">Abgelehnt</div>
          </div>
        </div>

        <!-- Gruppen: Zeile 1 (3 Karten) -->
        <div class="overview-groups overview-groups-top">
          <div
            v-for="group in overviewGroups.slice(0, 3)"
            :key="group.key"
            class="overview-group"
            :class="group.colorClass"
          >
            <div class="group-header">
              <span class="group-icon">{{ group.icon }}</span>
              <span class="group-title">{{ group.label }}</span>
              <span class="group-count">{{ group.items.length }}</span>
            </div>
            <div v-if="group.items.length === 0" class="group-empty">
              Noch keine Vorschläge
            </div>
            <div v-else class="group-items">
              <div v-for="proposal in group.items" :key="proposal.id" class="overview-item">
                <div class="overview-item-top">
                  <span class="overview-item-title">{{ proposal.title }}</span>
                  <span class="overview-item-votes">👍 {{ proposal.votes }}</span>
                </div>
                <div class="overview-item-meta">
                  <span>{{ proposal.author }}</span>
                  <span>{{ formatDate(proposal.timestamp) }}</span>
                </div>
                <div v-if="proposal.rejectionReason" class="overview-item-reason">
                  Grund: {{ proposal.rejectionReason }}
                </div>
                <div v-if="proposal.commitments?.length > 0" class="overview-item-commits">
                  🤝 {{ proposal.commitments.length }} helfen mit
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Gruppen: Zeile 2 (2 Karten zentriert) -->
        <div class="overview-groups overview-groups-bottom">
          <div
            v-for="group in overviewGroups.slice(3)"
            :key="group.key"
            class="overview-group"
            :class="group.colorClass"
          >
            <div class="group-header">
              <span class="group-icon">{{ group.icon }}</span>
              <span class="group-title">{{ group.label }}</span>
              <span class="group-count">{{ group.items.length }}</span>
            </div>
            <div v-if="group.items.length === 0" class="group-empty">
              Noch keine Vorschläge
            </div>
            <div v-else class="group-items">
              <div v-for="proposal in group.items" :key="proposal.id" class="overview-item">
                <div class="overview-item-top">
                  <span class="overview-item-title">{{ proposal.title }}</span>
                  <span class="overview-item-votes">👍 {{ proposal.votes }}</span>
                </div>
                <div class="overview-item-meta">
                  <span>{{ proposal.author }}</span>
                  <span>{{ formatDate(proposal.timestamp) }}</span>
                </div>
                <div v-if="proposal.rejectionReason" class="overview-item-reason">
                  Grund: {{ proposal.rejectionReason }}
                </div>
                <div v-if="proposal.commitments?.length > 0" class="overview-item-commits">
                  🤝 {{ proposal.commitments.length }} helfen mit
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CHAT TAB -->
      <div v-if="activeTab === 'chats'" class="chat-view">
        <div class="overview-header-bar">
          <h2>💬 Gruppen-Chats</h2>
          <p class="overview-subtitle">
            {{ currentUser.role === 'admin' ? 'Kommuniziere mit Committed-Votern pro Vorschlag' : 'Chats für Vorschläge, bei denen du mithelfen möchtest' }}
          </p>
        </div>

        <!-- Keine Chats verfügbar -->
        <div v-if="chatProposals.length === 0" class="chat-empty-state">
          <div class="chat-empty-icon">💬</div>
          <p v-if="currentUser.role === 'admin'">Noch keine Vorschläge mit Commitments vorhanden.</p>
          <p v-else>Du hast dich noch bei keinem Vorschlag als Mithelfer eingetragen.</p>
        </div>

        <!-- Chat-Liste -->
        <div v-else class="chat-list">
          <div
            v-for="proposal in chatProposals"
            :key="proposal.id"
            class="chat-panel"
          >
            <!-- Chat-Header -->
            <div class="chat-panel-header" @click="toggleChat(proposal.id)">
              <div class="chat-panel-info">
                <span class="chat-panel-title">{{ proposal.title }}</span>
                <span class="chat-panel-meta">
                  🤝 {{ proposal.commitments.length }} Mithelfer
                  · 💬 {{ (chatMessages[proposal.id] || []).length }} Nachrichten
                </span>
              </div>
              <div class="chat-panel-right">
                <span class="status-badge" :class="'badge-' + proposal.status">
                  {{ getStatusText(proposal.status) }}
                </span>
                <span class="chat-chevron">{{ openChats[proposal.id] ? '▲' : '▼' }}</span>
              </div>
            </div>

            <!-- Chat-Body -->
            <div v-if="openChats[proposal.id]" class="chat-body">

              <!-- Admin-Hinweis wenn noch kein Start -->
              <div
                v-if="currentUser.role !== 'admin' && !(chatMessages[proposal.id] || []).some(m => m.role === 'admin')"
                class="chat-waiting"
              >
                ⏳ Warte bis der Admin den Chat startet...
              </div>

              <!-- Nachrichten -->
              <div class="chat-messages" :id="'chat-' + proposal.id">
                <div v-if="(chatMessages[proposal.id] || []).length === 0" class="chat-no-messages">
                  <span v-if="currentUser.role === 'admin'">Starte die Unterhaltung mit einer Nachricht.</span>
                </div>
                <div
                  v-for="msg in (chatMessages[proposal.id] || [])"
                  :key="msg.id"
                  class="chat-message"
                  :class="msg.username === currentUser.username ? 'chat-message-own' : 'chat-message-other'"
                >
                  <div class="chat-message-meta">
                    <span class="chat-message-author" :class="msg.role === 'admin' ? 'author-admin' : 'author-voter'">
                      {{ msg.role === 'admin' ? '⚙️ ' + msg.username : msg.username }}
                    </span>
                    <span class="chat-message-time">{{ formatTime(msg.timestamp) }}</span>
                  </div>
                  <div class="chat-message-bubble">{{ msg.text }}</div>
                </div>
              </div>

              <!-- Eingabe -->
              <div
                v-if="currentUser.role === 'admin' || (chatMessages[proposal.id] || []).some(m => m.role === 'admin')"
                class="chat-input-row"
              >
                <input
                  v-model="chatInputs[proposal.id]"
                  type="text"
                  class="chat-input"
                  :placeholder="currentUser.role === 'admin' ? 'Nachricht an alle Mithelfer...' : 'Antwort schreiben...'"
                  @keyup.enter="sendMessage(proposal.id)"
                />
                <button @click="sendMessage(proposal.id)" class="chat-send-btn">
                  Senden ➤
                </button>
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
const RELEVANCE_THRESHOLD = 2;

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
      activeTab: 'main',
      overviewProposals: [],
      rejectionReasons: {},
      legalReasons: {},
      // NEU: Speichert den Commitment-Toggle-Status des Validators pro Vorschlag
      commitmentToggles: {},
      chatMessages: {},
      chatInputs: {},
      openChats: {},
      unreadCount: 0,
      pollInterval: null,
      RELEVANCE_THRESHOLD
    };
  },
  computed: {
    filteredProposals() {
      if (this.filterStatus === 'all') {
        return this.proposals;
      }
      if (this.filterStatus === 'entscheidung_pending') {
        return this.proposals.filter(
          p => p.status === 'entscheidung_pending' && p.votes >= this.RELEVANCE_THRESHOLD
        );
      }
      return this.proposals.filter(p => p.status === this.filterStatus);
    },
    chatProposals() {
      if (!this.currentUser) return [];
      if (this.currentUser.role === 'validator') return [];
      const all = this.overviewProposals;
      if (this.currentUser.role === 'admin') {
        return all.filter(p => p.commitments && p.commitments.length > 0);
      }
      return all.filter(p => p.commitments && p.commitments.includes(this.currentUser.username));
    },
    overviewGroups() {
      const all = this.overviewProposals;
      return [
        {
          key: 'validierung',
          label: 'In Validierung',
          icon: '🧾',
          colorClass: 'group-validation',
          items: all.filter(p => p.status === 'validierung')
        },
        {
          key: 'rechtliche_prüfung',
          label: 'Rechtliche Prüfung',
          icon: '⚖️',
          colorClass: 'group-legal',
          items: all.filter(p => p.status === 'rechtliche_prüfung')
        },
        {
          key: 'entscheidung_pending',
          label: 'Im Voting',
          icon: '🗳️',
          colorClass: 'group-voting',
          items: all.filter(p => p.status === 'entscheidung_pending')
        },
        {
          key: 'angenommen',
          label: 'Angenommen',
          icon: '✅',
          colorClass: 'group-accepted',
          items: all.filter(p => p.status === 'angenommen')
        },
        {
          key: 'abgelehnt',
          label: 'Abgelehnt',
          icon: '❌',
          colorClass: 'group-rejected',
          items: all.filter(p => p.status?.startsWith('abgelehnt'))
        }
      ];
    }
  },

  watch: {
    activeTab(newTab) {
      if (newTab === 'overview') {
        this.loadOverview();
      }
      if (newTab === 'chats') {
        this.loadOverview().then(() => this.loadAllChats());
      }
    }
  },

  mounted() {
    const saved = sessionStorage.getItem('session_user');
    if (!saved) return;
    try {
      this.currentUser = JSON.parse(saved);
      this.loadProposals();
      this.startPolling();
    } catch (e) {
      sessionStorage.removeItem('session_user');
    }
  },

  beforeUnmount() {
    this.stopPolling();
  },

  methods: {
    async loadAllChats() {
      for (const proposal of this.chatProposals) {
        await this.loadChat(proposal.id);
      }
    },

    async loadChat(proposalId) {
      try {
        const res = await axios.get(`${API_URL}/proposals/${proposalId}/messages`, {
          params: { username: this.currentUser.username, role: this.currentUser.role }
        });
        this.chatMessages = { ...this.chatMessages, [proposalId]: res.data };
        this.$nextTick(() => this.scrollToBottom(proposalId));
      } catch (e) {
        // kein Zugriff oder Fehler — ignorieren
      }
    },

    async sendMessage(proposalId) {
      const text = (this.chatInputs[proposalId] || '').trim();
      if (!text) return;
      try {
        await axios.post(`${API_URL}/proposals/${proposalId}/messages`, {
          username: this.currentUser.username,
          role: this.currentUser.role,
          text
        });
        this.chatInputs = { ...this.chatInputs, [proposalId]: '' };
        await this.loadChat(proposalId);
      } catch (e) {
        alert(e.response?.data?.message || 'Fehler beim Senden');
      }
    },

    toggleChat(proposalId) {
      const isOpen = this.openChats[proposalId];
      this.openChats = { ...this.openChats, [proposalId]: !isOpen };
      if (!isOpen) {
        this.loadChat(proposalId);
      }
    },

    scrollToBottom(proposalId) {
      const el = document.getElementById('chat-' + proposalId);
      if (el) el.scrollTop = el.scrollHeight;
    },

    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    },

    async loadOverview() {
      try {
        const response = await axios.get(`${API_URL}/proposals/overview`);
        this.overviewProposals = response.data;
      } catch (error) {
        console.error('Fehler beim Laden der Übersicht:', error);
      }
    },

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
          sessionStorage.setItem('session_user', JSON.stringify(this.currentUser));
          this.loginError = '';
          this.loadProposals();
        }
} catch (error) {
  if (!error.response) {
    this.loginError = 'Server nicht erreichbar.';
  } else {
    this.loginError = 'Ungültige Anmeldedaten';
  }
}
    },
    
    logout() {
      this.stopPolling();
      sessionStorage.removeItem('session_user');
      this.currentUser = null;
      this.proposals = [];
      this.loginUsername = '';
      this.loginPassword = '';
      this.loginError = '';
    },

    startPolling() {
      this.stopPolling();
      this.pollInterval = setInterval(() => {
        this.loadProposals();
        if (this.activeTab === 'overview') this.loadOverview();
        if (this.activeTab === 'chats') this.loadOverview().then(() => this.loadAllChats());
      }, 3000);
    },

    stopPolling() {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
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
    
    // NEU: Sendet commitmentEnabled aus dem Toggle-Status des Validators mit
    async approveProposal(proposalId) {
      try {
        const commitmentEnabled = this.commitmentToggles[proposalId] === true;
        await axios.post(`${API_URL}/proposals/${proposalId}/approve`, { commitmentEnabled });
        this.showSuccessMessage(
          commitmentEnabled
            ? 'Vorschlag freigegeben (Mithelfen aktiviert)'
            : 'Vorschlag freigegeben'
        );
        this.loadProposals();
      } catch (error) {
        alert('Fehler beim Freigeben');
      }
    },
    
    async rejectProposal(proposalId) {
      try {
        await axios.post(`${API_URL}/proposals/${proposalId}/reject`, {});
        this.showSuccessMessage('Vorschlag abgelehnt');
        this.loadProposals();
      } catch (error) {
        alert('Fehler beim Ablehnen');
      }
    },
    
    async legalCheck(proposalId, approved) {
      try {
        const reason = this.legalReasons[proposalId] || null;
        await axios.post(`${API_URL}/proposals/${proposalId}/legal-check`, { approved, reason });
        this.showSuccessMessage(approved ? 'Rechtlich freigegeben' : 'Rechtlich abgelehnt');
        if (!approved) delete this.legalReasons[proposalId];
        this.loadProposals();
      } catch (error) {
        alert('Fehler bei rechtlicher Prüfung');
      }
    },
    
    async makeDecision(proposalId, decision) {
      try {
        const reason = this.rejectionReasons[proposalId] || null;
        await axios.post(`${API_URL}/proposals/${proposalId}/decision`, { decision, reason });
        this.showSuccessMessage(decision === 'angenommen' ? '✓ Vorschlag angenommen!' : '✗ Vorschlag abgelehnt');
        delete this.rejectionReasons[proposalId];
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
      setTimeout(() => { this.showSuccess = false; }, 3000);
    },
    
    getRoleName(role) {
      const roles = { voter: 'Schüler', admin: 'Schulleitung', validator: 'Validator' };
      return roles[role] || role;
    },
    
    getStatusText(status) {
      const statuses = {
        validierung: 'In Validierung',
        veröffentlicht: 'Veröffentlicht',
        rechtliche_prüfung: 'Rechtliche Prüfung',
        entscheidung_pending: 'Entscheidung ausstehend',
        angenommen: 'Angenommen',
        abgelehnt: 'Abgelehnt',
        abgelehnt_filter: 'Abgelehnt (Filter)',
        abgelehnt_validator: 'Abgelehnt (Validator)',
        abgelehnt_rechtlich: 'Abgelehnt (Rechtlich)'
      };
      return statuses[status] || status;
    },
    
    getPhaseKey(proposal) {
      if (proposal.status === 'validierung') return 'validation';
      if (proposal.status === 'rechtliche_prüfung') return 'legal';
      if (proposal.status === 'entscheidung_pending') return 'voting';
      if (proposal.status === 'angenommen') return 'accepted';
      if (proposal.status?.startsWith('abgelehnt')) return 'rejected';
      return 'other';
    },

    getPhaseText(proposal) {
      if (proposal.status === 'validierung') return '🧾 In Validierung';
      if (proposal.status === 'rechtliche_prüfung') return '⚖️ Rechtliche Prüfung';
      if (proposal.status === 'entscheidung_pending') return '🗳️ Im Voting';
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
/* ── VoteBox Farbpalette ───────────────────────────── */
:root {
  /* Primär Voter: Blauviolett */
  --vb-primary-50:  #EEEDFE;
  --vb-primary-100: #CECBF6;
  --vb-primary-200: #AFA9EC;
  --vb-primary-400: #7F77DD;
  --vb-primary-600: #534AB7;
  --vb-primary-800: #3C3489;
  --vb-primary-900: #26215C;

  /* Akzent: Türkis (Erfolg, Validator) */
  --vb-teal-50:  #E1F5EE;
  --vb-teal-100: #9FE1CB;
  --vb-teal-200: #5DCAA5;
  --vb-teal-400: #1D9E75;
  --vb-teal-600: #0F6E56;

  /* Ausstehend: Amber */
  --vb-amber-50:  #FAEEDA;
  --vb-amber-100: #FAC775;
  --vb-amber-400: #EF9F27;
  --vb-amber-800: #854F0B;

  /* Ablehnung: Coral */
  --vb-coral-50:  #FAECE7;
  --vb-coral-100: #F5C4B3;
  --vb-coral-400: #D85A30;
  --vb-coral-800: #712B13;

  /* Neutral */
  --vb-gray-50:  #F1EFE8;
  --vb-gray-100: #D3D1C7;
  --vb-gray-400: #888780;
  --vb-gray-600: #5F5E5A;
}

/* ── Rollen-Themes ─────────────────────────────────── */

/* VOTER – Blauviolett */
.theme-voter header {
  background: var(--vb-primary-900);
  border-bottom: 4px solid var(--vb-primary-400);
  box-shadow: 0 2px 12px rgba(38,33,92,0.35);
}
.theme-voter header h1,
.theme-voter header p,
.theme-voter header strong {
  color: white;
}
.theme-voter .logout-btn {
  background: var(--vb-primary-400);
}
.theme-voter .logout-btn:hover {
  background: var(--vb-primary-200);
  color: var(--vb-primary-900);
}
.theme-voter .role-badge {
  background: var(--vb-primary-100);
  color: var(--vb-primary-900);
}
.theme-voter .main-nav {
  background: var(--vb-primary-800);
  border-bottom: 1px solid rgba(255,255,255,0.12);
}
.theme-voter .nav-tab-active {
  border-bottom-color: var(--vb-primary-200) !important;
}

/* VALIDATOR – Amber/Gold */
.theme-validator header {
  background: #5a3a00;
  border-bottom: 4px solid var(--vb-amber-400);
  box-shadow: 0 2px 12px rgba(90,58,0,0.4);
}
.theme-validator header h1,
.theme-validator header p,
.theme-validator header strong {
  color: white;
}
.theme-validator .logout-btn {
  background: var(--vb-amber-400);
  color: #5a3a00;
}
.theme-validator .logout-btn:hover {
  background: var(--vb-amber-100);
}
.theme-validator .role-badge {
  background: var(--vb-amber-100);
  color: #5a3a00;
}
.theme-validator .main-nav {
  background: #7a5000;
  border-bottom: 1px solid rgba(255,255,255,0.12);
}
.theme-validator .nav-tab-active {
  border-bottom-color: var(--vb-amber-100) !important;
}

/* ADMIN – Teal/Grün */
.theme-admin header {
  background: #0a3d2e;
  border-bottom: 4px solid var(--vb-teal-400);
  box-shadow: 0 2px 12px rgba(10,61,46,0.4);
}
.theme-admin header h1,
.theme-admin header p,
.theme-admin header strong {
  color: white;
}
.theme-admin .logout-btn {
  background: var(--vb-teal-400);
}
.theme-admin .logout-btn:hover {
  background: var(--vb-teal-100);
  color: #0a3d2e;
}
.theme-admin .role-badge {
  background: var(--vb-teal-100);
  color: #0a3d2e;
}
.theme-admin .main-nav {
  background: #0f5540;
  border-bottom: 1px solid rgba(255,255,255,0.12);
}
.theme-admin .nav-tab-active {
  border-bottom-color: var(--vb-teal-200) !important;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, var(--vb-primary-900) 0%, var(--vb-primary-600) 100%);
  min-height: 100vh;
}

.app {
  min-height: 100vh;
}

/* ── COMMITMENT ────────────────────────────────────── */
.commitment {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.commit-btn {
  padding: 10px 16.5px;
  background: var(--vb-teal-400);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1em;
}

.commit-btn:hover {
  background: var(--vb-teal-600);
}

.committed-text {
  color: var(--vb-teal-600);
  font-weight: 600;
}

.commitment-count {
  font-size: 0.9em;
  color: #374151;
}

/* NEU: Commitment-Toggle im Validator-View */
.commitment-toggle {
  width: 100%;
  margin-bottom: 12px;
  padding: 14px 16px;
  background: var(--vb-teal-50);
  border: 1.5px solid var(--vb-teal-100);
  border-radius: 8px;
}

.commitment-toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  color: var(--vb-teal-600);
  cursor: pointer;
  font-size: 0.97em;
}

.commitment-toggle-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--vb-teal-400);
  cursor: pointer;
  flex-shrink: 0;
}

.commitment-toggle-hint {
  margin-top: 6px;
  margin-left: 28px;
  font-size: 0.83em;
  color: var(--vb-teal-600);
  opacity: 0.8;
}

/* NEU: Badges für Commitment-Status im Admin-View */
.commitment-active-badge {
  padding: 2px 10px;
  background: var(--vb-teal-50);
  color: var(--vb-teal-600);
  border: 1px solid var(--vb-teal-100);
  border-radius: 999px;
  font-size: 0.82em;
  font-weight: 600;
}

.commitment-inactive-badge {
  padding: 2px 10px;
  background: var(--vb-gray-50);
  color: var(--vb-gray-400);
  border: 1px solid var(--vb-gray-100);
  border-radius: 999px;
  font-size: 0.82em;
  font-weight: 600;
}

/* ── LOGIN ─────────────────────────────────────────── */
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
  box-shadow: 0 8px 32px rgba(38, 33, 92, 0.25);
  max-width: 400px;
  width: 100%;
  border-top: 4px solid var(--vb-primary-400);
}

.login-box h1 {
  text-align: center;
  color: var(--vb-primary-900);
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
  background: var(--vb-primary-400);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.login-btn:hover {
  background: var(--vb-primary-600);
}

.error-message {
  background: var(--vb-coral-400);
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
  background: var(--vb-primary-50);
  color: var(--vb-primary-800);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}

/* ── HEADER ────────────────────────────────────────── */
header {
  background: rgba(255, 255, 255, 0.97);
  padding: 20px;
  box-shadow: 0 2px 8px rgba(38, 33, 92, 0.12);
  margin-bottom: 0;
  border-bottom: 3px solid var(--vb-primary-400);
}

.role-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.82em;
  font-weight: 600;
  vertical-align: middle;
  background: var(--vb-primary-100);
  color: var(--vb-primary-800);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

header h1 {
  color: var(--vb-primary-900);
  font-size: 2em;
  margin-bottom: 5px;
}

header p {
  color: rgba(255,255,255,0.75);
  font-size: 0.9em;
}

.logout-btn {
  padding: 10px 20px;
  background: var(--vb-coral-400);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s;
}

.logout-btn:hover {
  background: var(--vb-coral-800);
}

/* ── MAIN CONTENT ──────────────────────────────────── */
.voter-view,
.validator-view,
.admin-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.success-message {
  background: var(--vb-teal-400);
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
  box-shadow: 0 4px 16px rgba(38, 33, 92, 0.08);
  margin-bottom: 20px;
}

.form-container h2,
.proposals-container h2 {
  color: var(--vb-primary-900);
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--vb-primary-900);
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1.5px solid var(--vb-primary-100);
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--vb-primary-400);
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
  background: var(--vb-primary-400);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.submit-btn:hover {
  background: var(--vb-primary-600);
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

/* ── FILTER TABS ───────────────────────────────────── */
.filter-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-tabs button {
  padding: 10px 20px;
  background: var(--vb-primary-50);
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  color: var(--vb-primary-800);
  transition: all 0.3s;
}

.filter-tabs button.active {
  background: var(--vb-primary-400);
  color: white;
  border-color: var(--vb-primary-400);
}

/* ── PROPOSALS ─────────────────────────────────────── */
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

.phase-validation    { background: var(--vb-amber-50);  color: var(--vb-amber-800); }
.phase-legal         { background: var(--vb-amber-100); color: var(--vb-amber-800); }
.phase-voting        { background: var(--vb-primary-50); color: var(--vb-primary-800); }
.phase-implementation{ background: var(--vb-teal-50);   color: var(--vb-teal-600); }
.phase-accepted      { background: var(--vb-teal-50);   color: var(--vb-teal-600); }
.phase-rejected      { background: var(--vb-coral-50);  color: var(--vb-coral-800); }
.phase-other         { background: var(--vb-gray-50);   color: var(--vb-gray-600); }

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
  color: var(--vb-teal-600);
  font-size: 0.9em;
}

.relevance-missing {
  font-weight: 600;
  color: var(--vb-amber-800);
  font-size: 0.9em;
}

.progress {
  height: 10px;
  background: var(--vb-primary-50);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--vb-primary-100);
}

.progress-bar {
  height: 100%;
  background: var(--vb-primary-400);
  border-radius: 999px;
  transition: width 0.25s ease;
}

.proposals-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.proposal-card {
  border: 2px solid var(--vb-primary-100);
  padding: 20px;
  border-radius: 8px;
  transition: all 0.3s;
}

.proposal-card:hover {
  box-shadow: 0 4px 16px rgba(127, 119, 221, 0.18);
  border-color: var(--vb-primary-200);
}

.admin-card {
  background: var(--vb-primary-50);
}

.proposal-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 10px;
  gap: 15px;
}

.proposal-header h3 {
  color: var(--vb-primary-900);
  font-size: 1.2em;
  flex: 1;
}

/* ── STATUS BADGES ─────────────────────────────────── */
.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8em;
  font-weight: 600;
  white-space: nowrap;
}

.badge-validierung         { background: var(--vb-amber-100);  color: var(--vb-amber-800); }
.badge-veröffentlicht      { background: var(--vb-teal-100);   color: var(--vb-teal-600); }
.badge-rechtliche_prüfung  { background: var(--vb-amber-100);  color: var(--vb-amber-800); }
.badge-entscheidung_pending{ background: var(--vb-primary-100);color: var(--vb-primary-800); }
.badge-angenommen          { background: var(--vb-teal-100);   color: var(--vb-teal-600); }
.badge-abgelehnt           { background: var(--vb-coral-100);  color: var(--vb-coral-800); }
.badge-abgelehnt_filter    { background: var(--vb-gray-100);   color: var(--vb-gray-600); }
.badge-abgelehnt_validator { background: var(--vb-gray-100);   color: var(--vb-gray-600); }
.badge-abgelehnt_rechtlich { background: var(--vb-gray-100);   color: var(--vb-gray-600); }

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
  border-bottom: 1px solid var(--vb-primary-100);
}

.votes {
  font-weight: 600;
  color: var(--vb-primary-600);
}

/* ── BUTTONS ───────────────────────────────────────── */
.vote-btn {
  margin-top: 15px;
  padding: 10px 20px;
  background: var(--vb-teal-400);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s;
  font-size: 1em;
}

.vote-btn:hover {
  background: var(--vb-teal-600);
}

.voted-text {
  margin-top: 15px;
  display: inline-block;
  color: var(--vb-teal-600);
  font-weight: 600;
}

.admin-actions {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--vb-primary-100);
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.admin-actions h4 {
  width: 100%;
  margin-bottom: 10px;
  color: var(--vb-primary-900);
}

.approve-btn {
  padding: 10px 20px;
  background: var(--vb-teal-400);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s;
}

.approve-btn:hover {
  background: var(--vb-teal-600);
}

.reject-btn {
  padding: 10px 20px;
  background: var(--vb-coral-400);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s;
}

.reject-btn:hover {
  background: var(--vb-coral-800);
}

.delete-btn {
  margin-top: 10px;
  padding: 8px 16px;
  background: var(--vb-gray-400);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background 0.3s;
}

.delete-btn:hover {
  background: var(--vb-gray-600);
}

.rejection-reason {
  margin-top: 10px;
  padding: 10px;
  background: var(--vb-amber-50);
  border-left: 4px solid var(--vb-amber-400);
  border-radius: 4px;
  font-size: 0.9em;
  color: var(--vb-amber-800);
}

.reject-with-reason {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 220px;
}

.rejection-input {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid var(--vb-coral-100);
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  color: var(--vb-coral-800);
  background: var(--vb-coral-50);
  transition: border-color 0.2s;
}

.rejection-input:focus {
  outline: none;
  border-color: var(--vb-coral-400);
}

.rejection-input::placeholder {
  color: var(--vb-coral-400);
}

.proposal-card-rejected {
  border-color: var(--vb-coral-100) !important;
  background: var(--vb-coral-50);
}

.rejection-feedback {
  margin-top: 14px;
  padding: 14px 16px;
  background: white;
  border: 1.5px solid var(--vb-coral-100);
  border-left: 4px solid var(--vb-coral-400);
  border-radius: 8px;
}

.rejection-feedback-label {
  display: block;
  font-size: 0.82em;
  font-weight: 700;
  color: var(--vb-coral-800);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.rejection-feedback-text {
  font-size: 0.95em;
  color: var(--vb-coral-800);
  line-height: 1.5;
  margin: 0;
}

.rejection-feedback-none {
  font-size: 0.9em;
  color: var(--vb-gray-400);
  font-style: italic;
  margin: 0;
}

/* ── CHAT VIEW ─────────────────────────────────────── */
.chat-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px 40px;
}

.chat-empty-state {
  text-align: center;
  padding: 60px 20px;
  color: rgba(255,255,255,0.7);
}

.chat-empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-panel {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(38,33,92,0.1);
}

.chat-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  background: white;
  transition: background 0.15s;
  gap: 16px;
}

.chat-panel-header:hover {
  background: var(--vb-primary-50);
}

.chat-panel-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.chat-panel-title {
  font-weight: 600;
  color: var(--vb-primary-900);
  font-size: 1em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-panel-meta {
  font-size: 0.82em;
  color: var(--vb-gray-400);
}

.chat-panel-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.chat-chevron {
  font-size: 12px;
  color: var(--vb-gray-400);
}

.chat-body {
  border-top: 1px solid var(--vb-primary-100);
  display: flex;
  flex-direction: column;
}

.chat-waiting {
  padding: 20px;
  text-align: center;
  color: var(--vb-amber-800);
  background: var(--vb-amber-50);
  font-size: 0.9em;
}

.chat-messages {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--vb-gray-50);
}

.chat-no-messages {
  text-align: center;
  color: var(--vb-gray-400);
  font-size: 0.9em;
  padding: 20px 0;
  font-style: italic;
}

.chat-message {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 75%;
}

.chat-message-own {
  align-self: flex-end;
  align-items: flex-end;
}

.chat-message-other {
  align-self: flex-start;
  align-items: flex-start;
}

.chat-message-meta {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 0.78em;
}

.chat-message-author {
  font-weight: 600;
}

.author-admin {
  color: var(--vb-primary-600);
}

.author-voter {
  color: var(--vb-teal-600);
}

.chat-message-time {
  color: var(--vb-gray-400);
}

.chat-message-bubble {
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 0.92em;
  line-height: 1.45;
  word-break: break-word;
}

.chat-message-own .chat-message-bubble {
  background: var(--vb-primary-400);
  color: white;
  border-bottom-right-radius: 4px;
}

.chat-message-other .chat-message-bubble {
  background: white;
  color: var(--vb-primary-900);
  border: 1px solid var(--vb-primary-100);
  border-bottom-left-radius: 4px;
}

.chat-input-row {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  background: white;
  border-top: 1px solid var(--vb-primary-100);
}

.chat-input {
  flex: 1;
  padding: 10px 14px;
  border: 1.5px solid var(--vb-primary-100);
  border-radius: 24px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input:focus {
  border-color: var(--vb-primary-400);
}

.chat-send-btn {
  padding: 10px 18px;
  background: var(--vb-primary-400);
  color: white;
  border: none;
  border-radius: 24px;
  font-weight: 600;
  font-size: 0.88em;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.chat-send-btn:hover {
  background: var(--vb-primary-600);
}

.nav-badge {
  background: var(--vb-coral-400);
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  margin-left: 2px;
}

/* ── RESPONSIVE ────────────────────────────────────── */
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

/* ── NAV TABS ──────────────────────────────────────── */
.main-nav {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255,255,255,0.2);
  margin-bottom: 24px;
}

.main-nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  gap: 4px;
}

.nav-tab {
  padding: 14px 22px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: rgba(255,255,255,0.7);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-tab:hover {
  color: white;
  background: rgba(255,255,255,0.08);
}

.nav-tab-active {
  color: white !important;
  border-bottom-color: white;
  background: rgba(255,255,255,0.1);
}

.nav-icon {
  font-size: 16px;
}

/* ── OVERVIEW VIEW ─────────────────────────────────── */
.overview-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px 40px;
}

.overview-header-bar {
  margin-bottom: 24px;
}

.overview-header-bar h2 {
  color: white;
  font-size: 1.6em;
  margin-bottom: 4px;
}

.overview-subtitle {
  color: rgba(255,255,255,0.7);
  font-size: 0.95em;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 28px;
}

.stat-card {
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 12px;
  padding: 18px 16px;
  text-align: center;
}

.stat-number {
  font-size: 2.2em;
  font-weight: 700;
  color: white;
  line-height: 1;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 0.82em;
  color: rgba(255,255,255,0.75);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-accepted  { border-color: var(--vb-teal-200);    }
.stat-voting    { border-color: var(--vb-primary-100); }
.stat-rejected  { border-color: var(--vb-coral-200);   }

.overview-groups {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.overview-groups-top .overview-group {
  flex: 1;
}

.overview-groups-bottom {
  justify-content: center;
}

.overview-groups-bottom .overview-group {
  flex: 0 0 calc(33.333% - 8px);
}

.overview-group {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(38,33,92,0.1);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  font-weight: 600;
  font-size: 0.95em;
}

.group-icon { font-size: 18px; }

.group-title { flex: 1; }

.group-count {
  background: rgba(0,0,0,0.1);
  color: inherit;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.85em;
  font-weight: 700;
}

.group-accepted  .group-header { background: var(--vb-teal-50);    color: var(--vb-teal-600); }
.group-voting    .group-header { background: var(--vb-primary-100); color: var(--vb-primary-800); }
.group-legal     .group-header { background: var(--vb-amber-50);   color: var(--vb-amber-800); }
.group-validation .group-header { background: var(--vb-amber-50);  color: var(--vb-amber-800); }
.group-rejected  .group-header { background: var(--vb-coral-50);   color: var(--vb-coral-800); }

.group-empty {
  padding: 20px 18px;
  color: #aaa;
  font-size: 0.9em;
  text-align: center;
  font-style: italic;
}

.group-items {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.overview-item {
  padding: 14px 18px;
  border-bottom: 1px solid var(--vb-primary-50);
  transition: background 0.15s;
}

.overview-item:last-child {
  border-bottom: none;
}

.overview-item:hover {
  background: var(--vb-gray-50);
}

.overview-item-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 5px;
}

.overview-item-title {
  font-weight: 600;
  color: var(--vb-primary-900);
  font-size: 0.95em;
  flex: 1;
}

.overview-item-votes {
  font-size: 0.85em;
  color: var(--vb-primary-600);
  font-weight: 600;
  white-space: nowrap;
}

.overview-item-meta {
  display: flex;
  gap: 12px;
  font-size: 0.8em;
  color: #888;
}

.overview-item-reason {
  margin-top: 6px;
  font-size: 0.82em;
  color: var(--vb-amber-800);
  background: var(--vb-amber-50);
  padding: 4px 8px;
  border-radius: 4px;
}

.overview-item-commits {
  margin-top: 5px;
  font-size: 0.82em;
  color: var(--vb-teal-600);
  font-weight: 500;
}

@media (max-width: 768px) {
  .overview-groups {
    flex-direction: column;
  }
  .overview-groups-bottom .overview-group {
    flex: 1;
  }
  .overview-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>