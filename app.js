/**
 * DATA VIEW - CONSOLIDATED ENGINE v3.0
 */

let views = [];
let currentView = null;
let pendingBox = null;

// Presets for Modern UI
const bgPresets = [
    '#ffffff', '#f1f5f9', '#cbd5e1', 
    'linear-gradient(135deg, #60a5fa, #3b82f6)', 'linear-gradient(135deg, #34d399, #10b981)', 'linear-gradient(135deg, #fb923c, #f97316)',
    '#fee2e2', '#fef3c7', '#dcfce7',
    '#1e293b', '#334155', '#475569'
];
const textPresets = ['#000000', '#ffffff', '#475569', '#ef4444', '#3b82f6', '#10b981'];

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('dataView_final_v1');
    if (saved) views = JSON.parse(saved);
    renderHome();
});

function saveAll() { localStorage.setItem('dataView_final_v1', JSON.stringify(views)); }

// --- VIEWS ---

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
        div.style = "background:white; padding:18px; border-radius:15px; margin-top:12px; display:flex; justify-content:space-between; align-items:center; border:1px solid #e2e8f0; box-shadow:0 2px 4px rgba(0,0,0,0.02);";
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

function renderEditCanvas() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="canvas-header">
            <input type="text" value="${currentView.name}" oninput="currentView.name=this.value; saveAll();" style="font-size:1.2rem; font-weight:bold; border:none; border-bottom:1px solid #ddd; outline:none; background:transparent;">
            <button class="orange-btn" onclick="uploadExcel()">${currentView.excelName ? 'Change Excel' : 'Upload Excel'}</button>
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

// --- LOGIC ---

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

            currentView.boxes.push({x, y, w:pendingBox.w, h:pendingBox.h, title:'Title', variable:null, bgColor:'#ffffff', textColor:'#000', fontSize:18});
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
        div.style.left = `${(box.x / 6) * 100}%`;
        div.style.top = `${(box.y / 4) * 100}%`;
        div.style.width = `${(box.w / 6) * 100}%`;
        div.style.height = `${(box.h / 4) * 100}%`;
        div.style.background = box.bgColor;
        div.style.color = box.textColor;
        div.innerHTML = `<small style="font-size:0.65em; opacity:0.8; margin-bottom:4px;">${box.title}</small>
                         <div style="font-size:${box.fontSize}px; font-weight:bold;">${box.variable || 'Bind Data'}</div>`;
        div.onclick = (e) => { e.stopPropagation(); openChoiceMenu(i); };
        layer.appendChild(div);
    });
}

function openChoiceMenu(idx) {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.innerHTML = `
        <div class="choice-window">
            <h3 style="margin:0 0 10px 0;">Box Options</h3>
            <button class="primary-btn" style="background:var(--primary)" onclick="closePop(); openEditor(${idx})">Edit Appearance</button>
            <button class="primary-btn" style="background:var(--danger)" onclick="deleteBox(${idx})">Delete Box</button>
            <button class="primary-btn" style="background:#64748b" onclick="closePop()">Back</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

function openEditor(idx) {
    const box = currentView.boxes[idx];
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.innerHTML = `
        <div class="editor-window">
            <div style="flex:1; border-right:1px solid #eee; overflow-y:auto; padding-right:15px;">
                <h4 style="margin-top:0">Import Variables</h4>
                ${currentView.headers.map(h => `<button onclick="bindVar(${idx},'${h}')" style="display:block; width:100%; margin-bottom:6px; text-align:left; padding:10px; border:1px solid #ddd; border-radius:8px; background:#f8fafc;">${h}</button>`).join('')}
            </div>
            <div style="flex:2; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f1f5f9; border-radius:20px;">
                <input type="text" value="${box.title}" oninput="currentView.boxes[${idx}].title=this.value" style="font-size:1.5rem; text-align:center; font-weight:bold; border:none; background:transparent; margin-bottom:15px; border-bottom:2px solid #3b82f6;">
                <div id="prev" style="width:280px; height:200px; background:${box.bgColor}; color:${box.textColor}; font-size:${box.fontSize}px; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 10px 20px rgba(0,0,0,0.1); border:2px solid #1e293b;">
                    <small style="opacity:0.7">${box.title}</small><div style="font-weight:bold">${box.variable || 'Variable Preview'}</div>
                </div>
            </div>
            <div style="flex:1; padding-left:15px;">
                <h4 style="margin-top:0">Coloring</h4>
                <p><small>Background (3x4)</small></p>
                <div class="color-grid">${bgPresets.map(c => `<div class="circle" style="background:${c}" onclick="applyColor(${idx},'bgColor','${c}')"></div>`).join('')}</div>
                <p style="margin-top:20px;"><small>Text (3x2)</small></p>
                <div class="color-grid">${textPresets.map(c => `<div class="circle" style="background:${c}" onclick="applyColor(${idx},'textColor','${c}')"></div>`).join('')}</div>
                <button class="primary-btn" style="margin-top:40px;" onclick="closePop(); drawBoxes();">Save Box</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

// --- HELPERS ---
function selectSize(w, h) { pendingBox = {w, h}; }
function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function applyColor(i, prop, val) { currentView.boxes[i][prop] = val; closePop(); openEditor(i); }
function bindVar(i, h) { currentView.boxes[i].variable = h; saveAll(); closePop(); drawBoxes(); }
function deleteBox(i) { currentView.boxes.splice(i,1); saveAll(); closePop(); drawBoxes(); }

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

function openMenu(id) {
    currentView = views.find(v => v.createdAt == id);
    document.getElementById('app').innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:50px;">
            <button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="alert('Export Logic...')">Export</button>
            <button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="alert('Slide Mode Ready')">View</button>
            <button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="renderEditCanvas()">Edit</button>
            <button class="blue-btn" style="height:140px; font-size:1.2rem; background:var(--danger);" onclick="views=views.filter(v=>v.createdAt!=${id}); saveAll(); renderHome();">Delete</button>
        </div>
        <button onclick="renderHome()" style="margin-top:30px; width:100%; background:none; text-decoration:underline;">Back Home</button>
    `;
}
