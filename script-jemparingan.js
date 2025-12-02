document.addEventListener("DOMContentLoaded", () => {
  const mode = localStorage.getItem('targetMode') || '321';
  const maxEnds = 20;
  const arrowsPerEndFixed = 4;

  const modeLabel = document.getElementById('modeLabel');
  const sessionTitleEl = document.getElementById('session-title');
  const playersEl = document.getElementById('players');
  const leaderboardEl = document.getElementById('leaderboard');
  const numCompEl = document.getElementById('numComp');
  const currentEndEl = document.getElementById('currentEnd');
  
  // --- PERBAIKAN DI SINI ---
  const maxEndsLabel = document.getElementById('maxEndsLabel');
  const maxEndsEl = document.getElementById('maxEnds');
  // --- AKHIR PERBAIKAN ---

  const newName = document.getElementById('newName');
  const addFromInput = document.getElementById('addFromInput');
  const exportBtn = document.getElementById('exportBtn');
  const resetBtn = document.getElementById('resetBtn');
  const endBtn = document.getElementById('endBtn');
  const prevEndBtn = document.getElementById('prevEnd');
  const nextEndBtn = document.getElementById('nextEnd');
  const backToChoose = document.getElementById('backToChoose');
  const clockEl = document.getElementById('clock');
  const scanBtn = document.getElementById('scanBtn');
  const btnInputSkor = document.getElementById('btnInputSkor');
  const btnRanking = document.getElementById('btnRanking');
  const mainEl = document.querySelector('main');
  const asideEl = document.querySelector('aside');

  modeLabel.textContent = mode === '321' ? 'Bandul: 3 – 2 – 1' : 'Bandul: 3 – 1';
  if (sessionTitleEl) sessionTitleEl.textContent = localStorage.getItem('sessionName') || sessionTitleEl.textContent;
  
  // --- PERBAIKAN DI SINI ---
  // Pastikan kedua elemen diperbarui oleh konstanta maxEnds
  maxEndsLabel.textContent = maxEnds; 
  maxEndsEl.textContent = maxEnds;
  // --- AKHIR PERBAIKAN ---

  const scoringButtonsByMode = {
    '321': ['3', '2', '1', 'M'],
    '31': ['3', '1', 'M']
  };

  // Map scoring values to display labels (for UI)
  const scoringLabels = {
    '3': '3',
    '2': '2',
    '1': '1',
    'M': 'Meleset'
  };

  const defaultState = {
    competitors: [],
    selectedId: null,
    currentEnd: 1,
    matchEnded: false,
  };
  
  let state = defaultState; 

  function saveState() {
    localStorage.setItem('jemparinganState', JSON.stringify(state));
  }

  function loadState() {
    const savedState = localStorage.getItem('jemparinganState');
    if (savedState) {
      state = JSON.parse(savedState);
    } else {
      state = { ...defaultState, competitors: [] };
    }
  }

  function recalculateStats(p) {
    let total = 0, missCount = 0;
    for (let i = 1; i <= maxEnds; i++) {
      if (p.scores[i]) {
        p.scores[i].forEach(arrow => {
          if (arrow) {
            total += arrow.score;
            if (arrow.isM) missCount++;
          }
        });
      }
    }
    p.total = total;
    p.missCount = missCount;
  }

  function render() {
    playersEl.innerHTML = '';
    state.competitors.forEach((p) => {
      const div = document.createElement('div');
      div.className = 'player' + (p.id === state.selectedId ? ' selected' : '');
      const currentEndArrows = p.scores[state.currentEnd] || [null, null, null, null];
      let currentArrowsHtml = '';

      for (let i = 0; i < arrowsPerEndFixed; i++) {
        const arrow = currentEndArrows[i];
        // --- Perbaikan kecil di sini: Menambah kelas 'miss' ---
        const arrowClass = arrow ? (arrow.isM ? 'filled miss' : 'filled') : 'empty';
        currentArrowsHtml += `<div class="arrow-box ${arrowClass}" data-index="${i}">
          ${arrow ? (arrow.isM ? 'M' : arrow.score) : '&nbsp;'}</div>`;
      }

      div.innerHTML = `
        <button class="remove-btn" data-action="remove" title="Hapus ${p.name}">×</button> 
        <div class="name">${p.name}</div>
        <div class="meta" style="color: #000000;">Total Skor: ${p.total} | Jumlah Meleset: ${p.missCount}</div>
        <div class="meta-seri" style="color: #000000;">Skor Seri ${state.currentEnd}:</div>
        <div class="current-arrows">${currentArrowsHtml}</div>
        ${!state.matchEnded && p.id === state.selectedId ? `
          <div class="pad" data-comp="${p.id}">
            ${scoringButtonsByMode[mode].map(s => `<button data-score="${s}">${scoringLabels[s]}</button>`).join('')}
          </div>` : ''}
      `;

      div.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="remove"]')) {
          if (state.matchEnded) return;
          removeCompetitor(p.id);
          return;
        }

        const arrowBox = e.target.closest('.arrow-box');
        if (arrowBox && arrowBox.classList.contains('filled')) {
          if (state.matchEnded) return;
          if (state.selectedId === p.id)
            removeSpecificArrow(p.id, state.currentEnd, parseInt(arrowBox.dataset.index, 10));
          else { state.selectedId = p.id; render(); }
          return;
        }

        const scoreBtn = e.target.closest('[data-score]');
        if (scoreBtn) { 
          recordScoreManual(scoreBtn.dataset.score); 
          return; 
        }

        if (state.selectedId !== p.id) { 
          state.selectedId = p.id; 
          render();
        }
      });
      playersEl.appendChild(div);
    });

    const sorted = [...state.competitors].sort((a, b) => b.total - a.total || a.missCount - b.missCount);
    // Render leaderboard as a table: Peringkat | Nama | Total | Miss
    let table = '<table class="leaderboard-table" aria-label="Leaderboard"><thead><tr><th>Peringkat</th><th>Nama</th><th>Total</th><th>Miss</th></tr></thead><tbody>';
    sorted.forEach((p, i) => {
      table += `<tr><td>${i + 1}</td><td>${escapeHtml(p.name)}</td><td>${p.total}</td><td>${p.missCount}</td></tr>`;
    });
    table += '</tbody></table>';
    leaderboardEl.innerHTML = table;
    numCompEl.textContent = state.competitors.length;
    currentEndEl.textContent = state.currentEnd;
  }

  // small helper to avoid injecting raw HTML from names
  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function addCompetitor(name = "Atlet") {
    const existing = state.competitors.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      state.selectedId = existing.id;
      return existing; 
    }

    const id = Date.now() + Math.floor(Math.random() * 1000);
    const newScores = {};
    for (let i = 1; i <= maxEnds; i++) newScores[i] = [null, null, null, null];
    const newP = { id, name, scores: newScores, total: 0, missCount: 0 };
    
    state.competitors.push(newP);
    state.selectedId = id;
    newName.focus();
    
    return newP;
  }

  function removeCompetitor(id) {
    state.competitors = state.competitors.filter(p => p.id !== id);
    if (state.selectedId === id) state.selectedId = state.competitors[0]?.id || null;
    
    saveState();
    render();
  }

  function removeSpecificArrow(competitorId, end, indexOnCard) {
    const p = state.competitors.find(x => x.id === competitorId);
    if (!p) return;
    p.scores[end][indexOnCard] = null;
    recalculateStats(p);
    
    saveState();
    render();
  }
  
  function recordScoreManual(value) {
    if (!state.selectedId || state.matchEnded) {
      alert('Pilih atlet terlebih dahulu sebelum memasukkan skor.');
      return;
    }
    const p = state.competitors.find(x => x.id === state.selectedId);
    if (!p) return;

    const success = recordScore(p, value, null);

    if (success) {
      recalculateStats(p);
      
      const finished = state.competitors.filter(c =>
        c.scores[state.currentEnd].every(s => s !== null)
      ).length;

      if (finished === state.competitors.length && state.competitors.length > 0) {
        if (state.currentEnd >= maxEnds) {
          endRound();
        } else {
          state.currentEnd++;
          state.selectedId = null;
          saveState();
        }
      } else {
         saveState();
      }
      
      render();
    }
  }

  function recordScore(p, value, location = null) {
    if (!p || state.matchEnded) return false;

    const sValue = String(value);
    const isM = sValue.toUpperCase() === 'M' || sValue === '0';
    const numeric = isM ? 0 : Number(value);
    if (!isM && (Number.isNaN(numeric) || numeric < 0)) return false;

    const currentScores = p.scores[state.currentEnd];
    const emptySlotIndex = currentScores.findIndex(s => s === null);
    
    if (emptySlotIndex === -1) { 
      alert(`Skor Seri ${state.currentEnd} untuk ${p.name} sudah penuh (4 panah).`); 
      return false; // Gagal
    }

    const arrow = { 
      end: state.currentEnd, 
      score: numeric, 
      isM: isM, 
      lokasi: location
    };
    currentScores[emptySlotIndex] = arrow;
    return true; // Sukses
  }
  
  function processScannedScore() {
    const queueJSON = localStorage.getItem('scannedScoresQueue');
    if (!queueJSON) return; 

    try {
      const queue = JSON.parse(queueJSON);
      if (queue.length === 0) return;

      localStorage.removeItem('scannedScoresQueue'); 
      
      let processedSuccessfully = false; 

      for (const item of queue) {
        const atletName = item.name;
        const newScore = item.scoreData;

        let p = state.competitors.find(c => c.name.toLowerCase() === atletName.toLowerCase());
        if (!p) {
          p = addCompetitor(atletName);
        }
        
        state.selectedId = p.id; 
        const success = recordScore(p, newScore.score, newScore.lokasi);
        
        if (success) {
          processedSuccessfully = true;
        } else {
          let remainingQueue = [];
          const failedIndex = queue.indexOf(item);
          if (failedIndex !== -1) {
            remainingQueue = queue.slice(failedIndex);
            localStorage.setItem('scannedScoresQueue', JSON.stringify(remainingQueue));
          }
          break;
        }
      }
      
      if (processedSuccessfully) {
        state.competitors.forEach(p => recalculateStats(p));
        saveState();
      }

    } catch (e) {
      console.error("Gagal memproses antrian skor:", e);
      localStorage.removeItem('scannedScoresQueue');
    }
  }

  function fillMissesForEnd(endNumber) {
    let changed = false;
    state.competitors.forEach(p => {
      const currentScores = p.scores[endNumber];
      for (let i = 0; i < arrowsPerEndFixed; i++) {
        if (currentScores[i] === null) {
          currentScores[i] = { end: endNumber, score: 0, isM: true, lokasi: null };
          changed = true;
        }
      }
      if(changed) recalculateStats(p);
    });
    if(changed) saveState();
  }

  function resetRound() {
    if (!confirm('Mulai sesi baru? Semua data akan dihapus.')) return;
    
    state = { ...defaultState, competitors: [] }; 
    
    saveState();
    render();
  }

  function endRound() {
    if (!state.matchEnded) {
      fillMissesForEnd(state.currentEnd);
      for (let i = state.currentEnd; i <= maxEnds; i++) fillMissesForEnd(i);
      state.matchEnded = true;
      state.selectedId = null;
      endBtn.textContent = 'Sesi Selesai';
      endBtn.classList.add('done');
      state.currentEnd = maxEnds;
      
      saveState();
      render();
    }
  }

  function nextEnd() {
    if (!state.matchEnded) {
      fillMissesForEnd(state.currentEnd);
      if (state.currentEnd >= maxEnds) { endRound(); return; }
      state.currentEnd++;
    } else if (state.currentEnd < maxEnds) state.currentEnd++;
    state.selectedId = null;
    
    saveState();
    render();
  }

  function prevEnd() {
    if (state.currentEnd <= 1) return;
    state.currentEnd--;
    state.selectedId = null;
    
    saveState();
    render();
  }

  addFromInput.addEventListener('click', () => {
    if (state.matchEnded) return;
    const name = (newName.value || '').trim();
    if (!name) { alert('Nama atlet kosong.'); return; }
    addCompetitor(name);
    
    saveState();
    render();
    newName.value = ''; // Kosongkan input setelah menambah
  });

  function setView(view) {
    if (view === 'input') {
      mainEl.classList.add('active');
      asideEl.classList.remove('active');
      btnInputSkor.classList.add('active');
      btnRanking.classList.remove('active');
    } else if (view === 'ranking') {
      mainEl.classList.remove('active');
      asideEl.classList.add('active');
      btnInputSkor.classList.remove('active');
      btnRanking.classList.add('active');
    }
  }

  btnInputSkor.addEventListener('click', () => setView('input'));
  btnRanking.addEventListener('click', () => setView('ranking'));

  exportBtn.addEventListener('click', () => { exportCSV(); state.selectedId = null; render(); });
  resetBtn.addEventListener('click', resetRound);
  
  endBtn.addEventListener('click', () => {
    if (state.competitors.length === 0) return alert('Data belum terisi'); 
    if (!state.matchEnded && confirm('Akhiri sesi sekarang? Skor akan terkunci dan tidak dapat diubah (skor kosong akan terisi M)')) endRound();
  });

  nextEndBtn.addEventListener('click', () => {
    if (state.competitors.length === 0) return alert('Data belum terisi');
    if (state.currentEnd === maxEnds) return;
    nextEnd();
  });

  prevEndBtn.addEventListener('click', prevEnd);

  scanBtn.addEventListener('click', () => {
    if (state.matchEnded) {
      alert('Sesi sudah berakhir. Tidak bisa menambah skor.');
      return;
    }
    window.location.href = 'kamera.html';
  });

  backToChoose.addEventListener('click', () => {
    if (!confirm('Kembali ke pemilihan mode? Pengaturan tidak tersimpan.')) return;
    localStorage.removeItem('targetMode');
    localStorage.removeItem('jemparinganState');
    localStorage.removeItem('scannedScoresQueue');
    window.location.href = 'index.html';
  });

  window.addEventListener('keydown', (e) => {
    if (document.activeElement === newName) {
      if (e.key === 'Enter') { e.preventDefault(); addFromInput.click(); }
      return;
    }
    if (state.matchEnded) return;
    const key = e.key.toUpperCase();
    if (key === '0') return recordScoreManual('0');
    if (scoringButtonsByMode[mode].includes(key)) recordScoreManual(key);
  });

  function exportCSV() {
    const headers = ['Nama']; 
    for (let i = 1; i <= maxEnds; i++) {
      headers.push(`R${i}`);
    }
    headers.push('Total');
    headers.push('Miss');

    const sortedCompetitors = [...state.competitors].sort((a, b) => b.total - a.total || a.missCount - b.missCount);

    const rows = sortedCompetitors.map(p => {
      const rowData = [];
      rowData.push(`"${p.name}"`); 

      for (let end = 1; end <= maxEnds; end++) {
        let rambahanTotal = 0;
        const arrowsInEnd = p.scores[end]; 
        
        if (arrowsInEnd) {
          arrowsInEnd.forEach(arrow => {
            if (arrow) {
              rambahanTotal += arrow.score;
            }
          });
        }
        rowData.push(rambahanTotal);
      }

      rowData.push(p.total);
      rowData.push(p.missCount);

      return rowData.join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scoring_result.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (clockEl) {
    const updateClock = () => {
      clockEl.textContent = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    };
    setInterval(updateClock, 1000);
    updateClock();
  }

  loadState();
  processScannedScore();
  render();
  setView('input'); // Initialize with input view active

  // Menu toggle and close-on-outside-click
  const menuBtn = document.getElementById('menu');
  const controlsMenu = document.getElementById('controlsMenu');
  
  if (menuBtn && controlsMenu) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      controlsMenu.style.display = controlsMenu.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', (e) => {
      // Close menu if click is outside both the button and the menu
      if (!menuBtn.contains(e.target) && !controlsMenu.contains(e.target)) {
        controlsMenu.style.display = 'none';
      }
    });
  }
});