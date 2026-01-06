/**
 * DATA VIEW - MASTER ENGINE v38.0
 * Features: Click-vs-Drag Threshold, Instant Editor Refresh, 
 * History Logging, Excel Sync, and PWA Registration.
 */

let views = [];
let currentView = null;
let currentRowIndex = 0;

// Interaction & Drag State
let draggingElement = null;
let isDraggingNew = false;
let dragIdx = -1;
let dragStartX, dragStartY;
let offset = { x: 0, y: 0 };

const bgPresets = ['#ffffff','#f1f5f9','#1e293b','#fee2e2','#dcfce7','#dbeafe','#fef3c7'];
const textPresets = ['#000000','#ffffff','#ef4444','#3b82f6','#10b981','#f97316'];

const iconHome = `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`;
const iconLeft = `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`;
const iconRight = `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`;

// --- INITIALIZATION & PERSISTENCE ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('dataView_master_final');
    if (saved) views = JSON.parse(saved);
    
    // Check for URL parameters (Direct Presentation Link)
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('view');
    if (viewId) {
        currentView = views.find(v => v.createdAt == viewId);
        if (currentView) startPresentation();
        else renderHome();
    } else {
        renderHome();
    }
});

function saveAll() {
    if (currentView) {
        const idx = views.findIndex(v => v.createdAt === currentView.createdAt);
        if (idx !== -1) views[idx] = currentView;
    }
    localStorage.setItem('dataView_master_final', JSON.stringify(views));
}

// --- FILE EXPORTS (Excel Sync + History) ---
function exportFinalFiles() {
    if (!currentView || !currentView.data.length) return alert("No data available to export.");

    // 1. Export Updated Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(currentView.data);
    XLSX.utils.book_append_sheet(wb, ws, "Updated Data");
    XLSX.writeFile(wb, `${currentView.name.replace(/\s+/g, '_')}_Updated.xlsx`);

    // 2. Export History .txt
    const historyHeader = `DATA VIEW HISTORY LOG: ${currentView.name}\nGenerated: ${new Date().toLocaleString()}\n--------------------------------\n\n`;
    const historyBody = (currentView.history || []).map(h => 
        `[${h.time}] Row ${h.row} | Column "${h.col}": Changed "${h.old}" to "${h.new}"`
    ).join('\n');
    
    const blob = new Blob([historyHeader + historyBody], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${currentView.name}_history.txt`;
    a.click();
}

// --- BOX EDITOR (Instant Rerender) ---
function openEditor(idx) {
    const box = currentView.boxes[idx];
    const previewVal = box.isVar ? `<${box.textVal}>` : box.textVal;

    const overlay = document.createElement('div'); overlay.className = 'popup-overlay';
    overlay.innerHTML = `
    <div class="editor-window">
        <div class="editor-preview-area">
            <div id="prev-container">
                <div id="prev" style="width:${box.w*160}px; height:${box.h*160}px; background:${box.bgColor}; color:${box.textColor};">
                    <div id="prev-title" class="box-title" style="margin-top:10px;">${box.title}</div>
                    <div id="prev-txt" class="box-content" style="font-size:${box.fontSize}px;">${previewVal}</div>
                </div>
            </div>
            <p style="color:var(--slate); font-weight:bold; margin-top:10px;">Live Scaled Preview</p>
        </div>
        <div class="editor-controls-area">
            <div class="property-group">
                <h4>Box Label</h4>
                <input type="text" value="${box.title}" oninput="updateBoxAttr(${idx}, 'title', this.value)" style="width:100%; padding:10px; box-sizing:border-box; border-radius:8px; border:1px solid #ddd;">
            </div>

            <div class="property-group">
                <h4>Data Source</h4>
                <div style="display:flex; background:#eee; padding:4px; border-radius:8px; margin-bottom:12px;">
                    <button style="flex:1; background:${!box.isVar?'white':'none'}; border-radius:6px;" onclick="setBoxMode(${idx}, false)">Constant</button>
                    <button style="flex:1; background:${box.isVar?'white':'none'}; border-radius:6px;" onclick="setBoxMode(${idx}, true)">Variable</button>
                </div>
                <div class="pills-container">
                    ${!box.isVar ? 
                        `<input type="text" value="${box.textVal}" oninput="updateBoxAttr(${idx}, 'textVal', this.value)" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">` :
                        currentView.headers.map(h => `<div class="var-pill ${box.textVal === h ? 'selected' : ''}" onclick="updateBoxAttr(${idx},'textVal','${h}')">${h}</div>`).join('')
                    }
                </div>
            </div>

            <div class="property-group">
                <h4>Appearance</h4>
                <div class="color-grid">${bgPresets.map(c => `<div class="circle" style="background:${c}" onclick="updateBoxAttr(${idx},'bgColor','${c}')"></div>`).join('')}</div>
                <div class="color-grid" style="margin-top:10px;">${textPresets.map(c => `<div class="circle" style="background:${c}" onclick="updateBoxAttr(${idx},'textColor','${c}')"></div>`).join('')}</div>
                <div style="display:flex; align-items:center; gap:15px; margin-top:15px;">
                    <button class="blue-btn" onclick="updateBoxAttr(${idx}, 'fontSize', ${box.fontSize - 4})">-</button>
                    <span style="font-weight:bold;">${box.fontSize}px</span>
                    <button class="blue-btn" onclick="updateBoxAttr(${idx}, 'fontSize', ${box.fontSize + 4})">+</button>
                </div>
            </div>

            <button class="primary-btn" onclick="closePop(); drawBoxes();">Save & Close</button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
}

function updateBoxAttr(idx, key, val) {
    currentView.boxes[idx][key] = val;
    saveAll();
    // Instant Rerender of the Editor UI
    closePop();
    openEditor(idx);
}

function setBoxMode(idx, mode) {
    currentView.boxes[idx].isVar = mode;
    saveAll();
    closePop();
    openEditor(idx);
}

// --- CLICK VS DRAG LOGIC ---
function handleMouseUp(e) {
    if (!draggingElement) return;
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    const gridX = Math.round(((e.clientX - rect.left - offset.x) / rect.width) * 6);
    const gridY = Math.round(((e.clientY - rect.top - offset.y) / rect.height) * 4);

    const distanceMoved = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);

    if (distanceMoved < 5 && !isDraggingNew) {
        // Treat as a Click
        draggingElement.remove(); draggingElement = null;
        openChoiceMenu(dragIdx);
    } 
    else if (gridX >= 0 && gridY >= 0 && gridX + parseInt(draggingElement.getAttribute('data-w')) <= 6 && gridY + parseInt(draggingElement.getAttribute('data-h')) <= 4) {
        if (isDraggingNew) {
            const hasH = currentView.headers && currentView.headers.length > 0;
            currentView.boxes.push({ 
                x: gridX, y: gridY, 
                w: parseInt(draggingElement.getAttribute('data-w')), 
                h: parseInt(draggingElement.getAttribute('data-h')), 
                title: 'New Label', 
                textVal: hasH ? currentView.headers[0] : 'Value', 
                isVar: hasH, bgColor: '#ffffff', textColor: '#000', fontSize: 32 
            });
        } else {
            currentView.boxes[dragIdx].x = gridX; currentView.boxes[dragIdx].y = gridY;
        }
        saveAll();
    }
    if (draggingElement) draggingElement.remove();
    draggingElement = null; isDraggingNew = false; drawBoxes();
}

// --- PRESENTATION MODE & SYNC ---
function startPresentation() {
    currentRowIndex = 0;
    renderSlide();
    window.onkeydown = (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
        if (e.key === 'ArrowLeft') prevSlide();
    };
}

function renderSlide() {
    const row = currentView.data[currentRowIndex] || {};
    document.getElementById('app').innerHTML = `
        <div class="presentation-fullscreen">
            <div class="slide-fit" id="slide-canvas"></div>
            <div class="floating-controls">
                <button onclick="renderHome()">${iconHome}</button>
                <span style="font-weight:bold;">${currentRowIndex + 1} / ${currentView.data.length}</span>
                <button onclick="prevSlide()">${iconLeft}</button>
                <button onclick="nextSlide()">${iconRight}</button>
            </div>
        </div>`;
    
    const canvas = document.getElementById('slide-canvas');
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div');
        div.className = 'box-instance';
        div.style.cssText = `left:${(box.x/6)*100}%; top:${(box.y/4)*100}%; width:${(box.w/6)*100}%; height:${(box.h/4)*100}%; background:${box.bgColor}; color:${box.textColor}; cursor:pointer;`;
        
        const val = box.isVar ? (row[box.textVal] || '---') : box.textVal;
        div.innerHTML = `<div class="box-title">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${val}</div>`;
        
        div.onclick = () => openLargePopup(i, val);
        canvas.appendChild(div);
    });
}

function openLargePopup(idx, val) {
    const box = currentView.boxes[idx];
    const overlay = document.createElement('div'); overlay.className = 'popup-overlay';
    overlay.innerHTML = `
        <div class="detail-modal">
            <div class="detail-title">${box.title}</div>
            <div class="detail-value">${val}</div>
            <div class="modal-actions">
                ${box.isVar ? `<button class="orange-btn" onclick="editLiveValue(${idx})">Edit Data</button>` : ''}
                <button class="blue-btn" onclick="closePop()">Close</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

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
        currentView.data[currentRowIndex][box.textVal] = newVal;
        saveAll();
        closePop();
        renderSlide();
    }
}

// --- DRAG LOGIC HELPERS ---
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

function startDragNew(e, w, h) {
    e.preventDefault(); dragStartX = e.clientX; dragStartY = e.clientY;
    const container = document.getElementById('canvas-container');
    draggingElement = document.createElement('div');
    draggingElement.className = 'box-instance dragging';
    draggingElement.style.width = `${(container.offsetWidth/6)*w}px`;
    draggingElement.style.height = `${(container.offsetHeight/4)*h}px`;
    draggingElement.style.background = 'var(--primary)';
    draggingElement.innerHTML = `<div class="box-content" style="color:white">Place</div>`;
    draggingElement.setAttribute('data-w', w); draggingElement.setAttribute('data-h', h);
    offset.x = ((container.offsetWidth/6)*w)/2; offset.y = ((container.offsetHeight/4)*h)/2;
    container.appendChild(draggingElement); isDraggingNew = true;
}

window.addEventListener('mousemove', (e) => {
    if (!draggingElement) return;
    const rect = document.getElementById('canvas-container').getBoundingClientRect();
    draggingElement.style.left = `${e.clientX - rect.left - offset.x}px`;
    draggingElement.style.top = `${e.clientY - rect.top - offset.y}px`;
});
window.addEventListener('mouseup', handleMouseUp);

// --- APP NAVIGATION ---
function renderHome() {
    const app = document.getElementById('app');
    app.innerHTML = `<h1 class="main-heading">Data View</h1>
    <button class="primary-btn" onclick="createNewView()" style="margin-bottom:20px;">+ New Dashboard</button>
    <div id="view-list"></div>`;
    views.forEach(v => {
        const d = document.createElement('div');
        d.className = 'list-item';
        d.style = "background:white; padding:15px; border-radius:15px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; border:1px solid #ddd;";
        d.innerHTML = `<strong>${v.name}</strong><button class="blue-btn" onclick="openMenu('${v.createdAt}')">Open</button>`;
        document.getElementById('view-list').appendChild(d);
    });
}

function openMenu(id) {
    currentView = views.find(v => v.createdAt == id);
    document.getElementById('app').innerHTML = `
        <h1 class="main-heading">${currentView.name}</h1>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
            <button class="blue-btn" onclick="renderEditCanvas()">Edit Layout</button>
            <button class="blue-btn" onclick="startPresentation()">Present Mode</button>
            <button class="orange-btn" onclick="exportFinalFiles()">Export Pack</button>
            <button class="blue-btn" style="background:var(--danger)" onclick="deleteView('${id}')">Delete View</button>
        </div>
        <button onclick="renderHome()" style="width:100%; margin-top:25px; background:none; color:var(--slate); text-decoration:underline;">Back to List</button>
    `;
}

function renderEditCanvas() {
    document.getElementById('app').innerHTML = `
        <div class="canvas-header"><h2>${currentView.name}</h2><button class="orange-btn" onclick="uploadExcel()">Upload Excel</button></div>
        <div class="canvas-16-9" id="canvas-container">
            <div class="grid-overlay"></div><div id="boxes-layer"></div>
        </div>
        <div style="display:flex; justify-content:center; gap:12px; margin-top:20px; flex-wrap:wrap;">
            ${['2x2','2x1','4x1','6x1','3x3','4x4'].map(s => `<button class="size-btn" onmousedown="startDragNew(event, ${s.split('x')[0]}, ${s.split('x')[1]})">${s}</button>`).join('')}
        </div>
        <button class="primary-btn" onclick="openMenu('${currentView.createdAt}')" style="margin-top:20px;">Save & Exit</button>
    `;
    drawBoxes();
}

function drawBoxes() {
    const layer = document.getElementById('boxes-layer'); if(!layer) return;
    layer.innerHTML = '';
    const sample = currentView.data[0] || {};
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div');
        div.className = 'box-instance';
        div.style.cssText = `left:${(box.x/6)*100}%; top:${(box.y/4)*100}%; width:${(box.w/6)*100}%; height:${(box.h/4)*100}%; background:${box.bgColor}; color:${box.textColor};`;
        const val = box.isVar ? `<${box.textVal}>` : box.textVal;
        div.innerHTML = `<div class="box-title">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${val}</div>`;
        div.onmousedown = (e) => startDragExisting(e, i);
        layer.appendChild(div);
    });
}

function uploadExcel() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx';
    inp.onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const wb = XLSX.read(evt.target.result, {type:'binary'});
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            currentView.data = data; currentView.headers = Object.keys(data[0] || {});
            currentView.history = [];
            saveAll(); renderEditCanvas();
        };
        reader.readAsBinaryString(e.target.files[0]);
    };
    inp.click();
}

// --- UTILS ---
function createNewView() {
    const name = prompt("Dashboard Name:", "New View");
    if(!name) return;
    currentView = { name, createdAt: Date.now(), boxes: [], data: [], headers: [], history: [] };
    views.push(currentView); saveAll(); renderEditCanvas();
}
function openChoiceMenu(idx) {
    const overlay = document.createElement('div'); overlay.className = 'popup-overlay';
    overlay.innerHTML = `<div style="background:white; padding:30px; border-radius:24px; text-align:center; box-shadow:0 10px 40px rgba(0,0,0,0.2);">
        <h3>Box Options</h3>
        <button class="blue-btn" style="width:100%; margin-bottom:10px;" onclick="closePop(); openEditor(${idx})">Edit Style/Data</button>
        <button class="orange-btn" style="width:100%; background:var(--danger);" onclick="deleteBox(${idx})">Delete Box</button>
        <button class="blue-btn" style="width:100%; margin-top:10px; background:var(--slate);" onclick="closePop()">Cancel</button>
    </div>`;
    document.body.appendChild(overlay);
}
function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function nextSlide() { if(currentRowIndex < currentView.data.length - 1) { currentRowIndex++; renderSlide(); } }
function prevSlide() { if(currentRowIndex > 0) { currentRowIndex--; renderSlide(); } }
function deleteBox(i) { currentView.boxes.splice(i,1); saveAll(); closePop(); drawBoxes(); }
function deleteView(id) { if(confirm("Delete this entire dashboard?")) { views = views.filter(v => v.createdAt != id); saveAll(); renderHome(); } }

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
