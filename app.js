/**
 * DATA VIEW PRO - GRAFTED MASTER ENGINE v58.0
 * Functional Logic from v39 + Modern Edit Layout UI
 */

let views = [];
let currentView = null;
let currentRowIndex = 0;
let selectedBoxIdx = null;
let varSearchTerm = "";
let viewSearchTerm = "";

let draggingElement = null;
let dragIdx = -1;
let dragStartX, dragStartY;
let offset = { x: 0, y: 0 };

const bgPresets = ['#ffffff','#f8fafc','#f1f5f9','#e2e8f0','#cbd5e1','#94a3b8','#1e293b','#0f172a','#fee2e2','#ffedd5','#fef9c3','#dcfce7','#d1fae5','#dbeafe','#e0e7ff','#f5f3ff','linear-gradient(135deg, #667eea 0%, #764ba2 100%)','linear-gradient(135deg, #00b09b 0%, #96c93d 100%)','linear-gradient(135deg, #f093fb 0%, #f5576c 100%)','linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'];
const textPresets = ['#000000','#ffffff','#ef4444','#3b82f6','#10b981','#f97316','#8b5cf6','#ec4899'];

const iconHome = `<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`;
const iconLeft = `<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`;
const iconRight = `<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`;

// --- STORAGE ENGINE (v39 Keys) ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('dataView_v39_final'); // Using your v39 storage key
    if (saved) views = JSON.parse(saved);
    
    const params = new URLSearchParams(window.location.search);
    if (params.get('view')) {
        currentView = views.find(v => v.createdAt == params.get('view'));
        if (currentView) startPresentation(); else renderHome();
    } else { renderHome(); }
});

function saveAll() {
    localStorage.setItem('dataView_v39_final', JSON.stringify(views));
}

// --- CORE FUNCTIONALITY: DATA EDITING (v39 Logic) ---
function editLiveValue(idx) {
    const box = currentView.boxes[idx];
    const oldVal = currentView.data[currentRowIndex][box.textVal] || '---';
    const newVal = prompt(`Update Variable "${box.textVal}" (Row ${currentRowIndex + 1}):`, oldVal);
    
    if (newVal !== null && newVal !== oldVal) {
        if (!currentView.history) currentView.history = [];
        currentView.history.push({ 
            time: new Date().toLocaleString(), 
            row: currentRowIndex + 1, 
            col: box.textVal, 
            old: oldVal, 
            new: newVal 
        });
        
        // PHYSICAL DATA OVERWRITE (Working Engine)
        currentView.data[currentRowIndex][box.textVal] = newVal;
        
        saveAll(); 
        closePop(); 
        renderSlideContent(); 
    }
}

// --- CORE FUNCTIONALITY: EXPORT (v39 Logic) ---
function exportFinalFiles() {
    if (!currentView || !currentView.data.length) return alert("No data");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(currentView.data); 
    XLSX.utils.book_append_sheet(wb, ws, "UpdatedData");
    XLSX.writeFile(wb, `${currentView.name.replace(/\s+/g,'_')}_Updated.xlsx`);
    
    const logHeader = `HISTORY LOG: ${currentView.name}\nGenerated: ${new Date().toLocaleString()}\n--------------------------\n`;
    const logBody = (currentView.history || []).map(h => `[${h.time}] Row ${h.row} | Column "${h.col}": "${h.old}" -> "${h.new}"`).join('\n');
    const blob = new Blob([logHeader + logBody], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${currentView.name}_history.txt`; a.click();
}

// --- MODERN UI NAVIGATION ---
function renderHome() {
    selectedBoxIdx = null;
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="home-container">
            <h1 class="main-heading" style="text-align:center; font-size:2.5rem; margin-bottom:20px;">Data View</h1>
            <button class="primary-btn" onclick="createNewView()">+ Create New View</button>
            <div style="margin-top:30px;"><input type="text" placeholder="Search saved views..." oninput="handleHomeSearch(this.value)"></div>
            <div id="view-list" style="margin-top:20px;"></div>
        </div>`;
    updateHomeList();
}

function updateHomeList() {
    const list = document.getElementById('view-list'); if(!list) return;
    list.innerHTML = '';
    views.filter(v => v.name.toLowerCase().includes(viewSearchTerm.toLowerCase())).forEach(v => {
        const d = document.createElement('div'); d.className = 'view-card';
        d.innerHTML = `<strong>${v.name}</strong><button class="blue-btn" onclick="openMenu('${v.createdAt}')">Open Dashboard</button>`;
        list.appendChild(d);
    });
}

function handleHomeSearch(val) { viewSearchTerm = val; updateHomeList(); }

function openMenu(id) {
    currentView = views.find(v => v.createdAt == id);
    document.getElementById('app').innerHTML = `<div class="home-container"><button class="blue-btn" style="background:var(--slate); margin-bottom:20px; align-self:flex-start;" onclick="renderHome()">← Back</button><h1 class="main-heading">${currentView.name}</h1><div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;"><button class="blue-btn" style="height:140px;" onclick="renderEditCanvas()">Edit Layout</button><button class="blue-btn" style="height:140px;" onclick="openPresentationTab('${id}')">Present Mode</button><button class="orange-btn" style="height:140px;" onclick="exportFinalFiles()">Export Pack</button><button class="danger-btn" style="height:140px;" onclick="deleteView('${id}')">Delete View</button></div></div>`;
}

function openPresentationTab(id) { window.open(window.location.origin + window.location.pathname + '?view=' + id, '_blank'); }

// --- THE MODERN EDIT CANVAS SIDEBAR ---
function renderEditCanvas() {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="main-content"><aside class="editor-sidebar" id="sidebar">${renderSidebarContent()}</aside><main class="canvas-area"><div class="canvas-16-9" id="canvas-container" style="background:${currentView.canvasBg || '#ffffff'}"><div id="boxes-layer"></div></div><button class="blue-btn" style="margin-top:30px; width:100%; max-width:300px;" onclick="openMenu('${currentView.createdAt}')">Save & Exit</button></main></div>`;
    drawBoxes();
}

function renderSidebarContent() {
    const isGlobal = selectedBoxIdx === null;
    const excelBtnText = (currentView.data && currentView.data.length > 0) ? 'Change Excel' : 'Upload Excel';
    if(isGlobal) return `<h3>Global</h3><div class="property-group"><h4>View Name</h4><input type="text" value="${currentView.name}" oninput="updateViewName(this.value)"></div><div class="property-group"><h4>Add Box</h4><div style="display:grid; grid-template-columns:1fr 1fr; gap:5px;">${['1x1','2x1','3x1','2x2','4x1','6x1','3x3','4x4'].map(s=>(`<button class="size-btn" onclick="addNewBoxDirectly(${s.split('x')[0]},${s.split('x')[1]})">${s}</button>`)).join('')}</div></div><button class="orange-btn" style="width:100%;" onclick="uploadExcel()">${excelBtnText}</button>`;
    
    const box = currentView.boxes[selectedBoxIdx];
    const hasData = currentView.headers && currentView.headers.length > 0;
    let contentSection = box.isVar ? `<input type="text" placeholder="Search variables..." oninput="handleVarSearch(this.value)" style="margin-bottom:10px;"><div class="pills-container">${currentView.headers.filter(h=>h.toLowerCase().includes(varSearchTerm.toLowerCase())).map(h=>(`<div class="var-pill ${box.textVal===h?'selected':''}" onclick="syncBoxAttr(${selectedBoxIdx},'textVal','${h}')">${h}</div>`)).join('')}</div>` : `<input type="text" value="${box.textVal}" oninput="syncBoxAttr(${selectedBoxIdx},'textVal',this.value)">`;

    return `<div class="sidebar-header"><h3>Edit Box</h3><button onclick="deselectBox()" style="background:none; color:var(--dark); font-size:1.2rem; padding:0;">✕</button></div><div class="property-group"><h4>Label</h4><input type="text" value="${box.title}" oninput="syncBoxAttr(${selectedBoxIdx},'title',this.value)"></div><div class="property-group"><h4>Mode</h4><select onchange="setBoxMode(${selectedBoxIdx},this.value==='var')"><option value="const" ${!box.isVar?'selected':''}>Static</option><option value="var" ${box.isVar?'selected':''}>Variable</option></select></div><div class="property-group"><h4>Content</h4>${contentSection}</div><div class="property-group"><h4>Style</h4><div class="color-grid">${bgPresets.map(c=>(`<div class="circle" style="background:${c}" onclick="syncBoxAttr(${selectedBoxIdx},'bgColor','${c}')"></div>`)).join('')}</div><div class="color-grid" style="margin-top:10px;">${textPresets.map(c=>(`<div class="circle" style="background:${c}" onclick="syncBoxAttr(${selectedBoxIdx},'textColor','${c}')"></div>`)).join('')}</div></div><button class="danger-btn" style="width:100%;" onclick="deleteBox(${selectedBoxIdx})">Delete Box</button>`;
}

// --- RENDER DESIGN CANVAS ---
function addNewBoxDirectly(w, h) {
    currentView.boxes.push({ x: 0, y: 0, w: parseInt(w), h: parseInt(h), title: 'Label', textVal: 'Value', isVar: false, bgColor: '#e2e8f0', textColor: '#000', fontSize: 24 });
    saveAll(); drawBoxes();
}

function drawBoxes() {
    const layer = document.getElementById('boxes-layer'); if(!layer) return;
    layer.innerHTML = '';
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div');
        div.className = `box-instance ${selectedBoxIdx === i ? 'selected-box' : ''}`;
        div.style.cssText = `left:${(box.x/6)*100}%; top:${(box.y/4)*100}%; --w-pct:${(box.w/6)*100}%; --h-pct:${(box.h/4)*100}%; background:${box.bgColor}; color:${box.textColor};`;
        div.innerHTML = `<div class="box-title" style="color:${box.textColor}">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${box.isVar ? `<${box.textVal}>` : box.textVal}</div>`;
        div.onmousedown = (e) => startDragExisting(e, i);
        layer.appendChild(div);
    });
}

// --- DRAG LOGIC (Canvas Only) ---
function startDragExisting(e, idx) {
    e.preventDefault(); dragIdx = idx; dragStartX = e.clientX; dragStartY = e.clientY;
    const original = e.currentTarget; const rect = original.getBoundingClientRect();
    const containerRect = document.getElementById('canvas-container').getBoundingClientRect();
    draggingElement = original.cloneNode(true); draggingElement.classList.add('dragging');
    offset.x = e.clientX - rect.left; offset.y = e.clientY - rect.top;
    draggingElement.style.left = `${rect.left - containerRect.left}px`;
    draggingElement.style.top = `${rect.top - containerRect.top}px`;
    document.getElementById('canvas-container').appendChild(draggingElement);
}

function handleMouseUp(e) {
    if (!draggingElement) return;
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    const gridX = Math.round(((e.clientX - rect.left - offset.x) / rect.width) * 6);
    const gridY = Math.round(((e.clientY - rect.top - offset.y) / rect.height) * 4);
    if (Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) < 5) selectBox(dragIdx);
    else if (gridX >= 0 && gridY >= 0) { currentView.boxes[dragIdx].x = gridX; currentView.boxes[dragIdx].y = gridY; saveAll(); }
    draggingElement.remove(); draggingElement = null; drawBoxes();
}
window.addEventListener('mousemove', (e) => { if (!draggingElement) return; const rect = document.getElementById('canvas-container').getBoundingClientRect(); draggingElement.style.left = `${e.clientX - rect.left - offset.x}px`; draggingElement.style.top = `${e.clientY - rect.top - offset.y}px`; });
window.addEventListener('mouseup', handleMouseUp);

// --- PRESENTATION ENGINE ---
function startPresentation() {
    document.getElementById('app').innerHTML = `<div class="presentation-fullscreen"><div class="slide-fit" id="slide-canvas" style="background:${currentView.canvasBg || '#ffffff'}"></div><div class="presentation-nav"><button onclick="window.close()">${iconHome}</button><span>${currentRowIndex+1} / ${currentView.data.length}</span><button onclick="prevSlide()">${iconLeft}</button><button onclick="nextSlide()">${iconRight}</button></div></div>`;
    renderSlideContent();
    window.onkeydown = (e) => { if (e.key === 'ArrowRight' || e.key === ' ') nextSlide(); if (e.key === 'ArrowLeft') prevSlide(); };
}

function renderSlideContent() {
    const canvas = document.getElementById('slide-canvas'); if (!canvas) return; canvas.innerHTML = '';
    const row = currentView.data[currentRowIndex] || {};
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div'); div.className = 'box-instance';
        div.style.cssText = `left:${(box.x/6)*100}%; top:${(box.y/4)*100}%; --w-pct:${(box.w/6)*100}%; --h-pct:${(box.h/4)*100}%; background:${box.bgColor}; color:${box.textColor}; cursor:pointer;`;
        const val = box.isVar ? (row[box.textVal] || '---') : box.textVal;
        div.innerHTML = `<div class="box-title" style="color:${box.textColor}">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${val}</div>`;
        div.onclick = (e) => { e.stopPropagation(); openLargePopup(i, val); };
        canvas.appendChild(div);
    });
}

function openLargePopup(idx, val) {
    const box = currentView.boxes[idx];
    const overlay = document.createElement('div'); overlay.className = 'popup-overlay';
    overlay.innerHTML = `<div class="detail-modal"><div class="detail-title">${box.title}</div><div class="detail-value">${val}</div><div style="display:flex; gap:20px;">${box.isVar ? `<button class="orange-btn" onclick="editLiveValue(${idx})">Edit Data</button>` : ''}<button class="blue-btn" style="background:var(--slate)" onclick="closePop()">Close</button></div></div>`;
    document.body.appendChild(overlay);
}

// --- REUSED HELPERS ---
function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function nextSlide() { if(currentRowIndex < currentView.data.length - 1) { currentRowIndex++; document.querySelector('.presentation-nav span').innerText = `${currentRowIndex+1} / ${currentView.data.length}`; renderSlideContent(); } }
function prevSlide() { if(currentRowIndex > 0) { currentRowIndex--; document.querySelector('.presentation-nav span').innerText = `${currentRowIndex+1} / ${currentView.data.length}`; renderSlideContent(); } }
function syncBoxAttr(idx, k, v) { currentView.boxes[idx][k] = v; saveAll(); drawBoxes(); if(k==='textVal') refreshSidebar(); }
function updateViewName(v) { currentView.name = v; saveAll(); }
function uploadExcel() { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx'; inp.onchange = (e) => { const reader = new FileReader(); reader.onload = (evt) => { const wb = XLSX.read(evt.target.result, {type:'binary'}); const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); currentView.data = data; currentView.headers = Object.keys(data[0] || {}); saveAll(); renderEditCanvas(); }; reader.readAsBinaryString(e.target.files[0]); }; inp.click(); }
function selectBox(i) { selectedBoxIdx = i; refreshSidebar(); drawBoxes(); }
function deselectBox() { selectedBoxIdx = null; refreshSidebar(); drawBoxes(); }
function setBoxMode(idx, m) { currentView.boxes[idx].isVar = m; saveAll(); refreshSidebar(); drawBoxes(); }
function refreshSidebar() { const sb = document.getElementById('sidebar'); if(sb) sb.innerHTML = renderSidebarContent(); }
function deleteBox(i) { currentView.boxes.splice(i,1); saveAll(); deselectBox(); }
function createNewView() { const name = prompt("Name:"); if(name) { currentView = { name, createdAt: Date.now(), boxes: [], data: [], headers: [], history: [] }; views.push(currentView); saveAll(); renderEditCanvas(); } }
function deleteView(id) { if(confirm("Delete Dashboard?")) { views = views.filter(v => v.createdAt != id); saveAll(); renderHome(); } }
function updateCanvasBg(c) { currentView.canvasBg = c; document.getElementById('canvas-container').style.background = c; saveAll(); }
function handleVarSearch(val) { varSearchTerm = val; refreshSidebar(); }
