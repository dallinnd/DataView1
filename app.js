/**
 * DATA VIEW PRO - MASTER MERGED ENGINE
 * Combined v16.0 Logic + Modern Professional UI
 */

let views = [];
let currentView = null;
let pendingBox = null;
let currentRowIndex = 0;
let changeLog = [];

// SVGs for navigation and UI
const iconHome = `<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="white"/></svg>`;
const iconLeft = `<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="white"/></svg>`;
const iconRight = `<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="white"/></svg>`;

const bgPresets = ['#ffffff','#f1f5f9','#cbd5e1','linear-gradient(135deg, #667eea 0%, #764ba2 100%)','linear-gradient(135deg, #00b09b 0%, #96c93d 100%)','linear-gradient(135deg, #f093fb 0%, #f5576c 100%)','#fee2e2','#fef3c7','#dcfce7','#0f172a'];
const textPresets = ['#000000','#ffffff','#64748b','#ef4444','#3b82f6','#10b981'];

// --- INITIALIZATION & ROUTING ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('dataView_master_final');
    if (saved) views = JSON.parse(saved);
    
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('view');
    
    if (viewId) {
        currentView = views.find(v => v.createdAt == viewId);
        if (currentView) startPresentation();
    } else { 
        renderHome(); 
    }
});

function saveAll() { 
    localStorage.setItem('dataView_master_final', JSON.stringify(views));
}

// --- HOME MENU ---
function renderHome() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="home-container">
            <h1 style="font-weight:900; letter-spacing:-1px; margin-bottom:40px;">DataView <span style="color:var(--slate); font-weight:300;">Pro</span></h1>
            <button class="primary-btn" onclick="createNewView()">+ Create New View</button>
            <h2 style="font-size:0.8rem; color:var(--slate); text-transform:uppercase; letter-spacing:0.1em; margin-top:50px;">Recent Projects</h2>
            <div id="view-list" style="margin-top:15px;"></div>
        </div>`;
    
    views.sort((a,b) => b.updatedAt - a.updatedAt).forEach(v => {
        const div = document.createElement('div');
        div.className = "view-card";
        div.innerHTML = `
            <div>
                <div style="font-size:0.7rem; color:var(--slate); text-transform:uppercase; letter-spacing:1px;">Display</div>
                <strong style="font-size:1.1rem;">${v.name}</strong>
            </div>
            <button class="blue-btn" onclick="openMenu('${v.createdAt}')">Open</button>`;
        document.getElementById('view-list').appendChild(div);
    });
}

function createNewView() {
    currentView = { 
        name: 'New View', 
        createdAt: Date.now(), 
        updatedAt: Date.now(), 
        boxes: [], 
        headers: [], 
        data: [] 
    }; 
    views.push(currentView);
    saveAll(); 
    renderEditCanvas();
}

function openMenu(id) {
    currentView = views.find(v => v.createdAt == id);
    document.getElementById('app').innerHTML = `
        <div class="home-container">
            <h2 style="font-weight:800; margin-bottom:30px;">${currentView.name}</h2>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <button class="orange-btn" style="height:120px;" onclick="renderEditCanvas()">Edit Layout</button>
                <button class="blue-btn" style="height:120px;" onclick="window.open(window.location.origin+window.location.pathname+'?view='+currentView.createdAt,'_blank')">Launch View</button>
                <button class="size-btn" style="height:100px; color:white;" onclick="exportData()">Export XLSX</button>
                <button class="danger-btn" style="height:100px;" onclick="deleteView('${id}')">Delete</button>
            </div>
            <button onclick="renderHome()" style="margin-top:30px; color:var(--slate); background:none; text-transform:none; border:none; cursor:pointer;">← Back to Home</button>
        </div>`;
}

// --- EDITOR ENGINE ---
function renderEditCanvas() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="main-content">
            <aside class="editor-sidebar">
                <div class="property-group">
                    <h4>View Name</h4>
                    <input type="text" value="${currentView.name}" oninput="currentView.name=this.value; saveAll();">
                </div>
                <div class="property-group">
                    <h4>Add Element</h4>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                        ${['2x2','2x1','4x1','6x1','3x3','4x4'].map(s => `<button class="size-btn" onclick="selectSize(${s.split('x')[0]},${s.split('x')[1]})">${s}</button>`).join('')}
                    </div>
                </div>
                <div class="property-group">
                    <h4>Data Management</h4>
                    <button class="orange-btn" style="width:100%; margin-bottom:10px;" onclick="uploadExcel()">Upload Excel</button>
                    <button class="size-btn" style="width:100%; color:white;" onclick="exportData()">Export Data</button>
                </div>
                <button class="blue-btn" style="width:100%; margin-top:auto;" onclick="openMenu('${currentView.createdAt}')">Save & Exit</button>
            </aside>
            <main class="canvas-area">
                <div class="canvas-16-9" id="canvas-container">
                    <div class="grid-overlay" id="grid"></div>
                    <div id="boxes-layer"></div>
                </div>
            </main>
        </div>`;
    drawGrid(); drawBoxes();
}

function drawGrid() {
    const grid = document.getElementById('grid'); 
    grid.innerHTML = '';
    for (let i = 0; i < 24; i++) {
        const cell = document.createElement('div'); 
        cell.className = 'grid-cell';
        const x = i % 6, y = Math.floor(i / 6);
        cell.onclick = () => {
            if(!pendingBox) return;
            currentView.boxes.push({x, y, w:pendingBox.w, h:pendingBox.h, title:'New Box', textVal:'Variable', isVar:true, bgColor:'#ffffff', textColor:'#000', fontSize:32});
            pendingBox = null; saveAll(); drawBoxes();
        }; 
        grid.appendChild(cell);
    }
}

function drawBoxes() {
    const layer = document.getElementById('boxes-layer'); 
    if (!layer) return; 
    layer.innerHTML = '';
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div'); 
        div.className = 'box-instance';
        div.style.left = `${(box.x/6)*100}%`; div.style.top = `${(box.y/4)*100}%`;
        div.style.width = `${(box.w/6)*100}%`; div.style.height = `${(box.h/4)*100}%`;
        div.style.background = box.bgColor; div.style.color = box.textColor;
        div.innerHTML = `<div class="box-title">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${box.isVar ? '<' + box.textVal + '>' : box.textVal}</div>`;
        div.onclick = (e) => { e.stopPropagation(); openChoiceMenu(i); }; 
        layer.appendChild(div);
    });
}

function selectSize(w, h) { pendingBox = {w, h}; }

// --- BOX OPTIONS & PROPERTY EDITOR ---
function openChoiceMenu(idx) {
    const overlay = document.createElement('div'); overlay.className = 'popup-overlay';
    overlay.innerHTML = `
        <div class="choice-window">
            <h3 style="margin-bottom:20px;">Element Options</h3>
            <div class="choice-btn-group">
                <button class="blue-btn" onclick="closePop(); openEditor(${idx})">Edit Design</button>
                <button class="danger-btn" onclick="deleteBox(${idx})">Delete</button>
                <button class="size-btn" style="color:white;" onclick="closePop()">Cancel</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

function openEditor(idx) {
    const box = currentView.boxes[idx];
    const overlay = document.createElement('div'); overlay.className = 'popup-overlay';
    
    const renderCtrls = () => {
        if (!box.isVar) return `<input type="text" value="${box.textVal}" oninput="updateBoxValue(${idx}, this.value)" style="width:100%;">`;
        if (!currentView.headers || currentView.headers.length === 0) return `<button class="orange-btn" style="width:100%" onclick="uploadExcel()">Upload Excel for Variables</button>`;
        return `<div class="pills-container">${currentView.headers.map(h => `<div class="var-pill ${box.textVal === h ? 'selected' : ''}" onclick="updateBoxValue(${idx}, '${h}')">${h}</div>`).join('')}</div>`;
    };

    overlay.innerHTML = `
        <div class="detail-modal" style="flex-direction:row; gap:30px; align-items:flex-start;">
            <div style="flex:1; background:#f8fafc; border-radius:24px; padding:30px; height:100%; display:flex; flex-direction:column; align-items:center;">
                <input type="text" value="${box.title}" oninput="currentView.boxes[${idx}].title=this.value; refreshUI(${idx})" style="text-align:center; font-weight:900; border:none; background:transparent; font-size:1.5rem; margin-bottom:20px;">
                <div id="prev" style="width:100%; aspect-ratio:${box.w}/${box.h}; background:${box.bgColor}; color:${box.textColor}; border-radius:24px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 20px 40px rgba(0,0,0,0.1);">
                    <div class="box-title" id="prev-title">${box.title}</div>
                    <div class="box-content" id="prev-txt" style="font-size:${box.fontSize}px;">${box.isVar ? '<'+box.textVal+'>' : box.textVal}</div>
                </div>
            </div>
            <div style="width:400px; height:100%; overflow-y:auto;">
                <div class="property-group">
                    <h4>Background</h4>
                    <div class="color-grid">${bgPresets.map(c => `<div class="circle" style="background:${c}" onclick="applyAttr(${idx},'bgColor','${c}')"></div>`).join('')}</div>
                </div>
                <div class="property-group">
                    <h4>Content Mode</h4>
                    <div style="display:flex; gap:10px; margin-bottom:15px;">
                        <button class="size-btn ${!box.isVar ? 'blue-btn' : ''}" onclick="setMode(${idx},false)">Constant</button>
                        <button class="size-btn ${box.isVar ? 'blue-btn' : ''}" onclick="setMode(${idx},true)">Variable</button>
                    </div>
                    <div id="ctrls">${renderCtrls()}</div>
                </div>
                <div class="property-group">
                    <h4>Text Size</h4>
                    <div style="display:flex; align-items:center; gap:20px;">
                        <button class="size-btn" onclick="adjustFont(${idx},-4)">-</button>
                        <span id="sz" style="font-weight:900; font-size:1.2rem;">${box.fontSize}</span>
                        <button class="size-btn" onclick="adjustFont(${idx},4)">+</button>
                    </div>
                </div>
                <button class="primary-btn" onclick="closePop(); drawBoxes();">Apply Changes</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

// --- PRESENTATION ENGINE ---
function startPresentation() {
    currentRowIndex = 0; 
    renderSlide();
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
        if (e.key === 'ArrowLeft') prevSlide();
        if (e.key === 'Escape') window.close();
    });
}

function renderSlide() {
    const row = currentView.data[currentRowIndex] || {};
    document.getElementById('app').innerHTML = `
        <div class="presentation-fullscreen">
            <div class="slide-fit" id="slide-canvas"></div>
            <div class="presentation-nav">
                <button onclick="window.close()">${iconHome}</button>
                <span>${currentRowIndex+1} / ${currentView.data.length}</span>
                <button onclick="prevSlide()">${iconLeft}</button>
                <button onclick="nextSlide()">${iconRight}</button>
            </div>
        </div>`;
    
    const canvas = document.getElementById('slide-canvas');
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div'); div.className = 'box-instance';
        div.style.left = `${(box.x/6)*100}%`; div.style.top = `${(box.y/4)*100}%`;
        div.style.width = `${(box.w/6)*100}%`; div.style.height = `${(box.h/4)*100}%`;
        div.style.background = box.bgColor; div.style.color = box.textColor;
        const val = box.isVar ? (row[box.textVal] || '---') : box.textVal;
        div.innerHTML = `<div class="box-title">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${val}</div>`;
        div.onclick = () => openDetailModal(i, val);
        canvas.appendChild(div);
    });
}

function openDetailModal(idx, val) {
    const box = currentView.boxes[idx];
    const overlay = document.createElement('div'); overlay.className = 'popup-overlay';
    const editBtn = box.isVar ? `<button class="orange-btn" onclick="editLiveValue(${idx})">Edit Value</button>` : '';
    
    overlay.innerHTML = `
        <div class="detail-modal">
            <div style="width:100%; display:flex; justify-content:space-between;">
                <h4 style="color:var(--slate); margin:0;">${box.title}</h4>
                <button onclick="closePop()" style="color:black; background:none; font-size:1.5rem;">✕</button>
            </div>
            <div class="detail-value" id="det-val">${val}</div>
            <div style="display:flex; gap:15px;">
                ${editBtn}
                <button class="blue-btn" style="background:var(--slate)" onclick="closePop()">Close</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

function editLiveValue(boxIdx) {
    const box = currentView.boxes[boxIdx];
    const oldVal = currentView.data[currentRowIndex][box.textVal];
    const newVal = prompt(`New value for ${box.textVal}:`, oldVal);
    
    if (newVal !== null && newVal !== oldVal) {
        changeLog.push({ 
            time: new Date().toLocaleString(), 
            row: currentRowIndex+1, 
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

// --- UTILS & DATA ---
function refreshUI(idx) { 
    const box = currentView.boxes[idx]; 
    const p = document.getElementById('prev'); 
    const t = document.getElementById('prev-txt'); 
    if(p && t) { 
        p.style.background = box.bgColor; 
        p.style.color = box.textColor; 
        t.innerText = box.isVar ? `<${box.textVal}>` : box.textVal; 
        t.style.fontSize = box.fontSize + 'px'; 
    } 
    saveAll(); 
}

function updateBoxValue(idx, val) { 
    currentView.boxes[idx].textVal = val; 
    refreshUI(idx); 
    closePop(); 
    openEditor(idx); 
}

function applyAttr(idx, prp, val) { currentView.boxes[idx][prp] = val; refreshUI(idx); }
function adjustFont(idx, d) { currentView.boxes[idx].fontSize += d; document.getElementById('sz').innerText = currentView.boxes[idx].fontSize; refreshUI(idx); }
function setMode(idx, m) { currentView.boxes[idx].isVar = m; saveAll(); closePop(); openEditor(idx); }
function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function deleteBox(i) { currentView.boxes.splice(i,1); saveAll(); closePop(); drawBoxes(); }
function deleteView(id) { if(confirm("Delete this view permanently?")) { views=views.filter(v=>v.createdAt!=id); saveAll(); renderHome(); } }
function nextSlide() { if (currentRowIndex < currentView.data.length - 1) { currentRowIndex++; renderSlide(); } }
function prevSlide() { if (currentRowIndex > 0) { currentRowIndex--; renderSlide(); } }

function uploadExcel() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx,.xls';
    input.onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const wb = XLSX.read(evt.target.result, {type:'binary'});
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            currentView.headers = Object.keys(data[0] || {});
            currentView.data = data;
            saveAll(); renderEditCanvas();
        };
        reader.readAsBinaryString(e.target.files[0]);
    };
    input.click();
}

function exportData() {
    const ws = XLSX.utils.json_to_sheet(currentView.data); 
    const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, "Data"); 
    XLSX.writeFile(wb, `${currentView.name}_Export.xlsx`);
    
    if (changeLog.length > 0) {
        let log = "CHANGE LOG\n" + changeLog.map(l => `[${l.time}] Row ${l.row}, ${l.col}: ${l.old} -> ${l.new}`).join('\n');
        const blob = new Blob([log], {type:'text/plain'}); 
        const a = document.createElement('a'); 
        a.href = URL.createObjectURL(blob); 
        a.download = `${currentView.name}_ChangeLog.txt`; 
        a.click();
    }
}
