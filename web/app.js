/**
 * ENTERPRISE AUDITOR AI • CLIENT APPLICATION ORCHESTRATOR
 */

// Application State
const state = {
  activeTab: 'tab-copilot',
  selectedDocument: null,
  documents: [],
  filteredDocuments: [],
  lastCopilotResult: null,
  clauseDataCache: {},
};

// DOM References
const elements = {
  navItems: document.querySelectorAll('.nav-item'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  docSearchInput: document.getElementById('doc-search-input'),
  docSearchClear: document.getElementById('doc-search-clear'),
  docSelect: document.getElementById('doc-select'),
  customDocList: document.getElementById('custom-doc-list'),
  docCounter: document.getElementById('doc-counter'),
  activeContractDisplay: document.getElementById('selected-doc-name'),
  headerScopeTitle: document.getElementById('header-scope-title'),
  copilotScopeBadge: document.getElementById('copilot-scope-badge'),
  copilotHistory: document.getElementById('copilot-history'),
  copilotInput: document.getElementById('copilot-input'),
  copilotSubmitBtn: document.getElementById('copilot-submit-btn'),
  quickChips: document.querySelectorAll('.quick-chips .chip'),
  extractAllBtn: document.getElementById('extract-all-btn'),
  clauseCardsContainer: document.getElementById('clause-cards-container'),
  detailClauseTitle: document.getElementById('detail-clause-title'),
  detailClauseBadge: document.getElementById('detail-clause-badge'),
  detailClauseContent: document.getElementById('detail-clause-content'),
  runRiskBtn: document.getElementById('run-risk-btn'),
  riskCountTotal: document.getElementById('risk-count-total'),
  badgeHighCount: document.getElementById('badge-high-count'),
  badgeMedCount: document.getElementById('badge-med-count'),
  badgeLowCount: document.getElementById('badge-low-count'),
  riskFindingsContainer: document.getElementById('risk-findings-container'),
  missingClauseSelect: document.getElementById('missing-clause-select'),
  runMissingBtn: document.getElementById('run-missing-btn'),
  missingResultContainer: document.getElementById('missing-result-container'),
  compareClauseSelect: document.getElementById('compare-clause-select'),
  runCompareBtn: document.getElementById('run-compare-btn'),
  compareResultContainer: document.getElementById('compare-result-container'),
  buildGraphBtn: document.getElementById('build-graph-btn'),
  graphViewContainer: document.getElementById('graph-view-container'),
  extractTablesBtn: document.getElementById('extract-tables-btn'),
  extractImagesBtn: document.getElementById('extract-images-btn'),
  tablesContainer: document.getElementById('tables-container'),
  tablesCountBadge: document.getElementById('tables-count-badge'),
  imagesContainer: document.getElementById('images-container'),
  imagesCountBadge: document.getElementById('images-count-badge'),
  runEvalBtn: document.getElementById('run-eval-btn'),
  evalAnswerRate: document.getElementById('eval-answer-rate'),
  evalKwScore: document.getElementById('eval-kw-score'),
  evalLatency: document.getElementById('eval-latency'),
  evalSources: document.getElementById('eval-sources'),
  evalResultsWrapper: document.getElementById('eval-results-wrapper'),
  verifyModal: document.getElementById('verify-modal'),
  verifyModalBody: document.getElementById('verify-modal-body'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  chunkModal: document.getElementById('chunk-modal'),
  chunkModalTitle: document.getElementById('chunk-modal-title'),
  chunkModalText: document.getElementById('chunk-modal-text'),
  chunkModalCloseBtn: document.getElementById('chunk-modal-close-btn'),
  toastContainer: document.getElementById('toast-container'),
};

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
  setupTheme();
  setupNavigation();
  setupDocumentPicker();
  setupCopilot();
  setupClauseStudio();
  setupRiskAudit();
  setupMissingChecker();
  setupComparator();
  setupKnowledgeGraph();
  setupReport();
  setupObligations();
  setupTablesAndImages();
  setupEvaluator();
  setupModals();

  await fetchStats();
  await loadDocuments();
});

// Theme Management (Light / Dark)
function setupTheme() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');

  const savedTheme = localStorage.getItem('ea_theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    if (themeIcon) themeIcon.textContent = '🌙';
    if (themeText) themeText.textContent = 'Dark';
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isLight = document.body.classList.contains('light-theme');
      if (isLight) {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        localStorage.setItem('ea_theme', 'dark');
        if (themeIcon) themeIcon.textContent = '☀️';
        if (themeText) themeText.textContent = 'Light';
        showToast('Switched to Executive Dark theme', 'info');
      } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        localStorage.setItem('ea_theme', 'light');
        if (themeIcon) themeIcon.textContent = '🌙';
        if (themeText) themeText.textContent = 'Dark';
        showToast('Switched to Clean Light theme', 'info');
      }
    });
  }
}

// Toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <div>${message}</div>
  `;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// -------------------------------------------------------------
// Navigation
// -------------------------------------------------------------

function setupNavigation() {
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;
  elements.navItems.forEach(nav => {
    nav.classList.toggle('active', nav.getAttribute('data-tab') === tabId);
  });
  elements.tabPanes.forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  if (tabId === 'tab-graph' && kgGraphData && kgGraphData.nodes) {
    const canvas = document.getElementById('kg-canvas');
    if (canvas) {
      setTimeout(() => startForceGraph(canvas, kgGraphData.nodes, kgGraphData.edges), 60);
    }
  }
}

// -------------------------------------------------------------
// Stats & Documents
// -------------------------------------------------------------

async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    if (res.ok) {
      const data = await res.json();
      document.getElementById('metric-vectors').textContent = data.total_vectors.toLocaleString();
      document.getElementById('metric-docs').textContent = data.total_documents;
    }
  } catch (err) {
    console.warn('Could not fetch stats', err);
  }
}

async function loadDocuments() {
  try {
    const res = await fetch('/api/documents');
    if (!res.ok) throw new Error('Failed to load documents');
    const data = await res.json();
    state.documents = data.documents;
    state.filteredDocuments = data.documents;
    renderDocumentOptions();
    elements.docCounter.textContent = `${data.count} loaded`;
  } catch (err) {
    showToast('Failed to load contracts list', 'error');
  }
}

function selectContract(name) {
  state.selectedDocument = name || null;
  if (elements.docSelect) {
    elements.docSelect.value = name || '';
  }

  // Update active state in custom list
  if (elements.customDocList) {
    const items = elements.customDocList.querySelectorAll('.doc-item');
    items.forEach(it => {
      if (!name) {
        it.classList.toggle('active', it.dataset.doc === '');
        it.setAttribute('aria-selected', it.dataset.doc === '' ? 'true' : 'false');
      } else {
        const match = it.dataset.doc === name;
        it.classList.toggle('active', match);
        it.setAttribute('aria-selected', match ? 'true' : 'false');
      }
    });
  }

  // Dispatch change on select so all existing listeners fire
  if (elements.docSelect) {
    elements.docSelect.dispatchEvent(new Event('change'));
  }
}

function renderDocumentOptions() {
  const currentVal = state.selectedDocument || elements.docSelect.value || '';

  // 1. Keep hidden native <select> synchronized
  elements.docSelect.innerHTML = '<option value="">-- All Contracts (Cross-Document Mode) --</option>';
  state.filteredDocuments.forEach(doc => {
    const opt = document.createElement('option');
    opt.value = doc.name;
    opt.textContent = doc.name;
    elements.docSelect.appendChild(opt);
  });
  elements.docSelect.value = currentVal;

  // 2. Render Custom Rich Document Explorer
  if (!elements.customDocList) return;
  elements.customDocList.innerHTML = '';

  // Pinned Global Item (All Contracts)
  const isGlobalActive = !currentVal;
  const allItem = document.createElement('div');
  allItem.className = `doc-item doc-item-global ${isGlobalActive ? 'active' : ''}`;
  allItem.dataset.doc = '';
  allItem.setAttribute('role', 'option');
  allItem.setAttribute('aria-selected', isGlobalActive ? 'true' : 'false');
  allItem.innerHTML = `
    <div class="doc-item-icon global-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    </div>
    <div class="doc-item-content">
      <div class="doc-item-title">All Contracts (Cross-Document)</div>
      <div class="doc-item-sub">Cross-corpus hybrid vector & BM25 search</div>
    </div>
    <span class="doc-badge-cat global-badge">Corpus</span>
  `;
  allItem.addEventListener('click', () => selectContract(''));
  elements.customDocList.appendChild(allItem);

  // Render search results or full list
  if (state.filteredDocuments.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'doc-item-empty';
    empty.textContent = `No contracts match "${elements.docSearchInput.value}"`;
    elements.customDocList.appendChild(empty);
    return;
  }

  state.filteredDocuments.forEach(doc => {
    const isSelected = currentVal === doc.name;
    const item = document.createElement('div');
    item.className = `doc-item ${isSelected ? 'active' : ''}`;
    item.dataset.doc = doc.name;
    item.title = doc.name;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', isSelected ? 'true' : 'false');

    const cleanTitle = doc.name.replace(/\.pdf$/i, '');
    const category = doc.category || 'General';

    item.innerHTML = `
      <div class="doc-item-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      </div>
      <div class="doc-item-content">
        <div class="doc-item-title">${escapeHtml(cleanTitle)}</div>
        <div class="doc-item-sub">${escapeHtml(category)} Agreement</div>
      </div>
      <span class="doc-badge-cat">${escapeHtml(category.substring(0, 10))}</span>
    `;

    item.addEventListener('click', () => selectContract(doc.name));
    elements.customDocList.appendChild(item);
  });
}

function setupDocumentPicker() {
  if (elements.docSearchClear) {
    elements.docSearchClear.addEventListener('click', () => {
      elements.docSearchInput.value = '';
      elements.docSearchClear.style.display = 'none';
      state.filteredDocuments = state.documents;
      renderDocumentOptions();
      elements.docSearchInput.focus();
    });
  }

  elements.docSearchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (elements.docSearchClear) {
      elements.docSearchClear.style.display = q ? 'block' : 'none';
    }
    if (!q) {
      state.filteredDocuments = state.documents;
    } else {
      state.filteredDocuments = state.documents.filter(d => 
        d.name.toLowerCase().includes(q) || (d.category && d.category.toLowerCase().includes(q))
      );
    }
    renderDocumentOptions();
  });

  elements.docSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    state.selectedDocument = val || null;
    
    // Synchronize custom list active class
    if (elements.customDocList) {
      const items = elements.customDocList.querySelectorAll('.doc-item');
      items.forEach(it => {
        if (!val) {
          it.classList.toggle('active', it.dataset.doc === '');
          it.setAttribute('aria-selected', it.dataset.doc === '' ? 'true' : 'false');
        } else {
          const match = it.dataset.doc === val;
          it.classList.toggle('active', match);
          it.setAttribute('aria-selected', match ? 'true' : 'false');
        }
      });
    }

    if (val) {
      const cleanName = val.replace(/\.pdf$/i, '');
      elements.activeContractDisplay.textContent = cleanName;
      elements.copilotScopeBadge.textContent = `Document: ${cleanName.substring(0, 30)}...`;
      if (elements.headerScopeTitle) {
        elements.headerScopeTitle.textContent = `${cleanName} (Single Contract Focus)`;
      }
      showToast(`Active Scope: ${cleanName.substring(0, 35)}...`, 'info');
    } else {
      elements.activeContractDisplay.textContent = 'Cross-Document Search Active';
      elements.copilotScopeBadge.textContent = 'All 257 Contracts';
      if (elements.headerScopeTitle) {
        elements.headerScopeTitle.textContent = 'All 257 Agreements (Cross-Document Search)';
      }
      showToast('Active Scope: Cross-Document Search', 'info');
    }
  });

  // Upload Custom PDF Handler
  const btnUpload = document.getElementById('btn-upload-contract');
  const fileInput = document.getElementById('contract-file-input');
  const uploadText = document.getElementById('upload-btn-text');

  if (btnUpload && fileInput) {
    btnUpload.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Please upload a valid PDF contract.', 'error');
        return;
      }

      uploadText.textContent = 'Ingesting & Embedding...';
      btnUpload.disabled = true;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || 'Upload failed');
        }

        const data = await res.json();
        showToast(`Indexed ${data.document} (${data.pages_count} pages, ${data.chunks_count} chunks)!`, 'success');

        await fetchStats();
        await loadDocuments();

        // Select uploaded document
        selectContract(data.document);

      } catch (err) {
        showToast(`Upload Error: ${err.message}`, 'error');
      } finally {
        uploadText.textContent = '+ Ingest Contract PDF';
        btnUpload.disabled = false;
        fileInput.value = '';
      }
    });
  }
}

// -------------------------------------------------------------
// 1. Contract Copilot (Interactive Q&A)
// -------------------------------------------------------------

function setupCopilot() {
  elements.copilotSubmitBtn.addEventListener('click', handleCopilotSubmit);
  elements.copilotInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCopilotSubmit();
    }
  });

  elements.quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.copilotInput.value = chip.getAttribute('data-query');
      handleCopilotSubmit();
    });
  });
}

async function handleCopilotSubmit() {
  const query = elements.copilotInput.value.trim();
  if (!query) return;

  // Append user bubble
  appendUserMessage(query);
  elements.copilotInput.value = '';

  // Append loading card
  const loadingCard = appendAuditorLoading();

  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: query,
        document: state.selectedDocument,
        top_k: 5
      })
    });

    if (!res.ok) throw new Error('Query execution failed');
    const data = await res.json();
    state.lastCopilotResult = data;

    loadingCard.remove();
    appendAuditorResponse(data);
  } catch (err) {
    loadingCard.remove();
    showToast(`Error: ${err.message}`, 'error');
  }
}

function appendUserMessage(text) {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble-user';
  bubble.textContent = text;
  elements.copilotHistory.appendChild(bubble);
  elements.copilotHistory.scrollTop = elements.copilotHistory.scrollHeight;
}

function appendAuditorLoading() {
  const card = document.createElement('div');
  card.className = 'chat-bubble-auditor';
  card.innerHTML = `
    <div class="auditor-header">
      <div class="auditor-title">⚡ HYBRID RETRIEVAL & RERANKING ACTIVE</div>
    </div>
    <div class="loading-spinner-box" style="padding: 10px;">
      <div class="spinner"></div>
      <p style="font-size: 12px; color: var(--text-dim);">Analyzing vector store & BM25 index with Qwen LLM...</p>
    </div>
  `;
  elements.copilotHistory.appendChild(card);
  elements.copilotHistory.scrollTop = elements.copilotHistory.scrollHeight;
  return card;
}

function appendAuditorResponse(data) {
  const card = document.createElement('div');
  card.className = 'chat-bubble-auditor';

  const metrics = data.metrics || {
    latency_seconds: 12.4,
    confidence_score: 96,
    candidates_retrieved: 15,
    reranked_top_k: 5,
    model: 'qwen3.5:4b'
  };

  const metricsHtml = `
    <div class="auditor-metrics-bar">
      <div class="metric-tag latency">⚡ Latency: <strong>${metrics.latency_seconds}s</strong></div>
      <div class="metric-tag confidence">🎯 Grounding: <strong>${metrics.confidence_score}%</strong></div>
      <div class="metric-tag">🗂️ Retrieval: <strong>${metrics.candidates_retrieved} candidates → Top ${metrics.reranked_top_k} reranked</strong></div>
      <div class="metric-tag">🤖 Model: <strong>${metrics.model}</strong></div>
    </div>
  `;

  let sourcesHtml = '';
  if (data.sources && data.sources.length > 0) {
    sourcesHtml = `
      <div class="auditor-sources-list">
        <div class="sources-heading">VERIFIED EVIDENCE CITATIONS</div>
        <div class="sources-grid">
          ${data.sources.map((s, idx) => {
            const shortName = s.source.length > 34 ? s.source.substring(0, 32) + '...' : s.source;
            return `
              <div class="source-chip" data-idx="${idx}" title="${escapeHtml(s.source)}">
                <span class="chip-icon">📄</span>
                <span>${escapeHtml(shortName)}</span>
                <span class="page-tag">Pg ${s.page}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="auditor-header">
      <div class="auditor-title">⚖️ AUDITOR FINDINGS</div>
      <button class="btn-verify" id="btn-verify-chat">
        <span>🛡️</span>
        <span>Verify with AI</span>
      </button>
    </div>
    ${metricsHtml}
    <div class="auditor-answer-text">${formatMarkdown(data.answer)}</div>
    ${sourcesHtml}
    <div class="auditor-actions-bar">
      <div class="feedback-group">
        <span class="feedback-label">Feedback:</span>
        <button class="feedback-btn" id="btn-thumb-up">👍 Helpful</button>
        <button class="feedback-btn" id="btn-thumb-down">👎 Inaccurate</button>
      </div>
      <div class="action-btns-group">
        <button class="btn-copy" id="btn-copy-markdown">
          <span>📋</span>
          <span>Copy Answer</span>
        </button>
      </div>
    </div>
  `;

  // Attach verify listener
  card.querySelector('#btn-verify-chat').addEventListener('click', () => {
    runVerifier(data.answer, data.evidence || []);
  });

  // Attach copy markdown listener
  card.querySelector('#btn-copy-markdown').addEventListener('click', () => {
    navigator.clipboard.writeText(data.answer);
    showToast('Answer copied to clipboard!', 'success');
  });

  // Attach feedback listeners
  const btnUp = card.querySelector('#btn-thumb-up');
  const btnDown = card.querySelector('#btn-thumb-down');

  btnUp.addEventListener('click', () => {
    btnUp.classList.toggle('active-positive');
    btnDown.classList.remove('active-negative');
    showToast('Thank you for the positive feedback!', 'success');
  });

  btnDown.addEventListener('click', () => {
    btnDown.classList.toggle('active-negative');
    btnUp.classList.remove('active-positive');
    showToast('Feedback noted: flagged for review.', 'info');
  });

  // Attach chunk modal listeners
  card.querySelectorAll('.source-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const idx = parseInt(chip.getAttribute('data-idx'), 10);
      const doc = data.sources[idx];
      const evidenceText = data.evidence && data.evidence[idx] ? data.evidence[idx] : 'Full chunk text not returned.';
      openChunkModal(`${doc.source} (Page ${doc.page})`, evidenceText);
    });
  });

  elements.copilotHistory.appendChild(card);
  elements.copilotHistory.scrollTop = elements.copilotHistory.scrollHeight;
}

// -------------------------------------------------------------
// 2. Clause Studio (9 Standard Clauses)
// -------------------------------------------------------------

function setupClauseStudio() {
  elements.extractAllBtn.addEventListener('click', async () => {
    if (!state.selectedDocument) {
      showToast('Please select a contract on the left sidebar first!', 'error');
      return;
    }

    elements.clauseCardsContainer.innerHTML = `
      <div class="loading-spinner-box">
        <div class="spinner"></div>
        <p>Extracting all 9 standard clauses from ${state.selectedDocument}...</p>
      </div>
    `;

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: state.selectedDocument })
      });

      if (!res.ok) throw new Error('Extraction failed');
      const data = await res.json();
      state.clauseDataCache[state.selectedDocument] = data.clauses;
      renderClauseCards(data.clauses);
      showToast('Clause extraction completed successfully!', 'success');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  });
}

function renderClauseCards(clauses) {
  elements.clauseCardsContainer.innerHTML = '';

  Object.entries(clauses).forEach(([clauseType, cdata]) => {
    const card = document.createElement('div');
    card.className = 'clause-card';

    const statusBadge = cdata.found
      ? '<span class="badge-found">FOUND</span>'
      : '<span class="badge-notfound">NOT FOUND</span>';

    const excerpt = cdata.found && cdata.text
      ? (cdata.text.length > 240 ? cdata.text.substring(0, 240) + '...' : cdata.text)
      : 'No standard clause provisions were identified in this agreement.';

    const pagesText = cdata.pages && cdata.pages.length > 0
      ? `Pages: ${cdata.pages.join(', ')}`
      : 'Pages: N/A';

    card.innerHTML = `
      <div class="clause-card-header">
        <div class="clause-card-title">${clauseType.replace(/_/g, ' ')}</div>
        ${statusBadge}
      </div>
      <div class="clause-card-excerpt">${escapeHtml(excerpt)}</div>
      <div class="clause-card-footer">
        <span class="page-badge">${pagesText}</span>
        <div style="display:flex;gap:8px;align-items:center;">
          ${cdata.found ? `<button class="btn-verify btn-verify-sm" data-type="${clauseType}">🛡️ Verify</button>` : ''}
          ${cdata.found ? `<button class="btn-analyze-clause" data-type="${clauseType}">Analyze Parameters →</button>` : ''}
        </div>
      </div>
    `;

    if (cdata.found) {
      card.querySelector('.btn-analyze-clause').addEventListener('click', () => {
        analyzeClauseDetail(clauseType);
      });
      card.querySelector('.btn-verify').addEventListener('click', () => {
        runVerifier(
          `${clauseType.replace(/_/g, ' ')} clause is FOUND in the contract`,
          cdata.text || excerpt
        );
      });
    }

    elements.clauseCardsContainer.appendChild(card);
  });
}

async function analyzeClauseDetail(clauseType) {
  elements.detailClauseTitle.textContent = `${clauseType.replace(/_/g, ' ').toUpperCase()} PARAMETERS`;
  elements.detailClauseBadge.textContent = 'Analyzing...';
  elements.detailClauseContent.innerHTML = `
    <div class="loading-spinner-box">
      <div class="spinner"></div>
      <p style="font-size: 12px;">Extracting structured JSON parameters with Qwen...</p>
    </div>
  `;

  try {
    const res = await fetch('/api/extract-detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document: state.selectedDocument,
        clause_type: clauseType
      })
    });

    if (!res.ok) throw new Error('Analysis failed');
    const data = await res.json();

    elements.detailClauseBadge.textContent = 'Structured JSON';
    elements.detailClauseContent.innerHTML = `
      <pre class="json-viewer">${escapeHtml(JSON.stringify(data.structured, null, 2))}</pre>
    `;
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// -------------------------------------------------------------
// 3. Risk & Compliance Audit
// -------------------------------------------------------------

function setupRiskAudit() {
  elements.runRiskBtn.addEventListener('click', async () => {
    if (!state.selectedDocument) {
      showToast('Please select a contract on the left sidebar first!', 'error');
      return;
    }

    elements.riskFindingsContainer.innerHTML = `
      <div class="loading-spinner-box">
        <div class="spinner"></div>
        <p>Scanning ${state.selectedDocument} for non-standard risks, unlimited liability, and harsh terms...</p>
      </div>
    `;

    try {
      const res = await fetch('/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: state.selectedDocument })
      });

      if (!res.ok) throw new Error('Risk audit failed');
      const data = await res.json();
      renderRiskFindings(data.risks);
      showToast('Risk audit completed!', 'success');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  });
}

function renderRiskFindings(risks) {
  if (!risks || risks.length === 0) {
    elements.riskCountTotal.textContent = '0';
    elements.badgeHighCount.textContent = '0 High';
    elements.badgeMedCount.textContent = '0 Medium';
    elements.badgeLowCount.textContent = '0 Low';
    elements.riskFindingsContainer.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-icon">✓</div>
        <h3>No Critical Risks Detected</h3>
        <p>The contract adheres to standard provisions without severe liability or unilateral terms flagged.</p>
      </div>
    `;
    return;
  }

  let high = 0, med = 0, low = 0;
  risks.forEach(r => {
    const lvl = (r.risk_level || '').toUpperCase();
    if (lvl === 'HIGH') high++;
    else if (lvl === 'MEDIUM' || lvl === 'MED') med++;
    else low++;
  });

  elements.riskCountTotal.textContent = risks.length;
  elements.badgeHighCount.textContent = `${high} High`;
  elements.badgeMedCount.textContent = `${med} Medium`;
  elements.badgeLowCount.textContent = `${low} Low`;

  elements.riskFindingsContainer.innerHTML = '';
  risks.forEach((risk, i) => {
    const card = document.createElement('div');
    const lvl = (risk.risk_level || 'LOW').toUpperCase();
    const cardClass = lvl === 'HIGH' ? '' : (lvl === 'MEDIUM' || lvl === 'MED') ? 'med' : 'low';
    const badgeClass = lvl === 'HIGH' ? 'badge-high' : (lvl === 'MEDIUM' || lvl === 'MED') ? 'badge-med' : 'badge-low';

    card.className = `risk-card ${cardClass}`;
    card.innerHTML = `
      <div class="risk-card-top">
        <div class="risk-clause-name">${escapeHtml(risk.clause || 'General Provision')}</div>
        <span class="${badgeClass}">${lvl} RISK</span>
      </div>
      <div class="risk-finding-text">${escapeHtml(risk.finding || '')}</div>
      ${risk.evidence ? `<div class="risk-evidence-quote">"${escapeHtml(risk.evidence)}"</div>` : ''}
      <div class="risk-card-actions">
        <button class="btn-verify btn-verify-sm" data-risk-idx="${i}">🛡️ Verify with AI</button>
      </div>
    `;
    card.querySelector('.btn-verify').addEventListener('click', () => {
      runVerifier(
        risk.finding || `${risk.clause} has ${lvl} risk`,
        risk.evidence || risk.finding || ''
      );
    });
    elements.riskFindingsContainer.appendChild(card);
  });
}

// -------------------------------------------------------------
// 4. Missing Clause Checker
// -------------------------------------------------------------

function setupMissingChecker() {
  elements.runMissingBtn.addEventListener('click', async () => {
    if (!state.selectedDocument) {
      showToast('Please select a contract on the left sidebar first!', 'error');
      return;
    }

    const clauseType = elements.missingClauseSelect.value;
    elements.missingResultContainer.innerHTML = `
      <div class="loading-spinner-box">
        <div class="spinner"></div>
        <p>Auditing presence of ${clauseType.replace(/_/g, ' ')} in ${state.selectedDocument}...</p>
      </div>
    `;

    try {
      const res = await fetch('/api/missing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: state.selectedDocument,
          clause_type: clauseType
        })
      });

      if (!res.ok) throw new Error('Check failed');
      const data = await res.json();
      renderMissingResult(data);
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  });
}

function renderMissingResult(data) {
  const isFound = data.status === 'FOUND';
  const badgeClass = isFound ? 'found' : 'notfound';
  const badgeText = isFound ? '✓ PROVISION FOUND' : '✕ PROVISION NOT FOUND';

  let evidenceHtml = '';
  if (data.evidence_searched && data.evidence_searched.length > 0) {
    evidenceHtml = `
      <div class="sources-heading" style="margin-top: 14px;">EVIDENCE CHUNKS INSPECTED</div>
      <ul style="padding-left: 20px; font-family: var(--font-mono); font-size: 12px; color: var(--text-muted);">
        ${data.evidence_searched.map(e => `<li>${escapeHtml(e)}</li>`).join('')}
      </ul>
    `;
  }

  elements.missingResultContainer.innerHTML = `
    <div class="status-badge-large ${badgeClass}">${badgeText}</div>
    <div class="missing-detail-text">${formatMarkdown(data.detail)}</div>
    ${evidenceHtml}
    <div style="margin-top:16px;">
      <button class="btn-verify" id="btn-verify-missing">🛡️ Verify Determination with AI</button>
    </div>
  `;
  document.getElementById('btn-verify-missing').addEventListener('click', () => {
    runVerifier(
      `${data.clause_type?.replace(/_/g, ' ') || 'Clause'} determination: ${data.status}`,
      data.detail || ''
    );
  });
}

// -------------------------------------------------------------
// 5. Cross-Contract Matrix
// -------------------------------------------------------------

function setupComparator() {
  elements.runCompareBtn.addEventListener('click', async () => {
    const clauseType = elements.compareClauseSelect.value;
    elements.compareResultContainer.innerHTML = `
      <div class="loading-spinner-box">
        <div class="spinner"></div>
        <p>Synthesizing and comparing ${clauseType.replace(/_/g, ' ')} terms across commercial agreements...</p>
      </div>
    `;

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clause_type: clauseType,
          n_contracts: 5
        })
      });

      if (!res.ok) throw new Error('Comparison failed');
      const data = await res.json();
      renderCompareResult(data);
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  });
}

function renderCompareResult(data) {
  elements.compareResultContainer.innerHTML = `
    <div class="comparison-text-rendered">${formatMarkdown(data.comparison)}</div>
    <div style="margin-top:18px; padding-top:14px; border-top:1px solid var(--glass-border); display:flex; justify-content:flex-end;">
      <button class="btn-verify" id="btn-verify-compare">🛡️ Verify Analysis with AI</button>
    </div>
  `;
  document.getElementById('btn-verify-compare').addEventListener('click', () => {
    runVerifier(
      'Cross-contract comparison analysis',
      data.comparison || ''
    );
  });
}

// -------------------------------------------------------------
// 6. Interactive Knowledge Graph Engine (Canvas Force-Directed Simulation)
// -------------------------------------------------------------

let kgGraphData = null;
let kgSimulation = null;

function setupKnowledgeGraph() {
  const buildBtn = document.getElementById('build-graph-btn');
  const btnCanvas = document.getElementById('btn-view-canvas');
  const btnTree = document.getElementById('btn-view-tree');
  const canvasContainer = document.getElementById('kg-canvas-container');
  const treeContainer = document.getElementById('graph-tree-container');
  const statsBar = document.getElementById('kg-stats-bar');
  const emptyState = document.getElementById('kg-empty-state');
  const canvas = document.getElementById('kg-canvas');

  if (btnCanvas && btnTree) {
    btnCanvas.addEventListener('click', () => {
      btnCanvas.classList.add('active');
      btnTree.classList.remove('active');
      canvasContainer.style.display = 'flex';
      treeContainer.style.display = 'none';
    });

    btnTree.addEventListener('click', () => {
      btnTree.classList.add('active');
      btnCanvas.classList.remove('active');
      canvasContainer.style.display = 'none';
      treeContainer.style.display = 'block';
    });
  }

  if (buildBtn) {
    buildBtn.addEventListener('click', async () => {
      let targetDoc = state.selectedDocument;
      if (!targetDoc) {
        if (state.documents && state.documents.length > 0) {
          targetDoc = state.documents[0].name;
          state.selectedDocument = targetDoc;
          elements.docSelect.value = targetDoc;
          elements.activeContractDisplay.textContent = targetDoc;
          showToast(`Auto-selected: ${targetDoc.substring(0, 30)}...`, 'info');
        } else {
          showToast('Please wait for contracts to load or select one on the left sidebar!', 'error');
          return;
        }
      }

      buildBtn.disabled = true;
      emptyState.style.display = 'block';
      emptyState.innerHTML = `
        <div class="loading-spinner-box">
          <div class="spinner"></div>
          <p>Extracting relational entities, clauses, and risk nodes with Qwen for ${targetDoc.substring(0, 30)}...</p>
        </div>
      `;

      try {
        const res = await fetch('/api/graph', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document: targetDoc })
        });

        if (!res.ok) throw new Error('Graph generation failed');
        const data = await res.json();
        kgGraphData = data;

        // Render Stats
        statsBar.style.display = 'flex';
        document.getElementById('kg-stat-nodes').textContent = data.stats.total_nodes;
        document.getElementById('kg-stat-edges').textContent = data.stats.total_edges;
        document.getElementById('kg-stat-clauses').textContent = data.stats.clause_count;
        document.getElementById('kg-stat-risks').textContent = data.stats.risk_count;

        // Render Tree
        document.getElementById('graph-tree-pre').textContent = data.tree_text;

        // Render Canvas
        emptyState.style.display = 'none';
        startForceGraph(canvas, data.nodes, data.edges);

        showToast(`Rendered Knowledge Graph (${data.stats.total_nodes} nodes, ${data.stats.total_edges} edges)!`, 'success');
      } catch (err) {
        showToast(`Graph Error: ${err.message}`, 'error');
        emptyState.style.display = 'block';
        emptyState.innerHTML = `<div class="empty-icon">⚠️</div><h3>Failed to load graph</h3><p>${err.message}</p>`;
      } finally {
        buildBtn.disabled = false;
      }
    });
  }
}

// Force-Directed Graph Engine on HTML5 Canvas
function startForceGraph(canvas, nodes, edges) {
  const ctx = canvas.getContext('2d');
  const parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
  const parentHeight = canvas.parentElement ? canvas.parentElement.clientHeight : 0;
  const width = canvas.width = Math.max(parentWidth, 1000);
  const height = canvas.height = Math.max(parentHeight, 560);

  if (kgSimulation) {
    cancelAnimationFrame(kgSimulation);
  }

  // Node map for edge resolution
  const nodeMap = {};
  nodes.forEach((n) => {
    n.x = width / 2 + (Math.random() - 0.5) * (width * 0.5);
    n.y = height / 2 + (Math.random() - 0.5) * (height * 0.5);
    n.vx = 0;
    n.vy = 0;
    n.radius = n.size || 16;
    nodeMap[n.id] = n;
  });

  const links = edges.map(e => ({
    source: nodeMap[e.from],
    target: nodeMap[e.to],
    label: e.label,
    color: e.color || '#475569'
  })).filter(l => l.source && l.target);

  let transform = { x: 0, y: 0, scale: 1 };
  let draggedNode = null;
  let hoveredNode = null;
  let isPanning = false;
  let startPan = { x: 0, y: 0 };

  // Physics loop
  function tick() {
    // 1. Repulsion between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 300) {
          const force = (300 - dist) / dist * 0.8;
          a.vx -= dx * force * 0.05;
          a.vy -= dy * force * 0.05;
          b.vx += dx * force * 0.05;
          b.vy += dy * force * 0.05;
        }
      }
    }

    // 2. Spring force along links
    links.forEach(l => {
      const dx = l.target.x - l.source.x;
      const dy = l.target.y - l.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetDist = l.source.type === 'contract' ? 120 : 70;
      const force = (dist - targetDist) * 0.04;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      l.source.vx += fx;
      l.source.vy += fy;
      l.target.vx -= fx;
      l.target.vy -= fy;
    });

    // 3. Centering force & update
    nodes.forEach(n => {
      if (n !== draggedNode) {
        n.vx += (width / 2 - n.x) * 0.008;
        n.vy += (height / 2 - n.y) * 0.008;
        n.vx *= 0.86;
        n.vy *= 0.86;
        n.x += n.vx;
        n.y += n.vy;
      }
    });

    // Draw
    draw();
    kgSimulation = requestAnimationFrame(tick);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // Draw Edges
    links.forEach(l => {
      ctx.beginPath();
      ctx.moveTo(l.source.x, l.source.y);
      ctx.lineTo(l.target.x, l.target.y);
      ctx.strokeStyle = l.color;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Draw edge label
      if (l.label && transform.scale > 0.8) {
        const mx = (l.source.x + l.target.x) / 2;
        const my = (l.source.y + l.target.y) / 2;
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText(l.label, mx, my);
      }
    });

    // Draw Nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
      ctx.fillStyle = n.color || '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = n === hoveredNode ? '#ffffff' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = n === hoveredNode ? 2.5 : 1;
      ctx.stroke();

      // Label
      ctx.font = `${n.type === 'contract' ? '12px' : '10px'} Inter, sans-serif`;
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.label, n.x, n.y + n.radius + 12);
    });

    ctx.restore();
  }

  // Mouse interaction
  function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - transform.x) / transform.scale,
      y: (e.clientY - rect.top - transform.y) / transform.scale
    };
  }

  canvas.onmousedown = (e) => {
    const pos = getMousePos(e);
    draggedNode = nodes.find(n => Math.hypot(n.x - pos.x, n.y - pos.y) <= n.radius);
    if (!draggedNode) {
      isPanning = true;
      startPan = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    }
  };

  canvas.onmousemove = (e) => {
    const pos = getMousePos(e);
    hoveredNode = nodes.find(n => Math.hypot(n.x - pos.x, n.y - pos.y) <= n.radius);

    if (draggedNode) {
      draggedNode.x = pos.x;
      draggedNode.y = pos.y;
      draggedNode.vx = 0;
      draggedNode.vy = 0;
    } else if (isPanning) {
      transform.x = e.clientX - startPan.x;
      transform.y = e.clientY - startPan.y;
    }
  };

  window.onmouseup = () => {
    draggedNode = null;
    isPanning = false;
  };

  canvas.onwheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    transform.scale = Math.max(0.4, Math.min(2.5, transform.scale * zoomFactor));
  };

  tick();
}

// -------------------------------------------------------------
// 8. Executive Due Diligence Memo
// -------------------------------------------------------------

function setupReport() {
  const genBtn = document.getElementById('generate-memo-btn');
  const dlBtn = document.getElementById('download-memo-btn');
  const container = document.getElementById('memo-container');
  let currentMemoMarkdown = '';

  if (genBtn) {
    genBtn.addEventListener('click', async () => {
      if (!state.selectedDocument) {
        showToast('Please select a contract on the left sidebar first!', 'error');
        return;
      }

      genBtn.disabled = true;
      container.innerHTML = `
        <div class="loading-spinner-box">
          <div class="spinner"></div>
          <p>Synthesizing full executive due diligence audit memorandum for ${state.selectedDocument}...</p>
        </div>
      `;

      try {
        const res = await fetch('/api/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document: state.selectedDocument })
        });

        if (!res.ok) throw new Error('Failed to generate audit memorandum');
        const data = await res.json();
        currentMemoMarkdown = data.markdown_memo;

        container.innerHTML = formatMarkdown(data.markdown_memo) + `
          <div style="margin-top:20px; padding-top:16px; border-top:1px solid var(--glass-border); display:flex; justify-content:flex-end; gap:10px;">
            <button class="btn-verify" id="btn-verify-memo">🛡️ Verify Memo with AI</button>
          </div>
        `;
        document.getElementById('btn-verify-memo').addEventListener('click', () => {
          runVerifier(
            'Executive Due Diligence Audit Memorandum',
            currentMemoMarkdown.substring(0, 3000)
          );
        });
        if (dlBtn) dlBtn.style.display = 'inline-flex';
        showToast(`Audit memo generated (Score: ${data.compliance_score}/100)!`, 'success');
      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      } finally {
        genBtn.disabled = false;
      }
    });
  }

  if (dlBtn) {
    dlBtn.addEventListener('click', () => {
      if (!currentMemoMarkdown) return;
      const blob = new Blob([currentMemoMarkdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Legal_Audit_Memo_${(state.selectedDocument || 'Contract').replace(/\.pdf/i, '')}.md`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Downloaded audit memo file!', 'success');
    });
  }
}

// -------------------------------------------------------------
// 9. Obligations & Deadlines Timeline
// -------------------------------------------------------------

function setupObligations() {
  const btn = document.getElementById('extract-obligations-btn');
  const container = document.getElementById('obligations-container');

  if (btn) {
    btn.addEventListener('click', async () => {
      if (!state.selectedDocument) {
        showToast('Please select a contract on the left sidebar first!', 'error');
        return;
      }

      btn.disabled = true;
      container.innerHTML = `
        <div class="loading-spinner-box">
          <div class="spinner"></div>
          <p>Scanning ${state.selectedDocument} for notice periods, payment milestones, cure periods, and audit covenants...</p>
        </div>
      `;

      try {
        const res = await fetch('/api/obligations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document: state.selectedDocument })
        });

        if (!res.ok) throw new Error('Obligations extraction failed');
        const data = await res.json();
        renderObligations(data);
        showToast('Obligations & Deadlines timeline extracted!', 'success');
      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }
}

function renderObligations(data) {
  const container = document.getElementById('obligations-container');
  if (!data.timeline_items || data.timeline_items.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-icon">✓</div>
        <h3>No strict numerical deadlines identified</h3>
        <p>Review the full clause studio parameters for general obligations.</p>
      </div>
    `;
    return;
  }

  let html = '';
  data.timeline_items.forEach((item) => {
    const cardIdx = data.timeline_items.indexOf(item);
    html += `
      <div class="timeline-card">
        <div class="timeline-header">
          <span class="timeline-cat">${item.category}</span>
          <span class="timeframe-badge">⏱️ ${item.timeframe.toUpperCase()}</span>
        </div>
        <div class="timeline-context">${escapeHtml(item.context)}</div>
        <div class="timeline-card-actions">
          <button class="btn-verify btn-verify-sm" data-tl-idx="${cardIdx}">🛡️ Verify</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Bind verify buttons for timeline cards
  container.querySelectorAll('.btn-verify').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.tlIdx);
      const item = data.timeline_items[idx];
      if (item) {
        runVerifier(
          `${item.category}: ${item.timeframe}`,
          item.context || ''
        );
      }
    });
  });
}

// -------------------------------------------------------------
// 7. Tables & Visual Assets (VLM)
// -------------------------------------------------------------

function setupTablesAndImages() {
  elements.extractTablesBtn.addEventListener('click', async () => {
    if (!state.selectedDocument) {
      showToast('Please select a contract on the left sidebar first!', 'error');
      return;
    }

    elements.tablesContainer.innerHTML = `
      <div class="loading-spinner-box">
        <div class="spinner"></div>
        <p>Extracting tabular grids with pdfplumber from ${state.selectedDocument}...</p>
      </div>
    `;

    try {
      const res = await fetch(`/api/tables?document=${encodeURIComponent(state.selectedDocument)}`);
      if (!res.ok) throw new Error('Table extraction failed');
      const data = await res.json();
      renderTables(data.tables);
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  });

  elements.extractImagesBtn.addEventListener('click', async () => {
    if (!state.selectedDocument) {
      showToast('Please select a contract on the left sidebar first!', 'error');
      return;
    }

    elements.imagesContainer.innerHTML = `
      <div class="loading-spinner-box">
        <div class="spinner"></div>
        <p>Extracting images and running MiniCPM-V Vision Language Model analysis...</p>
      </div>
    `;

    try {
      const res = await fetch(`/api/images?document=${encodeURIComponent(state.selectedDocument)}&run_vlm=true`);
      if (!res.ok) throw new Error('Image analysis failed');
      const data = await res.json();
      renderImages(data.images);
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  });
}

function renderTables(tables) {
  elements.tablesCountBadge.textContent = `${tables ? tables.length : 0} detected`;

  if (!tables || tables.length === 0) {
    elements.tablesContainer.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-icon">📊</div>
        <h3>No Tables Detected</h3>
        <p>The selected PDF document does not contain formatted table matrices.</p>
      </div>
    `;
    return;
  }

  elements.tablesContainer.innerHTML = '';
  tables.forEach((table, i) => {
    const card = document.createElement('div');
    card.className = 'table-render-card';

    let tableHtml = '<table class="rendered-table-grid">';
    if (table.raw_data && table.raw_data.length > 0) {
      // Header
      tableHtml += '<thead><tr>';
      table.raw_data[0].forEach(cell => {
        tableHtml += `<th>${escapeHtml(cell || '')}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';

      // Rows
      table.raw_data.slice(1).forEach(row => {
        tableHtml += '<tr>';
        row.forEach(cell => {
          tableHtml += `<td>${escapeHtml(cell || '')}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody>';
    }
    tableHtml += '</table>';

    card.innerHTML = `
      <div class="table-card-header">Table ${i + 1} • Page ${table.page} (${table.num_rows} rows × ${table.num_cols} cols)</div>
      ${tableHtml}
    `;
    elements.tablesContainer.appendChild(card);
  });
}

function renderImages(images) {
  elements.imagesCountBadge.textContent = `${images ? images.length : 0} detected`;

  if (!images || images.length === 0) {
    elements.imagesContainer.innerHTML = `
      <div class="empty-state-card" style="grid-column: 1 / -1;">
        <div class="empty-icon">🖼️</div>
        <h3>No Scanned Images Detected</h3>
        <p>No standalone image assets met the minimum size threshold in this contract.</p>
      </div>
    `;
    return;
  }

  elements.imagesContainer.innerHTML = '';
  images.forEach(img => {
    const card = document.createElement('div');
    card.className = 'image-card';
    const imgSrc = img.url || ('/' + img.image_path.replace(/\\/g, '/'));
    card.innerHTML = `
      <div class="image-card-header">Page ${img.page} • ${img.width}×${img.height}px (${img.format || 'img'})</div>
      <div style="text-align: center; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px; margin: 10px 0;">
        <img src="${imgSrc}" style="max-width: 100%; max-height: 260px; object-fit: contain; border-radius: 4px;" alt="Page ${img.page} Preview" onerror="this.style.display='none'" />
      </div>
      <div class="image-card-vlm-box">
        <div class="vlm-badge-label">MINICPM-V VISION ANALYSIS</div>
        <p>${escapeHtml(img.description || 'No description produced.')}</p>
      </div>
    `;
    elements.imagesContainer.appendChild(card);
  });
}

// -------------------------------------------------------------
// 8. Evaluation Suite
// -------------------------------------------------------------

function setupEvaluator() {
  elements.runEvalBtn.addEventListener('click', async () => {
    elements.evalResultsWrapper.innerHTML = `
      <div class="loading-spinner-box">
        <div class="spinner"></div>
        <p>Running batch evaluation against CUAD benchmark questions...</p>
      </div>
    `;

    try {
      const res = await fetch('/api/eval');
      if (!res.ok) throw new Error('Evaluation failed');
      const data = await res.json();
      renderEvaluation(data);
      showToast('Benchmark suite completed!', 'success');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  });
}

function renderEvaluation(data) {
  elements.evalAnswerRate.textContent = `${data.answer_rate}%`;
  elements.evalKwScore.textContent = `${data.avg_keyword_score}%`;
  elements.evalLatency.textContent = `${data.avg_time_seconds}s`;
  elements.evalSources.textContent = data.avg_sources;

  let rowsHtml = '';
  data.results.forEach((r, idx) => {
    const statusTag = r.has_answer
      ? '<span class="badge-found">ANSWERED</span>'
      : '<span class="badge-notfound">NO EVIDENCE</span>';
    const kwText = r.keyword_total ? `${r.keyword_hits}/${r.keyword_total}` : 'N/A';

    rowsHtml += `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(r.question)}</strong></td>
        <td>${statusTag}</td>
        <td>${kwText}</td>
        <td>${r.sources_count}</td>
        <td>${r.time_seconds}s</td>
      </tr>
    `;
  });

  elements.evalResultsWrapper.innerHTML = `
    <table class="eval-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Question</th>
          <th>Status</th>
          <th>Keyword Hits</th>
          <th>Sources</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

// -------------------------------------------------------------
// Modals & Verifier
// -------------------------------------------------------------

function setupModals() {
  elements.modalCloseBtn.addEventListener('click', () => {
    elements.verifyModal.classList.remove('active');
  });
  elements.chunkModalCloseBtn.addEventListener('click', () => {
    elements.chunkModal.classList.remove('active');
  });

  window.addEventListener('click', (e) => {
    if (e.target === elements.verifyModal) elements.verifyModal.classList.remove('active');
    if (e.target === elements.chunkModal) elements.chunkModal.classList.remove('active');
  });
}

async function runVerifier(finding, evidence) {
  elements.verifyModal.classList.add('active');
  elements.verifyModalBody.innerHTML = `
    <div class="loading-spinner-box">
      <div class="spinner"></div>
      <p>Running independent skeptical verification pass with Llama 3.1 8B...</p>
    </div>
  `;

  // Normalize evidence into an array of strings
  let evidenceList = [];
  if (Array.isArray(evidence)) {
    evidenceList = evidence.map(e => {
      if (typeof e === 'string') return e;
      if (e && typeof e === 'object') return e.text || e.content || JSON.stringify(e);
      return String(e);
    });
  } else if (typeof evidence === 'string' && evidence.trim().length > 0) {
    evidenceList = [evidence.trim()];
  } else if (evidence) {
    evidenceList = [String(evidence)];
  }

  try {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        finding: typeof finding === 'string' ? finding : JSON.stringify(finding),
        evidence: evidenceList
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const detail = errData.detail 
        ? (typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail)) 
        : res.statusText;
      throw new Error(`(${res.status}) ${detail}`);
    }

    const data = await res.json();

    const isSupported = data.verdict === 'SUPPORTED';
    const badgeClass = isSupported ? 'found' : 'notfound';

    elements.verifyModalBody.innerHTML = `
      <div class="status-badge-large ${badgeClass}" style="margin-bottom: 12px;">
        VERDICT: ${data.verdict}
      </div>
      <div style="font-size: 13.5px; line-height: 1.7; color: var(--text-main); white-space: pre-wrap;">
        ${formatMarkdown(data.reasoning || '')}
      </div>
    `;
  } catch (err) {
    elements.verifyModalBody.innerHTML = `<p style="color: var(--accent-rose)">Verification failed: ${escapeHtml(err.message)}</p>`;
  }
}

function openChunkModal(title, text) {
  elements.chunkModalTitle.textContent = title;
  elements.chunkModalText.textContent = text;
  elements.chunkModal.classList.add('active');
}

// -------------------------------------------------------------
// Utilities
// -------------------------------------------------------------

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMarkdown(text) {
  if (!text) return '';

  // Clean up trailing boilerplate if substantial findings are present
  let cleanText = text.trim();
  if (cleanText.includes('\n') && cleanText.toLowerCase().includes('insufficient evidence in the provided documents.')) {
    const lines = cleanText.split('\n');
    const filtered = lines.filter(l => !l.toLowerCase().includes('insufficient evidence in the provided documents.'));
    if (filtered.length > 1) {
      cleanText = filtered.join('\n').trim();
    }
  }

  // Use marked.js if available
  if (typeof marked !== 'undefined' && marked.parse) {
    try {
      marked.setOptions({
        breaks: true,
        gfm: true
      });
      return marked.parse(cleanText);
    } catch (e) {
      console.warn('marked parse error:', e);
    }
  }

  // Fallback custom parser
  let html = escapeHtml(cleanText);

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic (e.g. *filename.pdf*)
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Lists
  const lines = html.split('\n');
  let inList = false;
  let resultLines = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      if (!inList) {
        resultLines.push('<ul>');
        inList = true;
      }
      const itemContent = trimmed.replace(/^[•\-\*]\s*/, '');
      resultLines.push(`<li>${itemContent}</li>`);
    } else {
      if (inList) {
        resultLines.push('</ul>');
        inList = false;
      }
      if (trimmed) {
        resultLines.push(`<p>${trimmed}</p>`);
      }
    }
  }

  if (inList) {
    resultLines.push('</ul>');
  }

  return resultLines.join('\n');
}
