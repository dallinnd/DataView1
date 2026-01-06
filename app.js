/**
 * DATA VIEW PRO - MASTER ENGINE v52.0
 */

let views = [];
let currentView = null;
let currentRowIndex = 0;
let selectedBoxIdx = null;
let varSearchTerm = ""; 

let draggingElement = null;
let dragIdx = -1;
let dragStartX, dragStartY;
let offset = { x: 0, y: 0 };

const bgPresets = ['#ffffff','#f8fafc','#f1f5f9','#e2e8f0','#cbd5e1','#94a3b8','#1e293b','#0f172a','#fee2e2','#ffedd5','#fef9c3','#dcfce7','#d1fae5','#dbeafe','#e0e7ff','#f5f3ff','linear-gradient(135deg, #667eea 0%, #764ba2 100%)','linear-gradient(135deg, #00b09b 0%, #96c93d 100%)','linear-gradient(135deg, #f093fb 0%, #f5576c 100%)','linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'];
const textPresets = ['#000000','#ffffff','#ef4444','#3b82f6','#10b981','#f97316','#8b5cf6','#ec4899'];

const iconHome = `<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`;
const iconLeft = `<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`;
const iconRight = `<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`;

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('dataView_v52');
    if (saved) views = JSON.parse(saved);
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('view');
    if (viewId) {
        currentView = views.find(v => v.createdAt == viewId);
        if (currentView) startPresentation(); else renderHome();
    } else { renderHome(); }
});

function triggerSave() {
    localStorage.setItem('dataView_v52', JSON.stringify(views));
    const badge = document.getElementById('save-badge');
    if (badge) { badge.style.opacity = "1"; setTimeout(() => badge.style.opacity = "0", 1000); }
}

// --- MENUS ---
function renderHome() {
    selectedBoxIdx = null;
    const app = document.getElementById('app');
    app.innerHTML = `<div class="home-container"><h1 class="main-heading">Data View</h1><button class="primary-btn" onclick="createNewView()">+ Create New View</button><div id="view-list" style="margin-top:40px;"></div></div>`;
    views.forEach(v => {
        const d = document.createElement('div'); d.className = 'view-card';
        d.innerHTML = `<strong>${v.name}</strong><button class="blue-btn" onclick="openMenu('${v.createdAt}')">Open View</button>`;
        document.getElementById('view-list').appendChild(d);
    });
}

function openMenu(id) {
    currentView = views.find(v => v.createdAt == id);
    const app = document.getElementById('app');
    app.innerHTML = `<div class="home-container"><button class="blue-btn" style="background:var(--slate); margin-bottom:20px; align-self:flex-start;" onclick="renderHome()">← Back</button><h1 class="main-heading" style="margin-top:0;">${currentView.name}</h1><div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;"><button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="renderEditCanvas()">Edit Layout</button><button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="openPresentationTab('${id}')">Present Mode</button><button class="orange-btn" style="height:140px; font-size:1.2rem;" onclick="exportFinalFiles()">Export Pack</button><button class="danger-btn" style="height:140px; font-size:1.2rem;" onclick="deleteView('${id}')">Delete View</button></div></div>`;
}

function openPresentationTab(id) { window.open(window.location.origin + window.location.pathname + '?view=' + id, '_blank'); }

// --- SIDEBAR EDITOR ---
function renderEditCanvas() {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="main-content"><aside class="editor-sidebar" id="sidebar">${renderSidebarContent()}</aside><main class="canvas-area"><div class="canvas-16-9" id="canvas-container" style="background:${currentView.canvasBg || '#ffffff'}"><div class="grid-overlay"></div><div id="boxes-layer"></div></div><button class="blue-btn" style="margin-top:30px; width:100%; max-width:300px;" onclick="openMenu('${currentView.createdAt}')">Save & Exit</button></main></div>`;
    drawBoxes();
}

function renderSidebarContent() {
    const isGlobal = selectedBoxIdx === null;
    const excelBtnText = (currentView.data && currentView.data.length > 0) ? 'Change Excel' : 'Upload Excel Sheet';
    return `<div class="sidebar-header"><h3>${isGlobal ? 'Global' : 'Edit Box'}</h3><div id="save-badge">Saved</div>${!isGlobal ? '<button onclick="deselectBox()" style="background:none; color:var(--dark); font-size:1.2rem; padding:0;">✕</button>' : ''}</div>${isGlobal ? renderGlobalControls(excelBtnText) : renderBoxControls()}`;
}

function renderGlobalControls(btnText) {
    return `<div class="property-group"><h4>View Name</h4><input type="text" value="${currentView.name}" oninput="updateViewName(this.value)"></div><div class="property-group"><h4>Add New Box</h4><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">${['1x1','2x1','3x1','2x2','4x1','6x1','3x3','4x4'].map(s => `<button class="size-btn" onclick="addNewBoxDirectly(${s.split('x')[0]}, ${s.split('x')[1]})">${s}</button>`).join('')}</div></div><div class="property-group"><h4>Canvas Theme</h4><div class="color-grid">${bgPresets.map(c => `<div class="circle" style="background:${c}" onclick="updateCanvasBg('${c}')"></div>`).join('')}</div></div><button class="orange-btn" style="width:100%;" onclick="uploadExcel()">${btnText}</button>`;
}

function renderBoxControls() {
    const box = currentView.boxes[selectedBoxIdx];
    const hasData = currentView.headers && currentView.headers.length > 0;
    let contentSection = '';
    if (!box.isVar) contentSection = `<input type="text" value="${box.textVal}" oninput="syncBoxAttr(${selectedBoxIdx}, 'textVal', this.value)">`;
    else if (hasData) {
        const filtered = currentView.headers.filter(h => h.toLowerCase().includes(varSearchTerm.toLowerCase()));
        contentSection = `<input type="text" placeholder="Search variables..." value="${varSearchTerm}" oninput="handleVarSearch(this.value)" style="margin-bottom:10px;"><div class="pills-container" id="pills-box">${filtered.map(h => `<div class="var-pill ${box.textVal === h ? 'selected' : ''}" onclick="syncBoxAttr(${selectedBoxIdx}, 'textVal', '${h}')">${h}</div>`).join('')}</div>`;
    } else contentSection = `<button class="orange-btn" style="width:100%; font-size:0.8rem;" onclick="uploadExcel()">Upload Excel Data First</button>`;

    return `<div class="property-group"><h4>Label</h4><input type="text" value="${box.title}" oninput="syncBoxAttr(${selectedBoxIdx}, 'title', this.value)"></div><div class="property-group"><h4>Mode</h4><select onchange="setBoxMode(${selectedBoxIdx}, this.value === 'var')"><option value="const" ${!box.isVar ? 'selected' : ''}>Static</option><option value="var" ${box.isVar ? 'selected' : ''}>Variable</option></select></div><div class="property-group"><h4>Content</h4>${contentSection}</div><div class="property-group"><h4>Appearance</h4><div class="color-grid">${bgPresets.map(c => `<div class="circle" style="background:${c}" onclick="syncBoxAttr(${selectedBoxIdx}, 'bgColor', '${c}')"></div>`).join('')}</div><p style="margin-top:10px; font-size:0.7rem;">Text Color</p><div class="color-grid">${textPresets.map(c => `<div class="circle" style="background:${c}" onclick="syncBoxAttr(${selectedBoxIdx}, 'textColor', '${c}')"></div>`).join('')}</div><div style="display:flex; align-items:center; gap:10px; margin-top:20px;"><button class="blue-btn" style="padding:8px 15px;" onclick="syncBoxAttr(${selectedBoxIdx}, 'fontSize', ${box.fontSize - 4})">-</button><span>${box.fontSize}px</span><button class="blue-btn" style="padding:8px 15px;" onclick="syncBoxAttr(${selectedBoxIdx}, 'fontSize', ${box.fontSize + 4})">+</button></div></div><button class="danger-btn" style="width:100%;" onclick="deleteBox(${selectedBoxIdx})">Delete Box</button>`;
}

// --- NEW BOX LOGIC (Top Left Spawn) ---
function addNewBoxDirectly(w, h) {
    const hasH = currentView.headers && currentView.headers.length > 0;
    currentView.boxes.push({ x: 0, y: 0, w: parseInt(w), h: parseInt(h), title: 'Label', textVal: hasH ? currentView.headers[0] : 'Value', isVar: hasH, bgColor: 'var(--light-grey)', textColor: '#000', fontSize: 24 });
    triggerSave();
    drawBoxes();
}

// --- RENDER DESIGN ---
function drawBoxes() {
    const layer = document.getElementById('boxes-layer'); if(!layer) return;
    layer.innerHTML = '';
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div');
        div.className = `box-instance ${selectedBoxIdx === i ? 'selected-box' : ''}`;
        div.style.cssText = `left:${(box.x/6)*100}%; top:${(box.y/4)*100}%; --w-pct:${(box.w/6)*100}%; --h-pct:${(box.h/4)*100}%; background:${box.bgColor || 'var(--light-grey)'}; color:${box.textColor || 'black'};`;
        const val = box.isVar ? "Variable" : box.textVal;
        div.innerHTML = `<div class="box-title" style="color:${box.textColor || 'black'};">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${val}</div>`;
        div.onmousedown = (e) => startDragExisting(e, i);
        layer.appendChild(div);
    });
}

// --- DRAG (CANVAS ONLY) ---
function startDragExisting(e, idx) {
    e.preventDefault(); dragIdx = idx; dragStartX = e.clientX; dragStartY = e.clientY;
    const original = e.currentTarget; const rect = original.getBoundingClientRect();
    const containerRect = document.getElementById('canvas-container').getBoundingClientRect();
    draggingElement = original.cloneNode(true); draggingElement.classList.add('dragging');
    draggingElement.setAttribute('data-w', currentView.boxes[idx].w);
    draggingElement.setAttribute('data-h', currentView.boxes[idx].h);
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
    else if (gridX >= 0 && gridY >= 0 && gridX + currentView.boxes[dragIdx].w <= 6 && gridY + currentView.boxes[dragIdx].h <= 4) {
        currentView.boxes[dragIdx].x = gridX; currentView.boxes[dragIdx].y = gridY; triggerSave();
    }
    draggingElement.remove(); draggingElement = null; drawBoxes();
}

window.addEventListener('mousemove', (e) => { if (!draggingElement) return; const rect = document.getElementById('canvas-container').getBoundingClientRect(); draggingElement.style.left = `${e.clientX - rect.left - offset.x}px`; draggingElement.style.top = `${e.clientY - rect.top - offset.y}px`; });
window.addEventListener('mouseup', handleMouseUp);

// --- PRESENTATION ---
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
        div.style.cssText = `left:${(box.x/6)*100}%; top:${(box.y/4)*100}%; --w-pct:${(box.w/6)*100}%; --h-pct:${(box.h/4)*100}%; background:${box.bgColor || 'white'}; color:${box.textColor || 'black'}; cursor:pointer;`;
        const val = box.isVar ? (row[box.textVal] || '---') : box.textVal;
        div.innerHTML = `<div class="box-title" style="color:${box.textColor || 'black'};">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${val}</div>`;
        div.onclick = (e) => { e.stopPropagation(); openLargePopup(i, val); };
        canvas.appendChild(div);
    });
}
function openLargePopup(idx, val) { const box = currentView.boxes[idx]; const overlay = document.createElement('div'); overlay.className = 'popup-overlay'; overlay.innerHTML = `<div class="detail-modal"><div style="font-size:1.4rem; color:var(--slate); margin-bottom:10px; text-transform:uppercase;">${box.title}</div><div style="font-size:6rem; font-weight:900; margin-bottom:40px; line-height:1; word-break:break-all; color:${box.textColor}">${val}</div><div style="display:flex; gap:20px;">${box.isVar ? `<button class="orange-btn" onclick="editLiveValue(${idx})">Edit Value</button>` : ''}<button class="blue-btn" style="background:var(--slate)" onclick="closePop()">Close</button></div></div>`; document.body.appendChild(overlay); }

// --- HELPERS ---
function handleVarSearch(val) { varSearchTerm = val; const pillsBox = document.getElementById('pills-box'); if(pillsBox) { const filtered = currentView.headers.filter(h => h.toLowerCase().includes(varSearchTerm.toLowerCase())); pillsBox.innerHTML = filtered.map(h => `<div class="var-pill ${currentView.boxes[selectedBoxIdx].textVal === h ? 'selected' : ''}" onclick="syncBoxAttr(${selectedBoxIdx}, 'textVal', '${h}')">${h}</div>`).join(''); } }
function updateViewName(val) { currentView.name = val; triggerSave(); }
function updateCanvasBg(c) { currentView.canvasBg = c; document.getElementById('canvas-container').style.background = c; triggerSave(); }
function deselectBox() { selectedBoxIdx = null; varSearchTerm = ""; refreshSidebar(); drawBoxes(); }
function selectBox(idx) { selectedBoxIdx = idx; varSearchTerm = ""; refreshSidebar(); drawBoxes(); }
function syncBoxAttr(idx, key, val) { currentView.boxes[idx][key] = val; triggerSave(); drawBoxes(); if(key==='fontSize') refreshSidebar(); }
function setBoxMode(idx, mode) { currentView.boxes[idx].isVar = mode; triggerSave(); refreshSidebar(); drawBoxes(); }
function refreshSidebar() { const sb = document.getElementById('sidebar'); if(sb) sb.innerHTML = renderSidebarContent(); }
function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function nextSlide() { if(currentRowIndex < currentView.data.length - 1) { currentRowIndex++; document.querySelector('.presentation-nav span').innerText = `${currentRowIndex+1} / ${currentView.data.length}`; renderSlideContent(); } }
function prevSlide() { if(currentRowIndex > 0) { currentRowIndex--; document.querySelector('.presentation-nav span').innerText = `${currentRowIndex+1} / ${currentView.data.length}`; renderSlideContent(); } }
function deleteView(id) { if(confirm("Delete View?")) { views = views.filter(v => v.createdAt != id); triggerSave(); renderHome(); } }
function deleteBox(i) { currentView.boxes.splice(i,1); triggerSave(); deselectBox(); }
function createNewView() { const name = prompt("Name:", "New View"); if(name) { currentView = { name, createdAt: Date.now(), boxes: [], data: [], headers: [], history: [] }; views.push(currentView); triggerSave(); renderEditCanvas(); } }
function editLiveValue(idx) { const box = currentView.boxes[idx]; const oldVal = currentView.data[currentRowIndex][box.textVal] || '---'; const newVal = prompt(`Edit ${box.textVal}:`, oldVal); if (newVal !== null && newVal !== oldVal) { if (!currentView.history) currentView.history = []; currentView.history.push({ time: new Date().toLocaleTimeString(), row: currentRowIndex+1, col: box.textVal, old: oldVal, new: newVal }); currentView.data[currentRowIndex][box.textVal] = newVal; triggerSave(); closePop(); renderSlideContent(); } }
function exportFinalFiles() { if (!currentView || !currentView.data.length) return alert("No data"); const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(currentView.data); XLSX.utils.book_append_sheet(wb, ws, "Data"); XLSX.writeFile(wb, `${currentView.name}_Updated.xlsx`); const log = (currentView.history || []).map(h => `[${h.time}] Row ${h.row} | ${h.col}: ${h.old} -> ${h.new}`).join('\n'); const blob = new Blob([log], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${currentView.name}_history.txt`; a.click(); }
function uploadExcel() { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx'; inp.onchange = (e) => { const reader = new FileReader(); reader.onload = (evt) => { const wb = XLSX.read(evt.target.result, {type:'binary'}); const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); currentView.data = data; currentView.headers = Object.keys(data[0] || {}); triggerSave(); renderEditCanvas(); }; reader.readAsBinaryString(e.target.files[0]); }; inp.click(); }
