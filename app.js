/**
 * DATA VIEW PRO - MASTER ENGINE v43.0
 * Features: Variable Search Bar, Individual Box/Text Colors, 
 * Auto-Save Badge, Red Delete Buttons, Excel/History Sync.
 */

let views = [];
let currentView = null;
let currentRowIndex = 0;
let selectedBoxIdx = null;
let varSearchTerm = ""; // Global search term for the sidebar

// Interaction State
let draggingElement = null;
let isDraggingNew = false;
let dragIdx = -1;
let dragStartX, dragStartY;
let offset = { x: 0, y: 0 };

const bgPresets = ['#ffffff','#f8fafc','#1e293b','linear-gradient(135deg, #667eea 0%, #764ba2 100%)','linear-gradient(135deg, #00b09b 0%, #96c93d 100%)','linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'];
const textPresets = ['#0f172a', '#ffffff', '#2563eb', '#dc2626', '#16a34a', '#f59e0b'];

// --- STORAGE & AUTO-SAVE ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('dataView_master_v43');
    if (saved) views = JSON.parse(saved);
    renderHome();
});

function triggerSave() {
    localStorage.setItem('dataView_master_v43', JSON.stringify(views));
    const badge = document.getElementById('save-badge');
    if (badge) {
        badge.classList.add('visible');
        setTimeout(() => badge.classList.remove('visible'), 1200);
    }
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

// --- SIDEBAR & EDITOR LOGIC ---
function renderEditCanvas() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="main-content">
            <aside class="editor-sidebar" id="sidebar">${renderSidebarContent()}</aside>
            <main class="canvas-area">
                <input type="text" class="canvas-title-input" value="${currentView.name}" oninput="updateViewName(this.value)">
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
    const isGlobal = selectedBoxIdx === null;
    return `
        <div class="sidebar-header">
            <h3>${isGlobal ? 'Global' : 'Edit Box'}</h3>
            <div id="save-badge">Saved</div>
            ${!isGlobal ? '<button onclick="deselectBox()" style="background:none; color:var(--slate); font-size:1.5rem; padding:0;">✕</button>' : ''}
        </div>
        ${isGlobal ? renderGlobalControls() : renderBoxControls()}
    `;
}

function renderGlobalControls() {
    return `
        <div class="property-group">
            <h4>Add New Box</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                ${['1x1','2x1','3x1','2x2','4x1','6x1','3x3','4x4'].map(s => `
                    <button class="size-btn" onmousedown="startDragNew(event, ${s.split('x')[0]}, ${s.split('x')[1]})">${s}</button>
                `).join('')}
            </div>
        </div>
        <div class="property-group">
            <h4>Canvas Background</h4>
            <div class="color-grid">${bgPresets.map(c => `<div class="circle" style="background:${c}" onclick="updateCanvasBg('${c}')"></div>`).join('')}</div>
        </div>`;
}

function renderBoxControls() {
    const box = currentView.boxes[selectedBoxIdx];
    const hasData = currentView.headers && currentView.headers.length > 0;
    
    let contentEditor = '';
    if (!box.isVar) {
        contentEditor = `<input type="text" value="${box.textVal}" oninput="syncBoxAttr(${selectedBoxIdx}, 'textVal', this.value)" placeholder="Enter text..." style="width:100%; padding:12px; border-radius:10px; border:1px solid #ddd;">`;
    } else if (hasData) {
        const filteredHeaders = currentView.headers.filter(h => h.toLowerCase().includes(varSearchTerm.toLowerCase()));
        contentEditor = `
            <div class="search-container">
                <input type="text" class="search-input" placeholder="Search variables..." value="${varSearchTerm}" oninput="handleVarSearch(this.value)">
            </div>
            <div class="pills-container">
                ${filteredHeaders.map(h => `<div class="var-pill ${box.textVal === h ? 'selected' : ''}" onclick="syncBoxAttr(${selectedBoxIdx}, 'textVal', '${h}')">${h}</div>`).join('')}
                ${filteredHeaders.length === 0 ? '<p style="font-size:0.8rem; color:var(--slate)">No variables match.</p>' : ''}
            </div>`;
    } else {
        contentEditor = `<button class="orange-btn" style="width:100%; font-size:0.8rem;" onclick="uploadExcel()">! Upload Excel to link Variables</button>`;
    }

    return `
        <div class="property-group">
            <h4>Label</h4>
            <input type="text" value="${box.title}" oninput="syncBoxAttr(${selectedBoxIdx}, 'title', this.value)" style="width:100%; padding:12px; border-radius:10px; border:1px solid #ddd;">
        </div>
        <div class="property-group">
            <h4>Data Mode</h4>
            <select onchange="setBoxMode(${selectedBoxIdx}, this.value === 'var')" style="width:100%; padding:10px; border-radius:10px; border:1px solid #ddd;">
                <option value="const" ${!box.isVar ? 'selected' : ''}>Static</option>
                <option value="var" ${box.isVar ? 'selected' : ''}>Excel Var</option>
            </select>
        </div>
        <div class="property-group">
            <h4>Content Editor</h4>
            ${contentEditor}
        </div>
        <div class="property-group">
            <h4>Appearance</h4>
            <p style="font-size:0.7rem; color:var(--slate); margin:0;">Box Background</p>
            <div class="color-grid" style="margin-top:5px;">${bgPresets.map(c => `<div class="circle" style="background:${c}" onclick="syncBoxAttr(${selectedBoxIdx}, 'bgColor', '${c}')"></div>`).join('')}</div>
            
            <p style="font-size:0.7rem; color:var(--slate); margin:15px 0 0 0;">Text Color</p>
            <div class="color-grid" style="margin-top:5px;">${textPresets.map(c => `<div class="circle" style="background:${c}" onclick="syncBoxAttr(${selectedBoxIdx}, 'textColor', '${c}')"></div>`).join('')}</div>
            
            <p style="font-size:0.7rem; color:var(--slate); margin:15px 0 0 0;">Font Size: ${box.fontSize}px</p>
            <div style="display:flex; gap:10px; margin-top:5px;">
                <button class="blue-btn" style="padding:10px 20px;" onclick="syncBoxAttr(${selectedBoxIdx}, 'fontSize', ${box.fontSize - 4})">-</button>
                <button class="blue-btn" style="padding:10px 20px;" onclick="syncBoxAttr(${selectedBoxIdx}, 'fontSize', ${box.fontSize + 4})">+</button>
            </div>
        </div>
        <button class="danger-btn" style="width:100%;" onclick="deleteBox(${selectedBoxIdx})">Delete Box</button>
    `;
}

// --- SYNC HELPERS ---
function handleVarSearch(val) { varSearchTerm = val; refreshSidebar(); }
function updateViewName(val) { currentView.name = val; triggerSave(); }
function updateCanvasBg(c) { currentView.canvasBg = c; document.getElementById('canvas-container').style.background = c; triggerSave(); }
function deselectBox() { selectedBoxIdx = null; varSearchTerm = ""; refreshSidebar(); drawBoxes(); }
function selectBox(idx) { selectedBoxIdx = idx; varSearchTerm = ""; refreshSidebar(); drawBoxes(); }
function syncBoxAttr(idx, key, val) { 
    currentView.boxes[idx][key] = val; 
    triggerSave(); 
    drawBoxes(); 
    if(key==='textVal' || key==='fontSize' || key==='bgColor' || key==='textColor') refreshSidebar(); 
}
function setBoxMode(idx, mode) { currentView.boxes[idx].isVar = mode; triggerSave(); refreshSidebar(); drawBoxes(); }
function refreshSidebar() { const sb = document.getElementById('sidebar'); if(sb) sb.innerHTML = renderSidebarContent(); }

// --- CORE RENDERING ---
function drawBoxes() {
    const layer = document.getElementById('boxes-layer'); if(!layer) return;
    layer.innerHTML = '';
    const sample = currentView.data[0] || {};
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div');
        div.className = `box-instance ${selectedBoxIdx === i ? 'selected-box' : ''}`;
        div.style.cssText = `
            left: ${(box.x/6)*100}%; 
            top: ${(box.y/4)*100}%; 
            --w-pct: ${(box.w/6)*100}%; 
            --h-pct: ${(box.h/4)*100}%; 
            background: ${box.bgColor || 'var(--glass)'}; 
            color: ${box.textColor || 'var(--dark)'};
        `;
        const val = box.isVar ? `<${box.textVal}>` : (box.textVal || "");
        div.innerHTML = `<div class="box-title">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${val}</div>`;
        div.onmousedown = (e) => startDragExisting(e, i);
        layer.appendChild(div);
    });
}

// --- PRESENTATION MODE ---
function startPresentation() {
    currentRowIndex = 0; renderSlide();
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
        div.style.cssText = `
            left:${(box.x/6)*100}%; top:${(box.y/4)*100}%; 
            --w-pct:${(box.w/6)*100}%; --h-pct:${(box.h/4)*100}%; 
            background:${box.bgColor || 'var(--glass)'}; 
            color:${box.textColor || 'var(--dark)'}; 
            cursor:pointer;
        `;
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
            <div class="detail-value" style="color:${box.textColor || 'var(--dark)'}">${val}</div>
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
        triggerSave(); closePop(); renderSlide();
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

// --- DRAG LOGIC ---
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
            currentView.boxes.push({ x: gridX, y: gridY, w: parseInt(draggingElement.getAttribute('data-w')), h: parseInt(draggingElement.getAttribute('data-h')), title: 'Label', textVal: hasH ? currentView.headers[0] : 'Value', isVar: hasH, bgColor: '', textColor: '', fontSize: 28 });
        } else {
            currentView.boxes[dragIdx].x = gridX; currentView.boxes[dragIdx].y = gridY;
        }
        triggerSave();
    }
    draggingElement.remove(); draggingElement = null; isDraggingNew = false; drawBoxes();
}

function startDragExisting(e, idx) { e.preventDefault(); dragIdx = idx; dragStartX = e.clientX; dragStartY = e.clientY; const original = e.currentTarget; const rect = original.getBoundingClientRect(); const containerRect = document.getElementById('canvas-container').getBoundingClientRect(); draggingElement = original.cloneNode(true); draggingElement.classList.add('dragging'); draggingElement.setAttribute('data-w', currentView.boxes[idx].w); draggingElement.setAttribute('data-h', currentView.boxes[idx].h); offset.x = e.clientX - rect.left; offset.y = e.clientY - rect.top; draggingElement.style.left = `${rect.left - containerRect.left}px`; draggingElement.style.top = `${rect.top - containerRect.top}px`; document.getElementById('canvas-container').appendChild(draggingElement); }
function startDragNew(e, w, h) { e.preventDefault(); dragStartX = e.clientX; dragStartY = e.clientY; const container = document.getElementById('canvas-container'); draggingElement = document.createElement('div'); draggingElement.className = 'box-instance dragging'; draggingElement.style.width = `${(container.offsetWidth/6)*w}px`; draggingElement.style.height = `${(container.offsetHeight/4)*h}px`; draggingElement.style.background = 'var(--primary-grad)'; draggingElement.innerHTML = `<div class="box-content" style="color:white">Place</div>`; draggingElement.setAttribute('data-w', w); draggingElement.setAttribute('data-h', h); offset.x = ((container.offsetWidth/6)*w)/2; offset.y = ((container.offsetHeight/4)*h)/2; container.appendChild(draggingElement); isDraggingNew = true; }
window.addEventListener('mousemove', (e) => { if (!draggingElement) return; const rect = document.getElementById('canvas-container').getBoundingClientRect(); draggingElement.style.left = `${e.clientX - rect.left - offset.x}px`; draggingElement.style.top = `${e.clientY - rect.top - offset.y}px`; });
window.addEventListener('mouseup', handleMouseUp);

function uploadExcel() { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx'; inp.onchange = (e) => { const reader = new FileReader(); reader.onload = (evt) => { const wb = XLSX.read(evt.target.result, {type:'binary'}); const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); currentView.data = data; currentView.headers = Object.keys(data[0] || {}); triggerSave(); renderEditCanvas(); }; reader.readAsBinaryString(e.target.files[0]); }; inp.click(); }
function deleteBox(i) { currentView.boxes.splice(i,1); triggerSave(); deselectBox(); }
function deleteView(id) { if(confirm("Delete?")) { views = views.filter(v => v.createdAt != id); triggerSave(); renderHome(); } }
function createNewView() { const name = prompt("Name:", "New View"); if(name) { currentView = { name, createdAt: Date.now(), boxes: [], data: [], headers: [], history: [] }; views.push(currentView); triggerSave(); renderEditCanvas(); } }
function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function nextSlide() { if(currentRowIndex < currentView.data.length - 1) { currentRowIndex++; renderSlide(); } }
function prevSlide() { if(currentRowIndex > 0) { currentRowIndex--; renderSlide(); } }
