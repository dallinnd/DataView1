/**
 * DATA VIEW - MASTER ENGINE v20.0
 * Features:
 * - Rounded Corners (15px)
 * - Double-Click for Menu
 * - Static Placement Detect (Opens Menu if dropped in same spot)
 * - ZIP Packager & Live Entry Logging
 */

let views = [];
let currentView = null;
let pendingBox = null;
let currentRowIndex = 0;
let changeLog = [];

// Drag State
let draggingElement = null;
let isDraggingNew = false;
let dragIdx = -1;
let offset = { x: 0, y: 0 };

const iconHome = `<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="white"/></svg>`;
const iconLeft = `<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="white"/></svg>`;
const iconRight = `<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="white"/></svg>`;

const bgPresets = ['#ffffff','#f1f5f9','#cbd5e1','linear-gradient(135deg,#60a5fa,#3b82f6)','linear-gradient(135deg,#34d399,#10b981)','linear-gradient(135deg,#fb923c,#f97316)','#fee2e2','#fef3c7','#dcfce7','#1e293b','#334155','#475569'];
const textPresets = ['#000000','#ffffff','#475569','#ef4444','#3b82f6','#10b981'];

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('dataView_master_final');
    if (saved) views = JSON.parse(saved);
    const params = new URLSearchParams(window.location.search);
    if (params.get('view')) {
        document.body.classList.add('view-mode-body');
        currentView = views.find(v => v.createdAt == params.get('view'));
        if (currentView) startPresentation();
    } else { renderHome(); }
});

function saveAll() { localStorage.setItem('dataView_master_final', JSON.stringify(views)); }

// --- DRAG SYSTEM ---

function initDragListeners() {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
}

function handleMouseMove(e) {
    if (!draggingElement) return;
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - offset.x;
    const y = e.clientY - rect.top - offset.y;

    draggingElement.style.left = `${x}px`;
    draggingElement.style.top = `${y}px`;

    const gridX = Math.round((x / rect.width) * 6);
    const gridY = Math.round((y / rect.height) * 4);
    const w = parseInt(draggingElement.getAttribute('data-w'));
    const h = parseInt(draggingElement.getAttribute('data-h'));

    if (gridX < 0 || gridY < 0 || gridX + w > 6 || gridY + h > 4) {
        draggingElement.classList.add('out-of-bounds');
    } else {
        draggingElement.classList.remove('out-of-bounds');
    }
}

function handleMouseUp(e) {
    if (!draggingElement) return;

    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - offset.x;
    const y = e.clientY - rect.top - offset.y;

    const gridX = Math.round((x / rect.width) * 6);
    const gridY = Math.round((y / rect.height) * 4);
    const w = parseInt(draggingElement.getAttribute('data-w'));
    const h = parseInt(draggingElement.getAttribute('data-h'));

    // Check if the drop location is within bounds
    if (gridX >= 0 && gridY >= 0 && gridX + w <= 6 && gridY + h <= 4) {
        if (isDraggingNew) {
            currentView.boxes.push({
                x: gridX, y: gridY, w, h,
                title: 'Title', textVal: 'Value', isVar: false,
                bgColor: '#ffffff', textColor: '#000', fontSize: 36
            });
            saveAll();
        } else {
            // Check if dropped in the EXACT same spot
            const box = currentView.boxes[dragIdx];
            if (gridX === box.x && gridY === box.y) {
                openChoiceMenu(dragIdx);
            } else {
                box.x = gridX;
                box.y = gridY;
                saveAll();
            }
        }
    }

    draggingElement.remove();
    draggingElement = null;
    isDraggingNew = false;
    drawBoxes();
}

function startDragExisting(e, idx) {
    e.preventDefault();
    dragIdx = idx;
    const box = currentView.boxes[idx];
    const original = e.currentTarget;
    const rect = original.getBoundingClientRect();
    const containerRect = document.getElementById('canvas-container').getBoundingClientRect();

    draggingElement = original.cloneNode(true);
    draggingElement.classList.add('dragging');
    draggingElement.style.width = `${rect.width}px`;
    draggingElement.style.height = `${rect.height}px`;
    draggingElement.setAttribute('data-w', box.w);
    draggingElement.setAttribute('data-h', box.h);

    offset.x = e.clientX - rect.left;
    offset.y = e.clientY - rect.top;

    draggingElement.style.left = `${rect.left - containerRect.left}px`;
    draggingElement.style.top = `${rect.top - containerRect.top}px`;

    document.getElementById('canvas-container').appendChild(draggingElement);
    isDraggingNew = false;
}

function startDragNew(e, w, h) {
    e.preventDefault();
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    const btnRect = e.currentTarget.getBoundingClientRect();

    const cellW = container.offsetWidth / 6;
    const cellH = container.offsetHeight / 4;

    draggingElement = document.createElement('div');
    draggingElement.className = 'box-instance dragging';
    draggingElement.style.width = `${cellW * w}px`;
    draggingElement.style.height = `${cellH * h}px`;
    draggingElement.style.background = '#3b82f6';
    draggingElement.innerHTML = `<div class="box-content" style="color:white">Drop on Grid</div>`;

    draggingElement.setAttribute('data-w', w);
    draggingElement.setAttribute('data-h', h);

    offset.x = (cellW * w) / 2;
    offset.y = (cellH * h) / 2;
    
    draggingElement.style.left = `${btnRect.left - rect.left}px`;
    draggingElement.style.top = `${btnRect.top - rect.top}px`;

    container.appendChild(draggingElement);
    isDraggingNew = true;
}

// --- RENDERING ---

function renderEditCanvas() {
    document.getElementById('app').innerHTML = `
        <h1 class="main-heading">Edit Layout</h1>
        <div class="canvas-header">
            <input type="text" value="${currentView.name}" oninput="currentView.name=this.value; saveAll();" style="font-size:1.5rem; font-weight:bold; border:none; outline:none; background:transparent; flex:1;">
            <div class="header-right">
                <button class="orange-btn" onclick="uploadExcel()">Upload Excel</button>
                <button class="blue-btn" onclick="openMenu('${currentView.createdAt}')">Save & Exit</button>
            </div>
        </div>
        <div class="canvas-16-9" id="canvas-container">
            <div class="grid-overlay" id="grid"></div>
            <div id="boxes-layer"></div>
        </div>
        <div style="text-align:center; margin-top:20px; color:var(--slate); font-weight:600;">Dimension Bar (Drag a size to the grid)</div>
        <div style="display:flex; justify-content:center; gap:12px; margin-top:15px; flex-wrap:wrap;">
            ${['2x2','2x1','4x1','6x1','3x3','4x4'].map(s => {
                const parts = s.split('x');
                return `<button class="size-btn" onmousedown="startDragNew(event, ${parts[0]}, ${parts[1]})">${s}</button>`;
            }).join('')}
        </div>`;
    const grid = document.getElementById('grid'); grid.innerHTML = '';
    for (let i = 0; i < 24; i++) grid.appendChild(document.createElement('div')).className = 'grid-cell';
    drawBoxes(); initDragListeners();
}

function drawBoxes() {
    const layer = document.getElementById('boxes-layer'); if (!layer) return; layer.innerHTML = '';
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div'); div.className = 'box-instance';
        div.style.left = `${(box.x/6)*100}%`; div.style.top = `${(box.y/4)*100}%`;
        div.style.width = `${(box.w/6)*100}%`; div.style.height = `${(box.h/4)*100}%`;
        div.style.background = box.bgColor; div.style.color = box.textColor;
        div.innerHTML = `<div class="box-title">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${box.isVar ? '<' + box.textVal + '>' : box.textVal}</div>`;
        
        div.onmousedown = (e) => startDragExisting(e, i);
        // Double Click detection
        div.ondblclick = (e) => { e.stopPropagation(); openChoiceMenu(i); };
        
        layer.appendChild(div);
    });
}

// --- ZIP & LOGGING ---
async function exportData() {
    if (!currentView || !currentView.data) return alert("No data uploaded!");
    const zip = new JSZip(); const baseName = currentView.name.replace(/\s+/g, '_');
    const ws = XLSX.utils.json_to_sheet(currentView.data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Data");
    zip.file(`${baseName}_edited.xlsx`, XLSX.write(wb, { bookType: 'xlsx', type: 'array' }));
    let log = "HISTORY LOG\n================\n"; changeLog.forEach(l => log += `[${l.time}] Row ${l.row} | ${l.col}: "${l.old}" → "${l.new}"\n`);
    zip.file("history.log", log || "No changes recorded.");
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a'); link.href = URL.createObjectURL(content); link.download = `${baseName}_Package.zip`; link.click();
}

function editLiveValue(idx) {
    const box = currentView.boxes[idx]; const old = currentView.data[currentRowIndex][box.textVal];
    const newVal = prompt(`Update ${box.textVal}:`, old);
    if (newVal !== null && newVal !== old) {
        changeLog.push({ time: new Date().toLocaleTimeString(), row: currentRowIndex+1, col: box.textVal, old, new: newVal });
        currentView.data[currentRowIndex][box.textVal] = newVal; saveAll(); closePop(); renderSlide();
    }
}

// --- HELPERS ---
function renderHome() {
    const app = document.getElementById('app');
    app.innerHTML = `<h1 class="main-heading">Data View</h1><button class="primary-btn" onclick="createNewView()">+ Create New View</button><h2 style="text-align:center; margin-top:40px; color:#475569; font-size:1rem; text-transform:uppercase; letter-spacing:0.1em;">Existing Displays</h2><div id="view-list"></div>`;
    views.sort((a,b) => b.updatedAt - a.updatedAt).forEach(v => {
        const div = document.createElement('div'); div.style = "background:white; padding:20px; border-radius:18px; margin-top:12px; display:flex; justify-content:space-between; align-items:center; border:1px solid #e2e8f0;";
        div.innerHTML = `<div><strong>${v.name}</strong></div><button class="blue-btn" onclick="openMenu('${v.createdAt}')">Open</button>`;
        document.getElementById('view-list').appendChild(div);
    });
}
function openMenu(id) {
    currentView = views.find(v => v.createdAt == id);
    document.getElementById('app').innerHTML = `<h1 class="main-heading">${currentView.name}</h1><div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:20px;"><button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="exportData()">Export (.zip)</button><button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="window.open(window.location.origin+window.location.pathname+'?view=${id}','_blank')">View Presentation</button><button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="renderEditCanvas()">Edit Layout</button><button class="blue-btn" style="height:140px; font-size:1.2rem; background:var(--danger);" onclick="deleteView('${id}')">Delete View</button></div><button onclick="renderHome()" style="margin-top:30px; width:100%; background:none; text-decoration:underline; border:none; color:var(--slate);">Back to Home</button>`;
}
function openChoiceMenu(idx) {
    const overlay = document.createElement('div'); overlay.className = 'popup-overlay';
    overlay.innerHTML = `<div class="choice-window" style="background:white; padding:30px; border-radius:24px; text-align:center;"><h3>Box Options</h3><div style="display:flex; gap:15px; justify-content:center; margin-top:20px;"><button class="blue-btn" onclick="closePop(); openEditor(${idx})">Edit</button><button class="primary-btn" style="background:var(--danger)" onclick="deleteBox(${idx})">Delete</button><button class="blue-btn" style="background:var(--slate)" onclick="closePop()">Back</button></div></div>`;
    document.body.appendChild(overlay);
}
function openEditor(idx) {
    const box = currentView.boxes[idx]; const overlay = document.createElement('div'); overlay.className = 'popup-overlay';
    const renderContent = () => {
        if (!box.isVar) return `<input type="text" value="${box.textVal}" oninput="updateBoxValue(${idx}, this.value)" style="width:100%; padding:12px; border-radius:8px; border:1px solid #ddd;">`;
        if (!currentView.headers || currentView.headers.length === 0) return `<button class="orange-btn" style="width:100%" onclick="uploadExcelFromEditor(${idx})">Upload Excel to see Variables</button>`;
        return `<div class="pills-container">${currentView.headers.map(h => `<div class="var-pill ${box.textVal === h ? 'selected' : ''}" onclick="updateBoxValue(${idx}, '${h}')">${h}</div>`).join('')}</div>`;
    };
    overlay.innerHTML = `<div class="editor-window"><div class="editor-preview-area"><input type="text" value="${box.title}" oninput="currentView.boxes[${idx}].title=this.value; refreshUI(${idx})" style="font-size:1.5rem; text-align:center; font-weight:bold; border:none; background:transparent; border-bottom:2px solid var(--orange); outline:none; margin-bottom:10px; width:80%;"><div id="prev" class="box-instance" style="--box-w:${box.w}; --box-h:${box.h}; background:${box.bgColor}; color:${box.textColor}; border-radius:15px; position:relative;"><div class="box-title" style="font-size:28px;">${box.title}</div><div id="prev-txt" class="box-content" style="font-size:${box.fontSize}px;">${box.isVar ? '<'+box.textVal+'>' : box.textVal}</div></div></div><div class="editor-controls-area"><div class="property-group"><h4>Background</h4><div class="color-grid">${bgPresets.map(c => `<div class="circle" style="background:${c}" onclick="applyAttr(${idx},'bgColor','${c}')"></div>`).join('')}</div><h4 style="margin-top:15px;">Text Color</h4><div class="color-grid">${textPresets.map(c => `<div class="circle" style="background:${c}" onclick="applyAttr(${idx},'textColor','${c}')"></div>`).join('')}</div></div><div class="property-group"><h4>Font Size</h4><div class="font-controls"><button class="font-btn" onclick="adjustFont(${idx},-2)">-</button><span id="sz" style="font-size:1.4rem; font-weight:bold;">${box.fontSize}</span><button class="font-btn" onclick="adjustFont(${idx},2)">+</button></div></div><div class="property-group"><h4>Content</h4><div class="segmented-control"><button class="segment-btn ${!box.isVar ? 'active' : ''}" onclick="setMode(${idx},false)">Constant</button><button class="segment-btn ${box.isVar ? 'active' : ''}" onclick="setMode(${idx},true)">Variable</button></div><div id="ctrls">${renderContent()}</div></div><button class="primary-btn" onclick="closePop(); drawBoxes();">Save Box</button></div></div>`;
    document.body.appendChild(overlay);
}
function startPresentation() { currentRowIndex = 0; renderSlide(); window.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === ' ') nextSlide(); if (e.key === 'ArrowLeft') prevSlide(); if (e.key === 'Escape') window.close(); }); }
function renderSlide() {
    const row = currentView.data[currentRowIndex] || {};
    document.getElementById('app').innerHTML = `<div class="presentation-fullscreen"><div class="slide-fit" id="slide-canvas"></div><div class="floating-controls"><button class="icon-btn" onclick="window.close()">${iconHome}</button><div class="slide-counter">${currentRowIndex+1}/${currentView.data.length}</div><div class="nav-group-right"><button class="icon-btn" onclick="prevSlide()">${iconLeft}</button><button class="icon-btn" onclick="nextSlide()">${iconRight}</button></div></div></div>`;
    const canvas = document.getElementById('slide-canvas');
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div'); div.className = 'box-instance'; div.style.left = `${(box.x/6)*100}%`; div.style.top = `${(box.y/4)*100}%`; div.style.width = `${(box.w/6)*100}%`; div.style.height = `${(box.h/4)*100}%`; div.style.background = box.bgColor; div.style.color = box.textColor;
        div.innerHTML = `<div class="box-title">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${box.isVar ? (row[box.textVal] || '---') : box.textVal}</div>`;
        div.onclick = () => openDetailModal(i, box.isVar ? (row[box.textVal] || '---') : box.textVal); canvas.appendChild(div);
    });
}
function openDetailModal(idx, val) {
    const box = currentView.boxes[idx]; const overlay = document.createElement('div'); overlay.className = 'popup-overlay'; const editBtn = box.isVar ? `<button class="orange-btn" onclick="editLiveValue(${idx})">Edit Value</button>` : ''; overlay.innerHTML = `<div class="detail-modal"><div style="display:flex; justify-content:space-between; align-items:center;"><h2>${box.title}</h2><div style="font-size:2rem; cursor:pointer;" onclick="closePop()">✕</div></div><div class="detail-scroll-content">${val}</div><div style="display:flex; justify-content:flex-end; gap:10px;">${editBtn}<button class="blue-btn" style="background:var(--slate)" onclick="closePop()">Close</button></div></div>`; document.body.appendChild(overlay);
}
function createNewView() { currentView = { name: 'New View', createdAt: Date.now(), updatedAt: Date.now(), boxes: [], headers: [], data: [] }; views.push(currentView); renderEditCanvas(); }
function selectSize(w, h) { pendingBox = {w, h}; }
function applyAttr(idx, prp, val) { currentView.boxes[idx][prp] = val; refreshUI(idx); }
function adjustFont(idx, d) { currentView.boxes[idx].fontSize += d; document.getElementById('sz').innerText = currentView.boxes[idx].fontSize; refreshUI(idx); }
function setMode(idx, m) { currentView.boxes[idx].isVar = m; saveAll(); closePop(); openEditor(idx); }
function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function deleteBox(i) { currentView.boxes.splice(i,1); saveAll(); closePop(); drawBoxes(); }
function deleteView(id) { if(confirm("Delete View?")) { views=views.filter(v=>v.createdAt!=id); saveAll(); renderHome(); } }
function nextSlide() { if (currentRowIndex < currentView.data.length - 1) { currentRowIndex++; renderSlide(); } }
function prevSlide() { if (currentRowIndex > 0) { currentRowIndex--; renderSlide(); } }
function refreshUI(idx) { const box = currentView.boxes[idx]; const p = document.getElementById('prev'); const t = document.getElementById('prev-txt'); if(p && t) { p.style.background = box.bgColor; p.style.color = box.textColor; t.innerText = box.isVar ? `<${box.textVal}>` : box.textVal; t.style.fontSize = box.fontSize + 'px'; const ti = p.querySelector('.box-title'); if(ti) ti.innerText = box.title; } saveAll(); }
function updateBoxValue(idx, val) { currentView.boxes[idx].textVal = val; refreshUI(idx); if(currentView.boxes[idx].isVar && currentView.headers.length > 0) { const c = document.getElementById('ctrls'); if(c) c.innerHTML = `<div class="pills-container">${currentView.headers.map(h => `<div class="var-pill ${currentView.boxes[idx].textVal === h ? 'selected' : ''}" onclick="updateBoxValue(${idx}, '${h}')">${h}</div>`).join('')}</div>`; } }
function uploadExcel() { const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx,.xls'; input.onchange = (e) => { const reader = new FileReader(); reader.onload = (evt) => { const wb = XLSX.read(evt.target.result, {type:'binary'}); const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); currentView.headers = Object.keys(data[0] || {}); currentView.data = data; saveAll(); renderEditCanvas(); }; reader.readAsBinaryString(e.target.files[0]); }; input.click(); }
function uploadExcelFromEditor(idx) { const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx,.xls'; input.onchange = (e) => { const reader = new FileReader(); reader.onload = (evt) => { const wb = XLSX.read(evt.target.result, {type:'binary'}); const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); currentView.headers = Object.keys(data[0] || {}); currentView.data = data; saveAll(); closePop(); openEditor(idx); }; reader.readAsBinaryString(e.target.files[0]); }; input.click(); }
