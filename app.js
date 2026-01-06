/**
 * DATA VIEW - MASTER ENGINE v35.0
 * Features: Deep Save, Scaled Editor, History Log, Variable Defaults
 */

let views = [];
let currentView = null;
let currentRowIndex = 0;

// Interaction State
let draggingElement = null;
let isDraggingNew = false;
let dragIdx = -1;
let dragStartX, dragStartY;
let offset = { x: 0, y: 0 };

const bgPresets = ['#ffffff','#f1f5f9','#1e293b','linear-gradient(135deg, #FF5F6D 0%, #FFC371 100%)'];
const textPresets = ['#000000','#ffffff','#ef4444','#3b82f6'];

const iconHome = `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`;
const iconLeft = `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`;
const iconRight = `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`;

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('dataView_v35');
    if (saved) views = JSON.parse(saved);
    
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
    localStorage.setItem('dataView_v35', JSON.stringify(views));
}

// --- FILE SYNC & HISTORY ---
function exportFinalFiles() {
    if (!currentView || !currentView.data.length) return alert("No data to export");

    // 1. Updated Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(currentView.data);
    XLSX.utils.book_append_sheet(wb, ws, "Updated Data");
    XLSX.writeFile(wb, `${currentView.name}_Updated.xlsx`);

    // 2. History TXT
    const header = `HISTORY LOG - ${currentView.name}\nGenerated: ${new Date().toLocaleString()}\n\n`;
    const body = (currentView.history || []).map(h => 
        `[${h.time}] Row ${h.row} | ${h.col}: "${h.old}" -> "${h.new}"`
    ).join('\n');
    
    const blob = new Blob([header + body], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${currentView.name}_history.txt`;
    a.click();
}

function editLiveValue(idx) {
    const box = currentView.boxes[idx];
    const oldVal = currentView.data[currentRowIndex][box.textVal] || '---';
    const newVal = prompt(`Update Variable [${box.textVal}]:`, oldVal);

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
        saveAll(); closePop(); renderSlide();
    }
}

// --- EDITOR & PREVIEW ---
function openEditor(idx) {
    const box = currentView.boxes[idx];
    const sample = (currentView.data && currentView.data[0]) ? currentView.data[0][box.textVal] : null;
    const displayVal = box.isVar ? (sample || `<${box.textVal}>`) : box.textVal;

    const overlay = document.createElement('div'); overlay.className = 'popup-overlay';
    overlay.innerHTML = `
    <div class="editor-window">
        <div class="editor-preview-area">
            <div id="prev-container">
                <div id="prev" style="width:${box.w * 160}px; height:${box.h * 160}px; background:${box.bgColor}; color:${box.textColor};">
                    <div class="box-title">${box.title}</div>
                    <div class="box-content" style="font-size:${box.fontSize}px;">${displayVal}</div>
                </div>
            </div>
            <p style="color:var(--slate); font-weight:bold; margin-top:10px;">Scaled Preview</p>
        </div>
        <div class="editor-controls-area" style="flex:1; overflow-y:auto;">
            <h4>Label</h4>
            <input type="text" value="${box.title}" oninput="updateTitle(${idx}, this.value)" style="width:100%; padding:10px; margin-bottom:20px;">
            
            <h4>Data Source</h4>
            <div style="display:flex; background:#eee; padding:5px; border-radius:10px; margin-bottom:15px;">
                <button style="flex:1; background:${!box.isVar?'white':'none'}" onclick="setMode(${idx},false)">Constant</button>
                <button style="flex:1; background:${box.isVar?'white':'none'}" onclick="setMode(${idx},true)">Variable</button>
            </div>
            <div id="ctrls-root">${renderPills(idx)}</div>

            <button class="primary-btn" onclick="closePop(); drawBoxes();" style="margin-top:30px; width:100%;">Apply & Save</button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
}

function renderPills(idx) {
    const b = currentView.boxes[idx];
    if (!b.isVar) return `<input type="text" value="${b.textVal}" oninput="updateBoxValue(${idx}, this.value)" style="width:100%; padding:10px;">`;
    if (!currentView.headers.length) return `<button class="orange-btn" onclick="uploadExcel()">Upload Excel to see Variables</button>`;
    return `<div class="pills-container">${currentView.headers.map(h => `<div class="var-pill ${b.textVal === h ? 'selected' : ''}" onclick="updateBoxValue(${idx}, '${h}')">${h}</div>`).join('')}</div>`;
}

function updateTitle(idx, val) { currentView.boxes[idx].title = val; drawBoxes(); saveAll(); }
function updateBoxValue(idx, val) { 
    currentView.boxes[idx].textVal = val; 
    saveAll(); 
    // Close and reopen editor to refresh the preview content logic
    const oldPop = document.querySelector('.popup-overlay');
    if(oldPop) oldPop.remove();
    openEditor(idx);
}

function setMode(idx, m) { currentView.boxes[idx].isVar = m; saveAll(); closePop(); openEditor(idx); }

// --- DRAG SYSTEM ---
function handleMouseUp(e) {
    if (!draggingElement) return;
    const container = document.getElementById('canvas-container'); 
    const rect = container.getBoundingClientRect();
    const gridX = Math.round(((e.clientX - rect.left - offset.x) / rect.width) * 6);
    const gridY = Math.round(((e.clientY - rect.top - offset.y) / rect.height) * 4);

    if (gridX >= 0 && gridY >= 0 && gridX + parseInt(draggingElement.getAttribute('data-w')) <= 6 && gridY + parseInt(draggingElement.getAttribute('data-h')) <= 4) {
        if (isDraggingNew) {
            const hasData = currentView.headers && currentView.headers.length > 0;
            currentView.boxes.push({ 
                x: gridX, y: gridY, 
                w: parseInt(draggingElement.getAttribute('data-w')), 
                h: parseInt(draggingElement.getAttribute('data-h')), 
                title: 'Label', 
                textVal: hasData ? currentView.headers[0] : 'Value', 
                isVar: hasData, 
                bgColor: '#ffffff', textColor: '#000', fontSize: 32 
            });
        } else {
            currentView.boxes[dragIdx].x = gridX;
            currentView.boxes[dragIdx].y = gridY;
        }
        saveAll();
    }
    draggingElement.remove(); draggingElement = null; isDraggingNew = false; drawBoxes();
}

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
    const rect = container.getBoundingClientRect();
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

function handleMouseMove(e) { 
    if (!draggingElement) return; 
    const rect = document.getElementById('canvas-container').getBoundingClientRect();
    draggingElement.style.left = `${e.clientX - rect.left - offset.x}px`;
    draggingElement.style.top = `${e.clientY - rect.top - offset.y}px`;
}

window.addEventListener('mousemove', handleMouseMove);
window.addEventListener('mouseup', handleMouseUp);

// --- RENDERING VIEWS ---
function renderHome() {
    const app = document.getElementById('app');
    app.innerHTML = `<h1 class="main-heading">Data View</h1>
    <button class="primary-btn" onclick="createNewView()" style="width:100%">+ New Dashboard</button>
    <div id="view-list" style="margin-top:20px;"></div>`;
    views.forEach(v => {
        const div = document.createElement('div');
        div.style = "background:white; padding:15px; border-radius:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; border:1px solid #ddd;";
        div.innerHTML = `<span>${v.name}</span><button class="blue-btn" onclick="openMenu('${v.createdAt}')">Open</button>`;
        document.getElementById('view-list').appendChild(div);
    });
}

function openMenu(id) {
    currentView = views.find(v => v.createdAt == id);
    document.getElementById('app').innerHTML = `
        <h1 class="main-heading">${currentView.name}</h1>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
            <button class="blue-btn" onclick="renderEditCanvas()">Edit Layout</button>
            <button class="blue-btn" onclick="startPresentation()">Run Presentation</button>
            <button class="orange-btn" onclick="exportFinalFiles()">Export Final Pack</button>
            <button class="blue-btn" style="background:var(--danger)" onclick="deleteView('${id}')">Delete</button>
        </div>
        <button onclick="renderHome()" style="margin-top:20px; width:100%; background:none; color:var(--slate)">Back</button>
    `;
}

function renderEditCanvas() {
    document.getElementById('app').innerHTML = `
        <div class="canvas-header">
            <h2>Editing: ${currentView.name}</h2>
            <button class="orange-btn" onclick="uploadExcel()">Upload Excel</button>
        </div>
        <div class="canvas-16-9" id="canvas-container">
            <div class="grid-overlay"></div>
            <div id="boxes-layer"></div>
        </div>
        <div style="display:flex; justify-content:center; gap:10px; margin-top:20px;">
            ${['2x2','4x1','6x1','3x3'].map(s => `<button class="size-btn" onmousedown="startDragNew(event, ${s.split('x')[0]}, ${s.split('x')[1]})">${s}</button>`).join('')}
        </div>
        <button class="blue-btn" onclick="openMenu('${currentView.createdAt}')" style="width:100%; margin-top:20px;">Save & Exit</button>
    `;
    drawBoxes();
}

function drawBoxes() {
    const layer = document.getElementById('boxes-layer'); if(!layer) return;
    layer.innerHTML = '';
    const sampleRow = currentView.data[0] || {};
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div');
        div.className = 'box-instance';
        div.style.left = `${(box.x/6)*100}%`; div.style.top = `${(box.y/4)*100}%`;
        div.style.width = `${(box.w/6)*100}%`; div.style.height = `${(box.h/4)*100}%`;
        div.style.background = box.bgColor; div.style.color = box.textColor;
        
        const val = box.isVar ? (sampleRow[box.textVal] || `<${box.textVal}>`) : box.textVal;
        div.innerHTML = `<div class="box-title">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${val}</div>`;
        
        div.onmousedown = (e) => {
            const dist = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);
            if(e.detail === 2) openEditor(i); // Double click to edit
            else startDragExisting(e, i);
        };
        layer.appendChild(div);
    });
}

function startPresentation() {
    currentRowIndex = 0;
    renderSlide();
    window.onkeydown = (e) => {
        if(e.key === 'ArrowRight') nextSlide();
        if(e.key === 'ArrowLeft') prevSlide();
    };
}

function renderSlide() {
    const row = currentView.data[currentRowIndex] || {};
    document.getElementById('app').innerHTML = `
        <div class="presentation-fullscreen">
            <div class="slide-fit" id="slide-canvas"></div>
            <div class="floating-controls">
                <button onclick="renderHome()">${iconHome}</button>
                <span>${currentRowIndex + 1} / ${currentView.data.length}</span>
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
        div.onclick = () => openDetailModal(i, val);
        canvas.appendChild(div);
    });
}

function openDetailModal(idx, val) {
    const box = currentView.boxes[idx];
    const overlay = document.createElement('div'); overlay.className = 'popup-overlay';
    overlay.innerHTML = `
        <div style="background:white; padding:40px; border-radius:20px; width:80%; text-align:center;">
            <h2>${box.title}</h2>
            <p style="font-size:3rem; font-weight:bold;">${val}</p>
            <button class="orange-btn" onclick="editLiveValue(${idx})">Edit Value</button>
            <button class="blue-btn" onclick="closePop()">Close</button>
        </div>`;
    document.body.appendChild(overlay);
}

function uploadExcel() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx';
    inp.onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const wb = XLSX.read(evt.target.result, {type:'binary'});
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            currentView.data = data;
            currentView.headers = Object.keys(data[0] || {});
            saveAll(); renderEditCanvas();
        };
        reader.readAsBinaryString(e.target.files[0]);
    };
    inp.click();
}

function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function createNewView() { 
    currentView = { name: 'New Dashboard', createdAt: Date.now(), boxes: [], data: [], headers: [], history: [] }; 
    views.push(currentView); saveAll(); renderEditCanvas(); 
}
function nextSlide() { if(currentRowIndex < currentView.data.length - 1) { currentRowIndex++; renderSlide(); } }
function prevSlide() { if(currentRowIndex > 0) { currentRowIndex--; renderSlide(); } }
function deleteView(id) { views = views.filter(v => v.createdAt != id); saveAll(); renderHome(); }
