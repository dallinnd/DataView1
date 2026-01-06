/**
 * DATA VIEW PRO - MERGED ENGINE
 * Restoring v16.0 Logic into Modern Theme
 */

let views = [];
let currentView = null;
let pendingBox = null;
let currentRowIndex = 0;
let changeLog = [];

// Icons for the floating nav
const iconHome = `<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="white"/></svg>`;
const iconLeft = `<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="white"/></svg>`;
const iconRight = `<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="white"/></svg>`;

const bgPresets = ['#ffffff','#f1f5f9','#cbd5e1','linear-gradient(135deg,#667eea 0%, #764ba2 100%)','linear-gradient(135deg,#00b09b 0%, #96c93d 100%)','linear-gradient(135deg,#f093fb 0%, #f5576c 100%)','#fee2e2','#fef3c7','#dcfce7','#0f172a'];

// --- INITIALIZATION ---
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

// --- MODERN HOME MENU ---
function renderHome() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="home-container">
            <h1 style="font-weight:900; letter-spacing:-1px; margin-bottom:40px;">DataView <span style="color:var(--slate); font-weight:300;">Pro</span></h1>
            <button class="primary-btn" onclick="createNewView()">+ Create New View</button>
            <div id="view-list" style="margin-top:30px;"></div>
        </div>`;
    
    views.sort((a,b) => b.updatedAt - a.updatedAt).forEach(v => {
        const div = document.createElement('div');
        div.className = "view-card";
        div.innerHTML = `
            <div>
                <div style="font-size:0.7rem; color:var(--slate); text-transform:uppercase; letter-spacing:1px;">Project</div>
                <strong style="font-size:1.1rem;">${v.name}</strong>
            </div>
            <button class="blue-btn" onclick="openMenu('${v.createdAt}')">Open</button>`;
        document.getElementById('view-list').appendChild(div);
    });
}

function openMenu(id) {
    currentView = views.find(v => v.createdAt == id);
    document.getElementById('app').innerHTML = `
        <div class="home-container">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <button class="orange-btn" style="height:120px;" onclick="renderEditCanvas()">Edit Layout</button>
                <button class="blue-btn" style="height:120px;" onclick="window.open(window.location.origin+window.location.pathname+'?view='+currentView.createdAt,'_blank')">Launch View</button>
                <button class="size-btn" style="height:100px; color:white;" onclick="exportData()">Export XLSX</button>
                <button class="danger-btn" style="height:100px;" onclick="deleteView('${id}')">Delete</button>
            </div>
            <button onclick="renderHome()" style="margin-top:30px; color:var(--slate); background:none; text-transform:none; border:none; cursor:pointer;">← Back to Home</button>
        </div>`;
}

// --- MODERN EDITOR ---
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
                    <h4>Data Source</h4>
                    <button class="orange-btn" style="width:100%" onclick="uploadExcel()">Update Excel</button>
                </div>
                <div class="property-group">
                    <h4>Add Element</h4>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px;">
                        ${['2x2','2x1','4x1','6x1','3x3','4x4'].map(s => `<button class="size-btn" onclick="selectSize(${s.split('x')[0]},${s.split('x')[1]})">${s}</button>`).join('')}
                    </div>
                    <p style="font-size:0.7rem; color:var(--slate); margin-top:10px;">Select a size, then click on the grid.</p>
                </div>
                <button class="blue-btn" style="width:100%; margin-top:auto;" onclick="openMenu('${currentView.createdAt}')">Finish & Save</button>
            </aside>
            <main class="canvas-area">
                <div class="canvas-16-9" id="canvas-container">
                    <div class="grid-overlay" style="display:grid; grid-template-columns:repeat(6,1fr); grid-template-rows:repeat(4,1fr); position:absolute; inset:0;" id="grid"></div>
                    <div id="boxes-layer"></div>
                </div>
            </main>
        </div>`;
    drawGrid(); drawBoxes();
}

// ... Logic for drawGrid, drawBoxes, openEditor remains similar to v16 but using the modern .popup-overlay and .box-instance classes ...

function editLiveValue(boxIdx) {
    const box = currentView.boxes[boxIdx];
    const oldVal = currentView.data[currentRowIndex][box.textVal];
    const newVal = prompt(`Enter new value for ${box.textVal}:`, oldVal);
    
    if (newVal !== null && newVal !== oldVal) {
        // Feature Restored: Change Log Tracking
        changeLog.push({ 
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
