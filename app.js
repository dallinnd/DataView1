/**
 * DATA VIEW - MASTER ENGINE v9.5
 * Features: Dark Semitransparent Nav Bar, SVG Icons, Auto-Hide, Keyboard Nav.
 */

let views = [];
let currentView = null;
let pendingBox = null;
let currentRowIndex = 0;
let changeLog = [];
let hideTimer;

// --- SVG Icons ---
const iconHome = `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="white"/></svg>`;
const iconLeft = `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="white"/></svg>`;
const iconRight = `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="white"/></svg>`;

const bgPresets = ['#ffffff','#f1f5f9','#cbd5e1','linear-gradient(135deg,#60a5fa,#3b82f6)','linear-gradient(135deg,#34d399,#10b981)','linear-gradient(135deg,#fb923c,#f97316)','#fee2e2','#fef3c7','#dcfce7','#1e293b','#334155','#475569'];
const textPresets = ['#000000','#ffffff','#475569','#ef4444','#3b82f6','#10b981'];

// --- ROUTING & INIT ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('dataView_master_final');
    if (saved) views = JSON.parse(saved);

    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('view');
    
    if (viewId) {
        document.body.classList.add('view-mode-body');
        currentView = views.find(v => v.createdAt == viewId);
        if (currentView) startPresentation();
    } else {
        renderHome();
    }
});

function saveAll() { localStorage.setItem('dataView_master_final', JSON.stringify(views)); }

// --- NAVIGATION ---
function renderHome() {
    const app = document.getElementById('app');
    app.innerHTML = `<button class="primary-btn" onclick="createNewView()">+ Create New View</button><h2 style="text-align:center; margin-top:40px;">Existing Displays</h2><div id="view-list"></div>`;
    views.sort((a,b) => b.updatedAt - a.updatedAt).forEach(v => {
        const div = document.createElement('div');
        div.style = "background:white; padding:20px; border-radius:15px; margin-top:12px; display:flex; justify-content:space-between; align-items:center; border:1px solid #e2e8f0;";
        div.innerHTML = `<div><strong>${v.name}</strong></div><button class="blue-btn" onclick="openMenu('${v.createdAt}')">Open</button>`;
        document.getElementById('view-list').appendChild(div);
    });
}

function openInNewTab(id) {
    window.open(window.location.origin + window.location.pathname + '?view=' + id, '_blank');
}

function openMenu(id) {
    currentView = views.find(v => v.createdAt == id);
    document.getElementById('app').innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:50px;">
            <button class="blue-btn" style="height:140px;" onclick="exportData()">Export</button>
            <button class="blue-btn" style="height:140px;" onclick="openInNewTab('${id}')">View (New Tab)</button>
            <button class="blue-btn" style="height:140px;" onclick="renderEditCanvas()">Edit</button>
            <button class="blue-btn" style="height:140px; background:var(--danger);" onclick="deleteView('${id}')">Delete</button>
        </div><button onclick="renderHome()" style="margin-top:30px; width:100%; background:none; text-decoration:underline; border:none; cursor:pointer;">Back Home</button>`;
}

// --- CANVAS ---
function renderEditCanvas() {
    document.getElementById('app').innerHTML = `
        <div class="canvas-header"><input type="text" value="${currentView.name}" oninput="currentView.name=this.value; saveAll();" style="font-size:1.2rem; font-weight:bold; border:none; outline:none; background:transparent;"><button class="orange-btn" onclick="uploadExcel()">Upload Excel</button><button class="blue-btn" onclick="openMenu('${currentView.createdAt}')">Save & Exit</button></div>
        <div class="canvas-16-9" id="canvas-container"><div class="grid-overlay" id="grid"></div><div id="boxes-layer"></div></div>
        <div style="display:flex; justify-content:center; gap:10px; margin-top:20px; flex-wrap:wrap;">${['2x2','2x1','4x1','6x1','3x3','4x4'].map(s => `<button class="blue-btn" style="background:#64748b" onclick="selectSize(${s.split('x')[0]},${s.split('x')[1]})">${s}</button>`).join('')}</div>`;
    drawGrid(); drawBoxes();
}

function drawGrid() {
    const grid = document.getElementById('grid'); grid.innerHTML = '';
    for (let i = 0; i < 24; i++) {
        const cell = document.createElement('div'); cell.className = 'grid-cell';
        const x = i % 6, y = Math.floor(i / 6);
        cell.onclick = () => {
            if(!pendingBox) return;
            currentView.boxes.push({x, y, w:pendingBox.w, h:pendingBox.h, title:'Title', textVal:'Variable', isVar:true, bgColor:'#ffffff', textColor:'#000', fontSize:36});
            pendingBox = null; saveAll(); drawBoxes();
        }; grid.appendChild(cell);
    }
}

function drawBoxes() {
    const layer = document.getElementById('boxes-layer'); if (!layer) return; layer.innerHTML = '';
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div'); div.className = 'box-instance';
        div.style.left = `${(box.x/6)*100}%`; div.style.top = `${(box.y/4)*100}%`;
        div.style.width = `${(box.w/6)*100}%`; div.style.height = `${(box.h/4)*100}%`;
        div.style.background = box.bgColor; div.style.color = box.textColor;
        div.innerHTML = `<small style="font-size:0.6em; opacity:0.8;">${box.title}</small><div style="font-size:${box.fontSize}px; font-weight:bold;">${box.isVar ? '<' + box.textVal + '>' : box.textVal}</div>`;
        div.onclick = (e) => { e.stopPropagation(); openChoiceMenu(i); }; layer.appendChild(div);
    });
}

// --- PRESENTATION (V9.5) ---


function startPresentation() {
    currentRowIndex = 0; renderSlide(); setupAutoHide();
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') nextSlide();
        if (e.key === 'ArrowLeft') prevSlide();
        if (e.key === 'Escape') window.close();
    });
}

function renderSlide() {
    const row = currentView.data[currentRowIndex] || {};
    document.getElementById('app').innerHTML = `
        <div class="presentation-fullscreen">
            <div class="slide-fit" id="slide-canvas"></div>
            <div class="floating-controls" id="controls">
                <button class="icon-btn" onclick="window.close()">${iconHome}</button>
                <div class="slide-counter">${currentRowIndex+1} / ${currentView.data.length}</div>
                <div class="nav-group-right"><button class="icon-btn" onclick="prevSlide()">${iconLeft}</button><button class="icon-btn" onclick="nextSlide()">${iconRight}</button></div>
            </div>
        </div>`;
    const canvas = document.getElementById('slide-canvas');
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div'); div.className = 'box-instance';
        div.style.left = `${(box.x/6)*100}%`; div.style.top = `${(box.y/4)*100}%`;
        div.style.width = `${(box.w/6)*100}%`; div.style.height = `${(box.h/4)*100}%`;
        div.style.background = box.bgColor; div.style.color = box.textColor;
        const val = box.isVar ? (row[box.textVal] || '---') : box.textVal;
        div.innerHTML = `<small style="opacity:0.6; font-size:0.6em;">${box.title}</small><div style="font-size:${box.fontSize}px; font-weight:bold;">${val}</div>`;
        canvas.appendChild(div);
    });
}

function setupAutoHide() {
    const ctrls = document.getElementById('controls'); if (!ctrls) return;
    const show = () => {
        ctrls.classList.remove('hidden'); document.body.style.cursor = 'default';
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => { if (!ctrls.matches(':hover')) { ctrls.classList.add('hidden'); document.body.style.cursor = 'none'; } }, 5000);
    };
    window.addEventListener('mousemove', show); window.addEventListener('click', show);
    ctrls.addEventListener('mouseenter', () => { clearTimeout(hideTimer); ctrls.classList.remove('hidden'); });
    ctrls.addEventListener('mouseleave', show); show();
}

// ... rest of support functions (Editor, Excel, Utils) remain from v9.0
function selectSize(w, h) { pendingBox = {w, h}; }
function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function nextSlide() { if (currentRowIndex < currentView.data.length - 1) { currentRowIndex++; renderSlide(); } }
function prevSlide() { if (currentRowIndex > 0) { currentRowIndex--; renderSlide(); } }
function createNewView() { currentView = { name: 'New View', createdAt: Date.now(), updatedAt: Date.now(), boxes: [], headers: [], data: [] }; views.push(currentView); renderEditCanvas(); }
function openChoiceMenu(idx) {
    const overlay = document.createElement('div'); overlay.className = 'popup-overlay';
    overlay.innerHTML = `<div class="choice-window" style="background:white; padding:25px; border-radius:20px; text-align:center;"><button class="primary-btn" onclick="closePop(); openEditor(${idx})">Edit</button><br><br><button class="primary-btn" style="background:var(--danger)" onclick="deleteBox(${idx})">Delete</button></div>`;
    document.body.appendChild(overlay);
}
