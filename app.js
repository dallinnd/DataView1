/**
 * DATA VIEW PRO - MASTER ENGINE v41.0
 * Features: Sidebar Editor, Contextual Controls, 1x1 & 3x1 Sizes, 
 * Red Delete Buttons, Editable View Name, Excel/History Sync.
 */

let views = [];
let currentView = null;
let currentRowIndex = 0;
let selectedBoxIdx = null;

// Interaction State
let draggingElement = null;
let isDraggingNew = false;
let dragIdx = -1;
let dragStartX, dragStartY;
let offset = { x: 0, y: 0 };

const bgPresets = ['#ffffff','#f8fafc','#1e293b','linear-gradient(135deg, #667eea 0%, #764ba2 100%)','linear-gradient(135deg, #00b09b 0%, #96c93d 100%)','linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'];
const textPresets = ['#0f172a', '#ffffff', '#2563eb', '#dc2626', '#16a34a'];

// --- STORAGE ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('dataView_master_v41');
    if (saved) views = JSON.parse(saved);
    renderHome();
});

function saveAll() {
    localStorage.setItem('dataView_master_v41', JSON.stringify(views));
}

// --- APP NAVIGATION ---
function renderHome() {
    selectedBoxIdx = null;
    const app = document.getElementById('app');
    app.innerHTML = `
        <div style="padding:60px; text-align:center; max-width:800px; margin:0 auto;">
            <h1 class="main-heading">Data View</h1>
            <button class="primary-btn" onclick="createNewView()">+ Create New View</button>
            <div id="view-list" style="margin-top:40px;"></div>
        </div>`;
    views.forEach(v => {
        const d = document.createElement('div');
        d.style = "background:white; padding:25px; border-radius:24px; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 10px 20px rgba(0,0,0,0.03);";
        d.innerHTML = `<strong>${v.name}</strong><button class="blue-btn" onclick="openMenu('${v.createdAt}')">Open</button>`;
        document.getElementById('view-list').appendChild(d);
    });
}

function openMenu(id) {
    currentView = views.find(v => v.createdAt == id);
    const app = document.getElementById('app');
    app.innerHTML = `
        <div style="padding:40px; max-width:850px; margin: 0 auto;">
            <button class="blue-btn" style="background:var(--slate); padding:10px 20px; font-size:0.8rem;" onclick="renderHome()">← Back to List</button>
            <h1 class="main-heading" style="margin:20px 0 40px 0;">${currentView.name}</h1>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:25px;">
                <button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="renderEditCanvas()">Edit Layout</button>
                <button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="startPresentation()">Present Mode</button>
                <button class="orange-btn" style="height:140px; font-size:1.2rem;" onclick="exportFinalFiles()">Export Final Pack</button>
                <button class="danger-btn" style="height:140px; font-size:1.2rem;" onclick="deleteView('${id}')">Delete View</button>
            </div>
        </div>`;
}

// --- CANVAS & SIDEBAR ENGINE ---
function renderEditCanvas() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="main-content">
            <aside class="editor-sidebar" id="sidebar">${renderSidebarContent()}</aside>
            <main class="canvas-area">
                <input type="text" class="canvas-title-input" value="${currentView.name}" oninput="updateViewName(this.value)" placeholder="Dashboard Name">
                <div class="canvas-16-9" id="canvas-container" style="background:${currentView.canvasBg || '#ffffff'}">
                    <div class="grid-overlay"></div>
                    <div id="boxes-layer"></div>
                </div>
                <button class="blue-btn" style="margin-top:30px; width:100%; max-width:300px;" onclick="openMenu('${currentView.createdAt}')">Finish & Save</button>
            </main>
        </div>`;
    drawBoxes();
}

function renderSidebarContent() {
    if (selectedBoxIdx === null) {
        return `
            <h3>Global Dashboard</h3>
            <div class="property-group">
                <h4>Add New Box</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    ${['1x1','2x1','3x1','2x2','4x1','6x1','3x3','4x4'].map(s => `
                        <button class="size-btn" onmousedown="startDragNew(event, ${s.split('x')[0]}, ${s.split('x')[1]})">${s}</button>
                    `).join('')}
                </div>
            </div>
            <div class="property-group">
                <h4>Data Sync</h4>
                <button class="orange-btn" style="width:100%; padding:15px;" onclick="uploadExcel()">Upload Excel Data</button>
            </div>
            <div class="property-group">
                <h4>Canvas Background</h4>
                <div class="color-grid">${bgPresets.map(c => `<div class="circle" style="background:${c}" onclick="updateCanvasBg('${c}')"></div>`).join('')}</div>
            </div>`;
    } else {
        const box = currentView.boxes[selectedBoxIdx];
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3>Edit Box</h3>
                <button onclick="deselectBox()" style="background:none; color:var(--slate); font-size:1.5rem; padding:0;">✕</button>
            </div>
            <div class="property-group">
                <h4>Label</h4>
                <input type="text" value="${box.title}" oninput="syncBoxAttr(${selectedBoxIdx}, 'title', this.value)" style="width:100%; padding:12px; border-radius:10px; border:1px solid #ddd;">
            </div>
            <div class="property-group">
                <h4>Data Mode</h4>
                <select onchange="setBoxMode(${selectedBoxIdx}, this.value === 'var')" style="width:100%; padding:12px; border-radius:10px; border:1px solid #ddd;">
                    <option value="const" ${!box.isVar ? 'selected' : ''}>Static Text</option>
                    <option value="var" ${box.isVar ? 'selected' : ''}>Excel Variable</option>
                </select>
            </div>
            <div class="property-group">
                <h4>Content</h4>
                ${box.isVar ? `
                    <div class="pills-container">${currentView.headers.map(h => `
                        <div class="var-pill ${box.textVal === h ? 'selected' : ''}" onclick="syncBoxAttr(${selectedBoxIdx}, 'textVal', '${h}')">${h}</div>
                    `).join('')}</div>
                ` : `
                    <input type="text" value="${box.textVal}" oninput="syncBoxAttr(${selectedBoxIdx}, 'textVal', this.value)" style="width:100%; padding:12px; border-radius:10px; border:1px solid #ddd;">
                `}
            </div>
            <div class="property-group">
                <h4>Font Size</h4>
                <div style="display:flex; align-items:center; gap:15px;">
                    <button class="blue-btn" style="padding:10px 20px;" onclick="syncBoxAttr(${selectedBoxIdx}, 'fontSize', ${box.fontSize - 4})">-</button>
                    <span style="font-weight:bold;">${box.fontSize}px</span>
                    <button class="blue-btn" style="padding:10px 20px;" onclick="syncBoxAttr(${selectedBoxIdx}, 'fontSize', ${box.fontSize + 4})">+</button>
                </div>
            </div>
            <button class="danger-btn" style="margin-top:auto; width:100%;" onclick="deleteBox(${selectedBoxIdx})">Delete Box</button>`;
    }
}

// --- BOX ENGINE ---
function drawBoxes() {
    const layer = document.getElementById('boxes-layer'); if(!layer) return;
    layer.innerHTML = '';
    const sample = currentView.data[0] || {};
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div');
        div.className = `box-instance ${selectedBoxIdx === i ? 'selected-box' : ''}`;
        div.style.cssText = `left:${(box.x/6)*100}%; top:${(box.y/4)*100}%; --w-pct:${(box.w/6)*100}%; --h-pct:${(box.h/4)*100}%; background:${box.bgColor}; color:${box.textColor};`;
        const val = box.isVar ? `<${box.textVal}>` : box.textVal;
        div.innerHTML = `<div class="box-title">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${val}</div>`;
        div.onmousedown = (e) => startDragExisting(e, i);
        layer.appendChild(div);
    });
}

// --- SYNC HELPERS ---
function updateViewName(val) { currentView.name = val; saveAll(); }
function updateCanvasBg(c) { currentView.canvasBg = c; document.getElementById('canvas-container').style.background = c; saveAll(); }
function deselectBox() { selectedBoxIdx = null; refreshSidebar(); drawBoxes(); }
function selectBox(idx) { selectedBoxIdx = idx; refreshSidebar(); drawBoxes(); }
function syncBoxAttr(idx, key, val) { currentView.boxes[idx][key] = val; saveAll(); drawBoxes(); if(key==='textVal' || key==='fontSize') refreshSidebar(); }
function setBoxMode(idx, mode) { currentView.boxes[idx].isVar = mode; saveAll(); refreshSidebar(); drawBoxes(); }
function refreshSidebar() { const sb = document.getElementById('sidebar'); if(sb) sb.innerHTML = renderSidebarContent(); }

// --- PRESENTATION MODE ---
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
            <div class="slide-fit" id="slide-canvas" style="background:${currentView.canvasBg || '#ffffff'}"></div>
            <div class="presentation-nav">
                <button class="blue-btn" onclick="renderHome()">🏠</button>
                <span style="font-weight:bold;">${currentRowIndex+1} / ${currentView.data.length}</span>
                <button class="blue-btn" onclick="prevSlide()">◀</button>
                <button class="blue-btn" onclick="nextSlide()">▶</button>
            </div>
        </div>`;
    
    const canvas = document.getElementById('slide-canvas');
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div');
        div.className = 'box-instance';
        div.style.cssText = `left:${(box.x/6)*100}%; top:${(box.y/4)*100}%; --w-pct:${(box.w/6)*100}%; --h-pct:${(box.h/4)*100}%; background:${box.bgColor}; color:${box.textColor}; cursor:pointer;`;
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
            <div class="detail-value" style="background:${box.isVar ? 'var(--primary-grad)' : 'none'}; -webkit-background-clip: ${box.isVar ? 'text' : 'none'}; -webkit-text-fill-color: ${box.isVar ? 'transparent' : 'inherit'};">${val}</div>
            <div class="modal-actions" style="display:flex; justify-content:center; gap:20px;">
                ${box.isVar ? `<button class="orange-btn" onclick="editLiveValue(${idx})">Edit Data</button>` : ''}
                <button class="blue-btn" style="background:var(--slate)" onclick="closePop()">Close</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

function editLiveValue(idx) {
    const box = currentView.boxes[idx];
    const oldVal = currentView.data[currentRowIndex][box.textVal] || '---';
    const newVal = prompt(`Edit Row ${currentRowIndex+1} | ${box.textVal}:`, oldVal);
    if (newVal !== null && newVal !== oldVal) {
        if (!currentView.history) currentView.history = [];
        currentView.history.push({ time: new Date().toLocaleTimeString(), row: currentRowIndex+1, col: box.textVal, old: oldVal, new: newVal });
        currentView.data[currentRowIndex][box.textVal] = newVal;
        saveAll(); closePop(); renderSlide();
    }
}

// --- FILE OPS ---
function exportFinalFiles() {
    if (!currentView || !currentView.data.length) return alert("No data to export");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(currentView.data);
    XLSX.utils.book_append_sheet(wb, ws, "UpdatedData");
    XLSX.writeFile(wb, `${currentView.name}_Updated.xlsx`);
    const log = (currentView.history || []).map(h => `[${h.time}] Row ${h.row} | Col: ${h.col} | ${h.old} -> ${h.new}`).join('\n');
    const blob = new Blob([`LOG: ${currentView.name}\n\n` + log], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${currentView.name}_history.txt`; a.click();
}

// --- CLICK VS DRAG ---
function handleMouseUp(e) {
    if (!draggingElement) return;
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    const gridX = Math.round(((e.clientX - rect.left - offset.x) / rect.width) * 6);
    const gridY = Math.round(((e.clientY - rect.top - offset.y) / rect.height) * 4);
    if (Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) < 5 && !isDraggingNew) {
        selectBox(dragIdx);
    } else if (gridX >= 0 && gridY >= 0 && gridX + parseInt(draggingElement.getAttribute('data-w')) <= 6 && gridY + parseInt(draggingElement.getAttribute('data-h')) <= 4) {
        if (isDraggingNew) {
            const hasH = currentView.headers && currentView.headers.length > 0;
            currentView.boxes.push({ x: gridX, y: gridY, w: parseInt(draggingElement.getAttribute('data-w')), h: parseInt(draggingElement.getAttribute('data-h')), title: 'Label', textVal: hasH ? currentView.headers[0] : 'Value', isVar: hasH, bgColor: '#ffffff', textColor: '#000', fontSize: 28 });
        } else {
            currentView.boxes[dragIdx].x = gridX; currentView.boxes[dragIdx].y = gridY;
        }
        saveAll();
    }
    draggingElement.remove(); draggingElement = null; isDraggingNew = false; drawBoxes();
}

function startDragExisting(e, idx) { e.preventDefault(); dragIdx = idx; dragStartX = e.clientX; dragStartY = e.clientY; const original = e.currentTarget; const rect = original.getBoundingClientRect(); const containerRect = document.getElementById('canvas-container').getBoundingClientRect(); draggingElement = original.cloneNode(true); draggingElement.classList.add('dragging'); draggingElement.setAttribute('data-w', currentView.boxes[idx].w); draggingElement.setAttribute('data-h', currentView.boxes[idx].h); offset.x = e.clientX - rect.left; offset.y = e.clientY - rect.top; draggingElement.style.left = `${rect.left - containerRect.left}px`; draggingElement.style.top = `${rect.top - containerRect.top}px`; document.getElementById('canvas-container').appendChild(draggingElement); }
function startDragNew(e, w, h) { e.preventDefault(); dragStartX = e.clientX; dragStartY = e.clientY; const container = document.getElementById('canvas-container'); draggingElement = document.createElement('div'); draggingElement.className = 'box-instance dragging'; draggingElement.style.width = `${(container.offsetWidth/6)*w}px`; draggingElement.style.height = `${(container.offsetHeight/4)*h}px`; draggingElement.style.background = 'var(--primary-grad)'; draggingElement.innerHTML = `<div class="box-content" style="color:white">Place</div>`; draggingElement.setAttribute('data-w', w); draggingElement.setAttribute('data-h', h); offset.x = ((container.offsetWidth/6)*w)/2; offset.y = ((container.offsetHeight/4)*h)/2; container.appendChild(draggingElement); isDraggingNew = true; }
window.addEventListener('mousemove', (e) => { if (!draggingElement) return; const rect = document.getElementById('canvas-container').getBoundingClientRect(); draggingElement.style.left = `${e.clientX - rect.left - offset.x}px`; draggingElement.style.top = `${e.clientY - rect.top - offset.y}px`; });
window.addEventListener('mouseup', handleMouseUp);

function uploadExcel() { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx'; inp.onchange = (e) => { const reader = new FileReader(); reader.onload = (evt) => { const wb = XLSX.read(evt.target.result, {type:'binary'}); const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); currentView.data = data; currentView.headers = Object.keys(data[0] || {}); saveAll(); renderEditCanvas(); }; reader.readAsBinaryString(e.target.files[0]); }; inp.click(); }
function deleteBox(i) { currentView.boxes.splice(i,1); saveAll(); deselectBox(); }
function deleteView(id) { if(confirm("Delete dashboard?")) { views = views.filter(v => v.createdAt != id); saveAll(); renderHome(); } }
function createNewView() { const name = prompt("Name:", "New Dashboard"); if(name) { currentView = { name, createdAt: Date.now(), boxes: [], data: [], headers: [], history: [] }; views.push(currentView); saveAll(); renderEditCanvas(); } }
function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function nextSlide() { if(currentRowIndex < currentView.data.length - 1) { currentRowIndex++; renderSlide(); } }
function prevSlide() { if(currentRowIndex > 0) { currentRowIndex--; renderSlide(); } }
