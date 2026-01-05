/**
 * DATA VIEW - CONSOLIDATED ENGINE v5.0
 */

let views = [];
let currentView = null;
let pendingBox = null;

const bgPresets = ['#ffffff','#f1f5f9','#cbd5e1','linear-gradient(135deg,#60a5fa,#3b82f6)','linear-gradient(135deg,#34d399,#10b981)','linear-gradient(135deg,#fb923c,#f97316)','#fee2e2','#fef3c7','#dcfce7','#1e293b','#334155','#475569'];
const textPresets = ['#000000','#ffffff','#475569','#ef4444','#3b82f6','#10b981'];

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('dataView_v5');
    if (saved) views = JSON.parse(saved);
    renderHome();
});

function saveAll() { localStorage.setItem('dataView_v5', JSON.stringify(views)); }

// --- MAIN SCREENS ---

function renderHome() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <button class="primary-btn" onclick="createNewView()">+ Create New View</button>
        <h2 style="text-align:center; margin-top:40px;">Existing Displays</h2>
        <div id="view-list"></div>
    `;
    const list = document.getElementById('view-list');
    views.sort((a,b) => b.updatedAt - a.updatedAt).forEach(v => {
        const div = document.createElement('div');
        div.style = "background:white; padding:18px; border-radius:15px; margin-top:12px; display:flex; justify-content:space-between; align-items:center; border:1px solid #e2e8f0; box-shadow:0 2px 4px rgba(0,0,0,0.02);";
        div.innerHTML = `<div><strong>${v.name}</strong></div><button class="blue-btn" onclick="openMenu('${v.createdAt}')">Open</button>`;
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
    drawGrid(); drawBoxes();
}

// --- CANVAS & COLLISION LOGIC ---

function drawGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    for (let i = 0; i < 24; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        const x = i % 6, y = Math.floor(i / 6);
        cell.onclick = () => {
            if(!pendingBox) return alert("Select a size first!");
            if(x + pendingBox.w > 6 || y + pendingBox.h > 4) return alert("Fits outside board!");
            const overlap = currentView.boxes.some(b => x < b.x + b.w && x + pendingBox.w > b.x && y < b.y + b.h && y + pendingBox.h > b.y);
            if(overlap) return alert("Space occupied!");

            currentView.boxes.push({x, y, w:pendingBox.w, h:pendingBox.h, title:'Title', textVal:'Text', isVar:false, bgColor:'#ffffff', textColor:'#000', fontSize:18});
            pendingBox = null; saveAll(); drawBoxes();
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
        div.style.left = `${(box.x/6)*100}%`; div.style.top = `${(box.y/4)*100}%`;
        div.style.width = `${(box.w/6)*100}%`; div.style.height = `${(box.h/4)*100}%`;
        div.style.background = box.bgColor; div.style.color = box.textColor;
        const display = box.isVar ? `<${box.textVal}>` : box.textVal;
        div.innerHTML = `<small style="font-size:0.65em; opacity:0.8; margin-bottom:4px;">${box.title}</small>
                         <div style="font-size:${box.fontSize}px; font-weight:bold;">${display}</div>`;
        div.onclick = (e) => { e.stopPropagation(); openChoiceMenu(i); };
        layer.appendChild(div);
    });
}

function openChoiceMenu(idx) {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.innerHTML = `
        <div class="choice-window" style="background:white; padding:25px; border-radius:20px; text-align:center;">
            <h3 style="margin-top:0">Box Options</h3>
            <button class="primary-btn" onclick="closePop(); openEditor(${idx})">Edit Appearance</button><br><br>
            <button class="primary-btn" style="background:var(--danger)" onclick="deleteBox(${idx})">Delete Box</button><br><br>
            <button class="primary-btn" style="background:var(--slate)" onclick="closePop()">Back</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

// --- PROPORTIONAL EDITOR POPUP ---

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

// --- HELPERS ---

function updateBoxValue(idx, val) { 
    currentView.boxes[idx].textVal = val; 
    refreshUI(idx); 
    if(currentView.boxes[idx].isVar) { 
        const container = document.getElementById('ctrls');
        if(container) {
            container.innerHTML = `<div class="pills-container">${currentView.headers.map(h => `<div class="var-pill ${currentView.boxes[idx].textVal === h ? 'selected' : ''}" onclick="updateBoxValue(${idx}, '${h}')">${h}</div>`).join('')}</div>`;
        }
    } 
}
function refreshUI(idx) {
    const box = currentView.boxes[idx];
    const p = document.getElementById('prev');
    const t = document.getElementById('prev-txt');
    if(p) {
        p.style.background = box.bgColor; p.style.color = box.textColor;
        t.innerText = box.isVar ? `<${box.textVal}>` : box.textVal;
        t.style.fontSize = box.fontSize + 'px';
        p.querySelector('small').innerText = box.title;
    }
    saveAll();
}
function applyAttr(idx, prp, val) { currentView.boxes[idx][prp] = val; refreshUI(idx); }
function adjustFont(idx, d) { currentView.boxes[idx].fontSize += d; document.getElementById('sz').innerText = currentView.boxes[idx].fontSize; refreshUI(idx); }
function setMode(idx, m) { currentView.boxes[idx].isVar = m; closePop(); openEditor(idx); saveAll(); }
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
function selectSize(w, h) { pendingBox = {w, h}; }
function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function deleteBox(i) { currentView.boxes.splice(i,1); saveAll(); closePop(); drawBoxes(); }

function openMenu(id) {
    currentView = views.find(v => v.createdAt == id);
    document.getElementById('app').innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:50px;">
            <button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="alert('Export Mode Ready')">Export</button>
            <button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="alert('View Mode Ready')">View</button>
            <button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="renderEditCanvas()">Edit</button>
            <button class="blue-btn" style="height:140px; font-size:1.2rem; background:var(--danger);" onclick="views=views.filter(v=>v.createdAt!=${id}); saveAll(); renderHome();">Delete</button>
        </div>
        <button onclick="renderHome()" style="margin-top:30px; width:100%; background:none; text-decoration:underline; border:none; cursor:pointer;">Back Home</button>
    `;
}
