/**
 * DATA VIEW - CORE ENGINE
 * Includes: Collision Detection, Excel Parsing, Slide Mode, and Modern Editor
 */

// --- GLOBAL STATE ---
let views = [];
let currentView = null;
let pendingBox = null;
let currentRowIndex = 0;
let changeLog = [];

// --- COLOR PRESETS (Circular Selectors) ---
const bgPresets = [
    '#ffffff', '#f1f5f9', '#cbd5e1', 
    'linear-gradient(135deg, #60a5fa, #3b82f6)', 'linear-gradient(135deg, #34d399, #10b981)', 'linear-gradient(135deg, #fb923c, #f97316)',
    '#fee2e2', '#fef3c7', '#dcfce7',
    '#1e293b', '#334155', '#475569'
];
const textPresets = ['#000000', '#ffffff', '#475569', '#ef4444', '#3b82f6', '#10b981'];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Data View Engine Initialized");
    const saved = localStorage.getItem('dataView_storage_v2');
    if (saved) views = JSON.parse(saved);
    renderHome();
});

function saveState() {
    localStorage.setItem('dataView_storage_v2', JSON.stringify(views));
}

// --- HOME SCREEN ---
function renderHome() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <button class="primary-btn" onclick="createNewView()">+ Create New View</button>
        <h2 style="text-align:center; margin-top:40px; color:#475569;">Existing Displays</h2>
        <div id="view-list"></div>
    `;
    const list = document.getElementById('view-list');
    views.sort((a,b) => b.updatedAt - a.updatedAt).forEach(v => {
        const card = document.createElement('div');
        card.className = 'view-card-horizontal';
        card.style = "background:white; padding:20px; border-radius:15px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border:1px solid #e2e8f0;";
        card.innerHTML = `
            <div><strong>${v.name}</strong><br><small style="color:#94a3b8">Modified: ${new Date(v.updatedAt).toLocaleDateString()}</small></div>
            <button class="blue-btn" onclick="openMenu('${v.createdAt}')">Open</button>
        `;
        list.appendChild(card);
    });
}

function createNewView() {
    const nv = { 
        name: 'Untitled Display', 
        createdAt: Date.now(), 
        updatedAt: Date.now(), 
        boxes: [], 
        headers: [], 
        data: [],
        excelName: null 
    };
    views.push(nv);
    currentView = nv;
    renderEditCanvas();
}

// --- CANVAS EDITING (16:9) ---
function renderEditCanvas() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="canvas-header">
            <input type="text" value="${currentView.name}" oninput="currentView.name=this.value; saveState();" style="font-size:1.2rem; font-weight:700; border:none; background:transparent; border-bottom:2px solid #e2e8f0; outline:none;">
            <div style="text-align:center;">
                <button class="orange-btn" onclick="handleExcelUpload()">${currentView.excelName ? 'Change Excel' : 'Upload Excel'}</button>
            </div>
            <div style="text-align:right;">
                <button class="blue-btn" onclick="openMenu('${currentView.createdAt}')">Save & Exit</button>
            </div>
        </div>

        <div class="canvas-16-9" id="canvas-container">
            <div id="grid-overlay" class="grid-overlay"></div>
            <div id="box-layer"></div>
        </div>

        <div class="palette-bar" style="display:flex; justify-content:center; gap:10px; margin-top:20px;">
            ${['2x2','2x1','4x1','6x1','3x3','4x4'].map(size => {
                const [w,h] = size.split('x').map(Number);
                return `<button class="blue-btn" style="background:#f1f5f9; color:#475569;" onclick="setPendingBox(${w},${h})">${size}</button>`;
            }).join('')}
        </div>
    `;
    drawGrid();
    drawBoxes();
}

function setPendingBox(w, h) {
    pendingBox = { w, h };
    console.log(`Ready to place ${w}x${h} box`);
}

function drawGrid() {
    const grid = document.getElementById('grid-overlay');
    grid.innerHTML = '';
    // Create 24 cells for 6x4 grid
    for (let i = 0; i < 24; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        const x = i % 6;
        const y = Math.floor(i / 6);
        cell.onclick = () => placeBox(x, y);
        grid.appendChild(cell);
    }
}

// --- COLLISION & BOUNDARY LOGIC ---
function placeBox(x, y) {
    if (!pendingBox) return alert("Select a box size from the bottom buttons first!");

    // 1. Boundary Check
    if (x + pendingBox.w > 6 || y + pendingBox.h > 4) {
        return alert("Box is too big to fit here!");
    }

    // 2. Overlap Check
    const isOverlapping = currentView.boxes.some(b => {
        return (x < b.x + b.w && x + pendingBox.w > b.x && y < b.y + b.h && y + pendingBox.h > b.y);
    });

    if (isOverlapping) return alert("Space already occupied!");

    // 3. Add Box
    currentView.boxes.push({
        x, y, w: pendingBox.w, h: pendingBox.h,
        title: 'Title',
        variable: null,
        bgColor: '#ffffff',
        textColor: '#000000',
        fontSize: 18
    });

    pendingBox = null;
    currentView.updatedAt = Date.now();
    saveState();
    drawBoxes();
}

function drawBoxes() {
    const layer = document.getElementById('box-layer');
    layer.innerHTML = '';
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div');
        div.className = 'box-instance';
        div.style.left = `calc(${(box.x / 6) * 100}% + 10px)`;
        div.style.top = `calc(${(box.y / 4) * 100}% + 10px)`;
        div.style.width = `calc(${(box.w / 6) * 100}% - 10px)`;
        div.style.height = `calc(${(box.h / 4) * 100}% - 10px)`;
        div.style.background = box.bgColor;
        div.style.color = box.textColor;
        div.style.fontSize = box.fontSize + 'px';
        div.innerHTML = `<small style="opacity:0.6">${box.title}</small><div style="font-weight:bold">${box.variable || 'Bind Data'}</div>`;
        div.onclick = (e) => { e.stopPropagation(); openBoxEditor(i); };
        layer.appendChild(div);
    });
}

// --- MODERN BOX EDITOR ---
function openBoxEditor(idx) {
    const box = currentView.boxes[idx];
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.innerHTML = `
        <div class="editor-window">
            <div style="flex:1; border-right:1px solid #f1f5f9; overflow-y:auto; padding-right:15px;">
                <h4 style="margin-top:0">Import Variables</h4>
                ${currentView.headers.length > 0 ? 
                    currentView.headers.map(h => `<button onclick="bindVar(${idx},'${h}')" class="var-pill">${h}</button>`).join('') :
                    '<p style="font-size:0.8rem; color:#94a3b8">Upload Excel to see variables</p>'}
            </div>
            <div style="flex:2; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f8fafc; border-radius:20px;">
                <input type="text" value="${box.title}" oninput="currentView.boxes[${idx}].title=this.value" style="text-align:center; font-size:1.5rem; font-weight:bold; border:none; background:transparent; margin-bottom:20px; outline:none;">
                <div id="live-prev" style="width:300px; height:200px; border-radius:15px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:${box.bgColor}; color:${box.textColor}; box-shadow:0 10px 20px rgba(0,0,0,0.1); border:1px solid #ddd;">
                    <small style="opacity:0.7">${box.title}</small>
                    <div style="font-size:${box.fontSize}px; font-weight:bold;">${box.variable || 'Variable Preview'}</div>
                </div>
            </div>
            <div style="flex:1; padding-left:15px;">
                <h4 style="margin-top:0">Coloring</h4>
                <p><small>Background (3x4)</small></p>
                <div class="color-grid bg-grid">${bgPresets.map(c => `<div class="color-circle" style="background:${c}" onclick="updateBoxAttr(${idx},'bgColor','${c}')"></div>`).join('')}</div>
                <p style="margin-top:20px;"><small>Text (3x2)</small></p>
                <div class="color-grid text-grid">${textPresets.map(c => `<div class="color-circle" style="background:${c}" onclick="updateBoxAttr(${idx},'textColor','${c}')"></div>`).join('')}</div>
                <p style="margin-top:20px;"><small>Text Size</small></p>
                <button class="blue-btn" onclick="updateBoxAttr(${idx},'fontSize',${box.fontSize+2})">+</button>
                <button class="blue-btn" onclick="updateBoxAttr(${idx},'fontSize',${box.fontSize-2})">-</button>
                <button class="primary-btn" onclick="document.querySelector('.popup-overlay').remove(); drawBoxes();" style="margin-top:40px;">Save Box</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function updateBoxAttr(i, prop, val) {
    currentView.boxes[i][prop] = val;
    saveState();
    const lp = document.getElementById('live-prev');
    if (prop === 'bgColor') lp.style.background = val;
    if (prop === 'textColor') lp.style.color = val;
    if (prop === 'fontSize') lp.querySelector('div').style.fontSize = val + 'px';
}

function bindVar(i, h) { 
    currentView.boxes[i].variable = h; 
    saveState(); 
    document.querySelector('.popup-overlay').remove(); 
    drawBoxes(); 
}

// --- EXCEL & DATA ---
function handleExcelUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    input.onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            currentView.headers = Object.keys(data[0] || {});
            currentView.data = data;
            currentView.excelName = e.target.files[0].name;
            saveState();
            renderEditCanvas();
            alert("Data successfully imported!");
        };
        reader.readAsBinaryString(e.target.files[0]);
    };
    input.click();
}

// --- ACTION MENU (2x2) ---
function openMenu(id) {
    currentView = views.find(v => v.createdAt == id);
    document.getElementById('app').innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:50px;">
            <button class="menu-item" style="height:150px; background:white; font-size:1.2rem; border:1px solid #e2e8f0; border-radius:20px;" onclick="exportData()">Export<br><small>Excel + Change Log</small></button>
            <button class="menu-item" style="height:150px; background:white; font-size:1.2rem; border:1px solid #e2e8f0; border-radius:20px;" onclick="startPresentation()">View<br><small>Row-by-Row Presentation</small></button>
            <button class="menu-item" style="height:150px; background:white; font-size:1.2rem; border:1px solid #e2e8f0; border-radius:20px;" onclick="renderEditCanvas()">Edit<br><small>Modify Layout</small></button>
            <button class="menu-item" style="height:150px; background:#fef2f2; color:#ef4444; font-size:1.2rem; border:1px solid #fee2e2; border-radius:20px;" onclick="deleteView('${id}')">Delete<br><small>Permanent</small></button>
        </div>
        <button onclick="renderHome()" style="margin-top:30px; width:100%; background:none; text-decoration:underline; color:#64748b; border:none; cursor:pointer;">Back to Home</button>
    `;
}

// --- PRESENTATION MODE ---
function startPresentation() {
    if (!currentView.data || currentView.data.length === 0) return alert("No Excel data to display!");
    currentRowIndex = 0;
    renderSlide();
}

function renderSlide() {
    const row = currentView.data[currentRowIndex];
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <button onclick="openMenu('${currentView.createdAt}')" class="blue-btn">Exit Presentation</button>
            <span>Row ${currentRowIndex + 1} of ${currentView.data.length}</span>
        </div>
        <div class="canvas-16-9" id="slide-container"></div>
        <div style="display:flex; justify-content:center; gap:20px; margin-top:20px;">
            <button class="blue-btn" onclick="prevSlide()">Previous</button>
            <button class="blue-btn" onclick="nextSlide()">Next</button>
        </div>
    `;

    const container = document.getElementById('slide-container');
    currentView.boxes.forEach(box => {
        const el = document.createElement('div');
        el.className = 'box-instance';
        el.style.left = `calc(${(box.x / 6) * 100}% + 10px)`;
        el.style.top = `calc(${(box.y / 4) * 100}% + 10px)`;
        el.style.width = `calc(${(box.w / 6) * 100}% - 10px)`;
        el.style.height = `calc(${(box.h / 4) * 100}% - 10px)`;
        el.style.background = box.bgColor;
        el.style.color = box.textColor;
        el.style.fontSize = box.fontSize + 'px';
        
        const val = row[box.variable] || '---';
        el.innerHTML = `<small style="opacity:0.6">${box.title}</small><div style="font-weight:bold">${val}</div>`;
        el.onclick = () => openFullText(box.variable, val, box.title);
        container.appendChild(el);
    });
}

function nextSlide() {
    if (currentRowIndex < currentView.data.length - 1) {
        currentRowIndex++;
        renderSlide();
    } else {
        alert("Last slide reached. Returning Home.");
        renderHome();
    }
}

function prevSlide() {
    if (currentRowIndex > 0) {
        currentRowIndex--;
        renderSlide();
    }
}

function openFullText(variable, value, title) {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.innerHTML = `
        <div class="editor-window" style="flex-direction:column; align-items:center; text-align:center;">
            <h2 style="margin-top:0">${title}</h2>
            <div style="flex:1; overflow-y:auto; width:100%; font-size:2rem; padding:20px;">${value}</div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="blue-btn" onclick="document.querySelector('.popup-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function deleteView(id) {
    if (confirm("Delete this view permanently?")) {
        views = views.filter(v => v.createdAt != id);
        saveState();
        renderHome();
    }
}

function exportData() {
    // Generate updated Excel
    const worksheet = XLSX.utils.json_to_sheet(currentView.data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "UpdatedData");
    XLSX.writeFile(workbook, `${currentView.name}_Export.xlsx`);
    alert("Exporting current spreadsheet...");
}
