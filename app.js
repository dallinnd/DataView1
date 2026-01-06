/**
 * DATA VIEW - MASTER ENGINE v36.0
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
const textPresets = ['#000000','#ffffff','#ef4444','#3b82f6','#10b981'];

const iconHome = `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`;
const iconLeft = `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`;
const iconRight = `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('dataView_master_final');
    if (saved) views = JSON.parse(saved);
    renderHome();
});

function saveAll() {
    if (currentView) {
        const idx = views.findIndex(v => v.createdAt === currentView.createdAt);
        if (idx !== -1) views[idx] = currentView;
    }
    localStorage.setItem('dataView_master_final', JSON.stringify(views));
}

// --- FILE EXPORTS & SYNC ---
function exportFinalFiles() {
    if (!currentView || !currentView.data.length) return alert("No data available.");
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(currentView.data);
    XLSX.utils.book_append_sheet(wb, ws, "UpdatedData");
    XLSX.writeFile(wb, `${currentView.name}_Updated.xlsx`);

    const log = (currentView.history || []).map(h => `[${h.time}] Row ${h.row} | ${h.col}: ${h.old} -> ${h.new}`).join('\n');
    const blob = new Blob([`HISTORY LOG: ${currentView.name}\n\n` + log], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${currentView.name}_history.txt`;
    a.click();
}

function editLiveValue(idx) {
    const box = currentView.boxes[idx];
    const oldVal = currentView.data[currentRowIndex][box.textVal] || '---';
    const newVal = prompt(`Edit ${box.textVal}:`, oldVal);
    if (newVal !== null && newVal !== oldVal) {
        if (!currentView.history) currentView.history = [];
        currentView.history.push({ time: new Date().toLocaleTimeString(), row: currentRowIndex + 1, col: box.textVal, old: oldVal, new: newVal });
        currentView.data[currentRowIndex][box.textVal] = newVal;
        saveAll(); closePop(); renderSlide();
    }
}

// --- BOX EDITOR ---
function openEditor(idx) {
    const box = currentView.boxes[idx];
    const sample = (currentView.data && currentView.data[0]) ? currentView.data[0][box.textVal] : null;
    const previewVal = box.isVar ? (sample || `<${box.textVal}>`) : box.textVal;

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
            <p style="color:var(--slate); font-weight:bold; margin-top:10px;">Scaled Preview</p>
        </div>
        <div class="editor-controls-area">
            <div class="property-group">
                <h4>Box Title</h4>
                <input type="text" id="edit-title" value="${box.title}" oninput="updateBoxAttr(${idx}, 'title', this.value)" style="width:100%; padding:10px; box-sizing:border-box;">
            </div>

            <div class="property-group">
                <h4>Colors</h4>
                <p style="font-size:0.7rem; color:var(--slate); margin-bottom:5px;">Background Color</p>
                <div class="color-grid">${bgPresets.map(c => `<div class="circle" style="background:${c}" onclick="updateBoxAttr(${idx},'bgColor','${c}')"></div>`).join('')}</div>
                <p style="font-size:0.7rem; color:var(--slate); margin:10px 0 5px 0;">Text Color</p>
                <div class="color-grid">${textPresets.map(c => `<div class="circle" style="background:${c}" onclick="updateBoxAttr(${idx},'textColor','${c}')"></div>`).join('')}</div>
            </div>

            <div class="property-group">
                <h4>Text Size</h4>
                <div style="display:flex; align-items:center; gap:15px;">
                    <button class="blue-btn" onclick="updateBoxAttr(${idx}, 'fontSize', ${box.fontSize - 4})">-</button>
                    <span style="font-weight:bold; font-size:1.2rem;">${box.fontSize}px</span>
                    <button class="blue-btn" onclick="updateBoxAttr(${idx}, 'fontSize', ${box.fontSize + 4})">+</button>
                </div>
            </div>

            <div class="property-group">
                <h4>Data Source</h4>
                <div style="display:flex; background:#eee; padding:4px; border-radius:8px; margin-bottom:10px;">
                    <button style="flex:1; background:${!box.isVar?'white':'none'}" onclick="setBoxMode(${idx}, false)">Constant</button>
                    <button style="flex:1; background:${box.isVar?'white':'none'}" onclick="setBoxMode(${idx}, true)">Variable</button>
                </div>
                <div id="source-ctrls">${renderPills(idx)}</div>
            </div>

            <button class="primary-btn" onclick="closePop(); drawBoxes();">Save & Close</button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
}

function updateBoxAttr(idx, key, val) {
    currentView.boxes[idx][key] = val;
    saveAll();
    // Refresh editor preview in real-time
    const prev = document.getElementById('prev');
    const pTitle = document.getElementById('prev-title');
    const pTxt = document.getElementById('prev-txt');
    if (key === 'bgColor') prev.style.background = val;
    if (key === 'textColor') prev.style.color = val;
    if (key === 'title') pTitle.innerText = val;
    if (key === 'fontSize') { pTxt.style.fontSize = val + 'px'; closePop(); openEditor(idx); } // Re-open to update UI label
}

function renderPills(idx) {
    const b = currentView.boxes[idx];
    if (!b.isVar) return `<input type="text" value="${b.textVal}" oninput="updateBoxAttr(${idx}, 'textVal', this.value)" style="width:100%; padding:10px; box-sizing:border-box;">`;
    return `<div class="pills-container">${currentView.headers.map(h => `<div class="var-pill ${b.textVal === h ? 'selected' : ''}" onclick="updateBoxAttr(${idx},'textVal','${h}')">${h}</div>`).join('')}</div>`;
}

function setBoxMode(idx, mode) { currentView.boxes[idx].isVar = mode; saveAll(); closePop(); openEditor(idx); }

// --- DRAG VS CLICK LOGIC ---
function handleMouseUp(e) {
    if (!draggingElement) return;
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    const gridX = Math.round(((e.clientX - rect.left - offset.x) / rect.width) * 6);
    const gridY = Math.round(((e.clientY - rect.top - offset.y) / rect.height) * 4);

    // LOGIC: Determine if this was a click or a drag based on travel distance
    const distanceMoved = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);

    if (distanceMoved < 5 && !isDraggingNew) {
        // It was a click!
        draggingElement.remove(); draggingElement = null;
        openChoiceMenu(dragIdx);
    } 
    else if (gridX >= 0 && gridY >= 0 && gridX + parseInt(draggingElement.getAttribute('data-w')) <= 6 && gridY + parseInt(draggingElement.getAttribute('data-h')) <= 4) {
        if (isDraggingNew) {
            const hasH = currentView.headers && currentView.headers.length > 0;
            currentView.boxes.push({ x: gridX, y: gridY, w: parseInt(draggingElement.getAttribute('data-w')), h: parseInt(draggingElement.getAttribute('data-h')), title: 'Title', textVal: hasH ? currentView.headers[0] : 'Value', isVar: hasH, bgColor: '#ffffff', textColor: '#000', fontSize: 32 });
        } else {
            currentView.boxes[dragIdx].x = gridX; currentView.boxes[dragIdx].y = gridY;
        }
        saveAll();
    }
    if (draggingElement) draggingElement.remove();
    draggingElement = null; isDraggingNew = false; drawBoxes();
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

// --- RENDERING & NAVIGATION ---
function renderHome() {
    const app = document.getElementById('app');
    app.innerHTML = `<h1 class="main-heading">Data View</h1><button class="primary-btn" onclick="createNewView()">+ New View</button><div id="view-list" style="margin-top:20px;"></div>`;
    views.forEach(v => {
        const d = document.createElement('div');
        d.style = "background:white; padding:15px; border-radius:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; border:1px solid #ddd;";
        d.innerHTML = `<span>${v.name}</span><button class="blue-btn" onclick="openMenu('${v.createdAt}')">Open</button>`;
        document.getElementById('view-list').appendChild(d);
    });
}

function openMenu(id) {
    currentView = views.find(v => v.createdAt == id);
    document.getElementById('app').innerHTML = `
        <h1 class="main-heading">${currentView.name}</h1>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
            <button class="blue-btn" onclick="renderEditCanvas()">Edit Layout</button>
            <button class="blue-btn" onclick="startPresentation()">Present</button>
            <button class="orange-btn" onclick="exportFinalFiles()">Export Pack</button>
            <button class="blue-btn" style="background:var(--danger)" onclick="deleteView('${id}')">Delete</button>
        </div>
        <button onclick="renderHome()" style="width:100%; margin-top:20px; background:none; color:var(--slate)">Back to Home</button>
    `;
}

function renderEditCanvas() {
    document.getElementById('app').innerHTML = `
        <div class="canvas-header"><h2>${currentView.name}</h2><button class="orange-btn" onclick="uploadExcel()">Upload Excel</button></div>
        <div class="canvas-16-9" id="canvas-container">
            <div class="grid-overlay"></div><div id="boxes-layer"></div>
        </div>
        <div style="display:flex; justify-content:center; gap:10px; margin-top:20px;">
            ${['2x2','4x1','6x1','3x3','4x4'].map(s => `<button class="size-btn" onmousedown="startDragNew(event, ${s.split('x')[0]}, ${s.split('x')[1]})">${s}</button>`).join('')}
        </div>
        <button class="blue-btn" onclick="openMenu('${currentView.createdAt}')" style="width:100%; margin-top:20px;">Save & Exit</button>
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
        const val = box.isVar ? (sample[box.textVal] || `<${box.textVal}>`) : box.textVal;
        div.innerHTML = `<div class="box-title">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${val}</div>`;
        div.onmousedown = (e) => startDragExisting(e, i);
        layer.appendChild(div);
    });
}

function startPresentation() {
    currentRowIndex = 0;
    renderSlide();
    window.onkeydown = (e) => {
        if(e.key === 'ArrowRight' || e.key === ' ') nextSlide();
        if(e.key === 'ArrowLeft') prevSlide();
    };
}

function renderSlide() {
    const row = currentView.data[currentRowIndex] || {};
    document.getElementById('app').innerHTML = `<div class="presentation-fullscreen"><div class="slide-fit" id="slide-canvas"></div>
    <div class="floating-controls">
        <button onclick="renderHome()">${iconHome}</button>
        <span style="font-weight:bold;">${currentRowIndex+1} / ${currentView.data.length}</span>
        <button onclick="prevSlide()">${iconLeft}</button><button onclick="nextSlide()">${iconRight}</button>
    </div></div>`;
    const canvas = document.getElementById('slide-canvas');
    currentView.boxes.forEach((box, i) => {
        const d = document.createElement('div');
        d.className = 'box-instance';
        d.style.cssText = `left:${(box.x/6)*100}%; top:${(box.y/4)*100}%; width:${(box.w/6)*100}%; height:${(box.h/4)*100}%; background:${box.bgColor}; color:${box.textColor}; cursor:pointer;`;
        const val = box.isVar ? (row[box.textVal] || '---') : box.textVal;
        d.innerHTML = `<div class="box-title">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${val}</div>`;
        d.onclick = () => openDetailModal(i, val);
        canvas.appendChild(d);
    });
}

function openDetailModal(idx, val) {
    const box = currentView.boxes[idx];
    const overlay = document.createElement('div'); overlay.className = 'popup-overlay';
    overlay.innerHTML = `<div style="background:white; padding:40px; border-radius:20px; width:80%; text-align:center;">
        <h2>${box.title}</h2><p style="font-size:3.5rem; font-weight:bold;">${val}</p>
        <div style="display:flex; justify-content:center; gap:10px;">
            ${box.isVar ? `<button class="orange-btn" onclick="editLiveValue(${idx})">Edit Value</button>` : ''}
            <button class="blue-btn" onclick="closePop()">Close</button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
}

function openChoiceMenu(idx) {
    const overlay = document.createElement('div'); overlay.className = 'popup-overlay';
    overlay.innerHTML = `<div style="background:white; padding:30px; border-radius:20px; text-align:center;">
        <h3>Options</h3>
        <button class="blue-btn" onclick="closePop(); openEditor(${idx})">Edit Style/Data</button>
        <button class="orange-btn" style="background:var(--danger)" onclick="deleteBox(${idx})">Delete</button>
        <button class="blue-btn" style="background:var(--slate); margin-top:10px; width:100%" onclick="closePop()">Cancel</button>
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
            currentView.data = data; currentView.headers = Object.keys(data[0] || {});
            saveAll(); renderEditCanvas();
        };
        reader.readAsBinaryString(e.target.files[0]);
    };
    inp.click();
}

function deleteBox(i) { currentView.boxes.splice(i,1); saveAll(); closePop(); drawBoxes(); }
function deleteView(id) { views = views.filter(v => v.createdAt != id); saveAll(); renderHome(); }
function createNewView() { currentView = { name: 'New Dashboard', createdAt: Date.now(), boxes: [], data: [], headers: [], history: [] }; views.push(currentView); saveAll(); renderEditCanvas(); }
function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function nextSlide() { if(currentRowIndex < currentView.data.length - 1) { currentRowIndex++; renderSlide(); } }
function prevSlide() { if(currentRowIndex > 0) { currentRowIndex--; renderSlide(); } }
