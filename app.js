/**
 * DATA VIEW - FINAL UNIFIED ENGINE v6.1 (Proportional Fix & Canvas Var Fix)
 */

let views = [];
let currentView = null;
let pendingBox = null;
let currentRowIndex = 0;
let changeLog = [];

const bgPresets = ['#ffffff','#f1f5f9','#cbd5e1','linear-gradient(135deg,#60a5fa,#3b82f6)','linear-gradient(135deg,#34d399,#10b981)','linear-gradient(135deg,#fb923c,#f97316)','#fee2e2','#fef3c7','#dcfce7','#1e293b','#334155','#475569'];
const textPresets = ['#000000','#ffffff','#475569','#ef4444','#3b82f6','#10b981'];

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('dataView_master_final');
    if (saved) views = JSON.parse(saved);
    renderHome();
});

function saveAll() {
    localStorage.setItem('dataView_master_final', JSON.stringify(views));
}

function renderHome() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <button class="primary-btn" onclick="createNewView()">+ Create New View</button>
        <h2 style="text-align:center; margin-top:40px; color:#475569;">Existing Displays</h2>
        <div id="view-list"></div>
    `;
    const list = document.getElementById('view-list');
    views.sort((a,b) => b.updatedAt - a.updatedAt).forEach(v => {
        const div = document.createElement('div');
        div.style = "background:white; padding:20px; border-radius:15px; margin-top:12px; display:flex; justify-content:space-between; align-items:center; border:1px solid #e2e8f0; box-shadow:0 2px 4px rgba(0,0,0,0.02);";
        div.innerHTML = `<div><strong>${v.name}</strong><br><small style="color:#94a3b8">Modified: ${new Date(v.updatedAt).toLocaleDateString()}</small></div>
                         <button class="blue-btn" onclick="openMenu('${v.createdAt}')">Open</button>`;
        list.appendChild(div);
    });
}

function createNewView() {
    currentView = { name: 'New View', createdAt: Date.now(), updatedAt: Date.now(), boxes: [], headers: [], data: [], excelName: null };
    views.push(currentView);
    renderEditCanvas();
}

function openMenu(id) {
    currentView = views.find(v => v.createdAt == id);
    document.getElementById('app').innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:50px;">
            <button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="exportData()">Export<br><small>Excel + Log</small></button>
            <button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="startPresentation()">View<br><small>Slides</small></button>
            <button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="renderEditCanvas()">Edit<br><small>Canvas</small></button>
            <button class="blue-btn" style="height:140px; font-size:1.2rem; background:var(--danger);" onclick="deleteView('${id}')">Delete</button>
        </div>
        <button onclick="renderHome()" style="margin-top:30px; width:100%; background:none; text-decoration:underline; border:none; cursor:pointer; color:var(--slate);">Back Home</button>
    `;
}

function renderEditCanvas() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="canvas-header">
            <input type="text" value="${currentView.name}" oninput="currentView.name=this.value; saveAll();" style="font-size:1.2rem; font-weight:bold; border:none; border-bottom:1px solid #ddd; outline:none; background:transparent;">
            <button class="orange-btn" onclick="uploadExcel()">Upload Excel</button>
            <button class="blue-btn" onclick="openMenu('${currentView.createdAt}')">Save & Exit</button>
        </div>
        <div class="canvas-16-9" id="canvas-container">
            <div class="grid-overlay" id="grid"></div>
            <div id="boxes-layer"></div>
        </div>
        <div style="display:flex; justify-content:center; gap:10px; margin-top:20px; flex-wrap:wrap;">
            ${['2x2','2x1','4x1','6x1','3x3','4x4'].map(s => `<button class="blue-btn" style="background:#64748b" onclick="selectSize(${s.split('x')[0]},${s.split('x')[1]})">${s}</button>`).join('')}
        </div>
    `;
    drawGrid();
    drawBoxes();
}

function selectSize(w, h) { pendingBox = {w, h}; }

function drawGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    for (let i = 0; i < 24; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        const x = i % 6, y = Math.floor(i / 6);
        cell.onclick = () => {
            if(!pendingBox) return alert("Select a size first!");
            if(x + pendingBox.w > 6 || y + pendingBox.h > 4) return alert("Box exceeds boundaries!");
            const overlap = currentView.boxes.some(b => x < b.x + b.w && x + pendingBox.w > b.x && y < b.y + b.h && y + pendingBox.h > b.y);
            if(overlap) return alert("Space occupied!");

            currentView.boxes.push({x, y, w:pendingBox.w, h:pendingBox.h, title:'Title', textVal:'Variable', isVar:true, bgColor:'#ffffff', textColor:'#000', fontSize:18});
            pendingBox = null;
            saveAll();
            drawBoxes();
        };
        grid.appendChild(cell);
    }
}

function drawBoxes() {
    const layer = document.getElementById('boxes-layer');
    layer.innerHTML = '';
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div');
        div.className = 'box-instance';
        div.style.left = `${(box.x/6)*100}%`;
        div.style.top = `${(box.y/4)*100}%`;
        div.style.width = `${(box.w/6)*100}%`;
        div.style.height = `${(box.h/4)*100}%`;
        div.style.background = box.bgColor;
        div.style.color = box.textColor;
        
        // --- FIXED: VARIABLE PREVIEW ON CANVAS ---
        const display = box.isVar ? `<${box.textVal}>` : box.textVal;
        div.innerHTML = `<small style="font-size:0.6em; opacity:0.8; margin-bottom:4px;">${box.title}</small>
                         <div style="font-size:${box.fontSize}px; font-weight:bold;">${display}</div>`;
        div.onclick = (e) => { e.stopPropagation(); openChoiceMenu(i); };
        layer.appendChild(div);
    });
}

function openChoiceMenu(idx) {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.innerHTML = `
        <div class="choice-window" style="background:white; padding:25px; border-radius:20px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
            <h3 style="margin-top:0">Box Options</h3>
            <button class="primary-btn" onclick="closePop(); openEditor(${idx})">Edit Appearance</button><br><br>
            <button class="primary-btn" style="background:var(--danger)" onclick="deleteBox(${idx})">Delete Box</button><br><br>
            <button class="primary-btn" style="background:var(--slate)" onclick="closePop()">Back</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

function openEditor(idx) {
    const box = currentView.boxes[idx];
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.id = 'editor-overlay';

    const renderTextControl = () => {
        if (!box.isVar) return `<input type="text" value="${box.textVal}" oninput="updateBoxValue(${idx}, this.value)" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd; box-sizing:border-box;">`;
        if (currentView.headers.length === 0) return `<button class="orange-btn" style="width:100%" onclick="uploadExcelFromEditor(${idx})">Upload Excel</button>`;
        return `<div class="pills-container">${currentView.headers.map(h => `<div class="var-pill ${box.textVal === h ? 'selected' : ''}" onclick="updateBoxValue(${idx}, '${h}')">${h}</div>`).join('')}</div>`;
    };

    overlay.innerHTML = `
        <div class="editor-window">
            <div class="editor-preview-area">
                <input type="text" value="${box.title}" oninput="currentView.boxes[${idx}].title=this.value; refreshUI(${idx})" style="font-size:1.5rem; text-align:center; font-weight:bold; border:none; background:transparent; border-bottom:2px solid #3b82f6; outline:none; margin-bottom:30px; width:80%;">
                
                <div id="prev" style="--box-w: ${box.w}; --box-h: ${box.h}; background:${box.bgColor}; color:${box.textColor}; border-radius:12px;">
                    <small style="opacity:0.7; font-size:0.8em; margin-bottom:10px;">${box.title}</small>
                    <div id="prev-txt" style="font-weight:bold; font-size:${box.fontSize}px; text-align:center;">
                        ${box.isVar ? '<' + box.textVal + '>' : box.textVal}
                    </div>
                </div>
            </div>
            
            <div class="editor-controls-area">
                <div class="property-group">
                    <h4>Coloring</h4>
                    <p><small>Background</small></p>
                    <div class="color-grid">${bgPresets.map(c => `<div class="circle" style="background:${c}" onclick="applyAttr(${idx},'bgColor','${c}')"></div>`).join('')}</div>
                    <p style="margin-top:10px;"><small>Text Color</small></p>
                    <div class="color-grid">${textPresets.map(c => `<div class="circle" style="background:${c}" onclick="applyAttr(${idx},'textColor','${c}')"></div>`).join('')}</div>
                </div>
                <div class="property-group">
                    <h4>Font Size</h4>
                    <div class="font-controls">
                        <button class="circle-btn" onclick="adjustFont(${idx},-2)">-</button>
                        <span id="sz">${box.fontSize}</span>
                        <button class="circle-btn" onclick="adjustFont(${idx},2)">+</button>
                    </div>
                </div>
                <div class="property-group">
                    <h4>Content</h4>
                    <div class="mode-toggle">
                        <button class="mode-btn ${!box.isVar ? 'active' : ''}" onclick="setMode(${idx},false)">Constant</button>
                        <button class="mode-btn ${box.isVar ? 'active' : ''}" onclick="setMode(${idx},true)">Variable</button>
                    </div>
                    <div id="ctrls">${renderTextControl()}</div>
                </div>
                <button class="primary-btn" style="margin-top:20px;" onclick="closePop(); drawBoxes();">Save Box</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function updateBoxValue(idx, val) { 
    currentView.boxes[idx].textVal = val; 
    refreshUI(idx); 
    if(currentView.boxes[idx].isVar) { 
        const ctrls = document.getElementById('ctrls');
        if(ctrls) ctrls.innerHTML = `<div class="pills-container">${currentView.headers.map(h => `<div class="var-pill ${currentView.boxes[idx].textVal === h ? 'selected' : ''}" onclick="updateBoxValue(${idx}, '${h}')">${h}</div>`).join('')}</div>`;
    } 
}

function refreshUI(idx) {
    const box = currentView.boxes[idx];
    const p = document.getElementById('prev');
    const t = document.getElementById('prev-txt');
    if(p) {
        p.style.background = box.bgColor; 
        p.style.color = box.textColor;
        t.innerText = box.isVar ? `<${box.textVal}>` : box.textVal;
        t.style.fontSize = box.fontSize + 'px';
        p.querySelector('small').innerText = box.title;
    }
    saveAll();
}

function setMode(idx, m) { 
    currentView.boxes[idx].isVar = m; 
    saveAll(); closePop(); openEditor(idx); 
}

function startPresentation() {
    if (!currentView.data || currentView.data.length === 0) return alert("No data found! Upload Excel first.");
    currentRowIndex = 0;
    renderSlide();
}

function renderSlide() {
    const app = document.getElementById('app');
    const row = currentView.data[currentRowIndex];
    
    app.innerHTML = `
        <div class="presentation-wrapper">
            <div class="presentation-header">
                <h3>${currentView.name}</h3>
                <div style="position: absolute; right: 0; color: var(--slate);">
                    Row ${currentRowIndex + 1} / ${currentView.data.length}
                </div>
            </div>

            <div class="presentation-canvas-container">
                <div class="canvas-16-9" id="slide-canvas"></div>
            </div>

            <div class="presentation-footer">
                <button class="blue-btn" onclick="openMenu('${currentView.createdAt}')">Home</button>
                <div class="nav-group-right">
                    <button class="blue-btn" onclick="prevSlide()">Previous</button>
                    <button class="blue-btn" onclick="nextSlide()">Next</button>
                </div>
            </div>
        </div>
    `;

    const canvas = document.getElementById('slide-canvas');
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div');
        div.className = 'box-instance';
        div.style.left = `${(box.x/6)*100}%`;
        div.style.top = `${(box.y/4)*100}%`;
        div.style.width = `${(box.w/6)*100}%`;
        div.style.height = `${(box.h/4)*100}%`;
        div.style.background = box.bgColor;
        div.style.color = box.textColor;
        
        const val = box.isVar ? (row[box.textVal] || '---') : box.textVal;
        div.innerHTML = `<small style="opacity:0.6; font-size:0.6em;">${box.title}</small>
                         <div style="font-size:${box.fontSize}px; font-weight:bold;">${val}</div>`;
        div.onclick = () => openDetailModal(i, val);
        canvas.appendChild(div);
    });
}

function openDetailModal(idx, val) {
    const box = currentView.boxes[idx];
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.innerHTML = `
        <div class="detail-modal" style="background:white; width:90%; height:90%; border-radius:24px; display:flex; flex-direction:column; padding:30px; box-shadow:0 10px 50px rgba(0,0,0,0.5);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2>${box.title}</h2>
                <div style="font-size:2rem; cursor:pointer;" onclick="closePop()">✕</div>
            </div>
            <div style="flex:1; overflow-y:auto; font-size:3rem; font-weight:bold; background:#f8fafc; padding:20px; border-radius:15px; margin:20px 0;">${val}</div>
            <div style="display:flex; gap:10px;">
                <button class="primary-btn" style="width:auto; padding:15px 30px;" onclick="editOnSpot(${idx})">Edit Value</button>
                <button class="blue-btn" onclick="closePop()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function editOnSpot(idx) {
    const box = currentView.boxes[idx];
    if(!box.isVar) return alert("Only Variables can be edited.");
    const oldVal = currentView.data[currentRowIndex][box.textVal];
    const newVal = prompt("Edit Value:", oldVal);
    if(newVal !== null && newVal !== oldVal) {
        currentView.data[currentRowIndex][box.textVal] = newVal;
        changeLog.push({ time: new Date().toLocaleString(), row: currentRowIndex+1, col: box.textVal, old: oldVal, new: newVal });
        saveAll(); closePop(); renderSlide();
    }
}

function uploadExcel() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx,.xls';
    input.onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const wb = XLSX.read(evt.target.result, {type:'binary'});
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            currentView.headers = Object.keys(data[0] || {});
            currentView.data = data; currentView.excelName = e.target.files[0].name;
            saveAll(); renderEditCanvas();
        };
        reader.readAsBinaryString(e.target.files[0]);
    };
    input.click();
}

function uploadExcelFromEditor(idx) {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx,.xls';
    input.onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const wb = XLSX.read(evt.target.result, {type:'binary'});
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            currentView.headers = Object.keys(data[0] || {});
            currentView.data = data; currentView.excelName = e.target.files[0].name;
            saveAll(); closePop(); openEditor(idx);
        };
        reader.readAsBinaryString(e.target.files[0]);
    };
    input.click();
}

function nextSlide() { if(currentRowIndex < currentView.data.length - 1) { currentRowIndex++; renderSlide(); } else { alert("End of data."); renderHome(); } }
function prevSlide() { if(currentRowIndex > 0) { currentRowIndex--; renderSlide(); } }
function applyAttr(idx, prp, val) { currentView.boxes[idx][prp] = val; refreshUI(idx); }
function adjustFont(idx, d) { currentView.boxes[idx].fontSize += d; document.getElementById('sz').innerText = currentView.boxes[idx].fontSize; refreshUI(idx); }
function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function deleteBox(i) { currentView.boxes.splice(i,1); saveAll(); closePop(); drawBoxes(); }
function deleteView(id) { if(confirm("Delete View?")) { views=views.filter(v=>v.createdAt!=id); saveAll(); renderHome(); } }

function exportData() {
    const ws = XLSX.utils.json_to_sheet(currentView.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DataView_Export");
    XLSX.writeFile(wb, `${currentView.name}_Export.xlsx`);
    if(changeLog.length > 0) {
        let log = "Change History:\n";
        changeLog.forEach(l => log += `[${l.time}] Row ${l.row}, ${l.col}: ${l.old} -> ${l.new}\n`);
        const blob = new Blob([log], {type:'text/plain'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${currentView.name}_changes.log`; a.click();
    }
}
