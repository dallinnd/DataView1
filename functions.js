// ----------------------- State & Data -----------------------
let views = [];
let currentView = null;
let currentRowIndex = 0;   
let pendingBox = null;

// ----------------------- Initialization -----------------------
document.addEventListener('DOMContentLoaded', () => {
  loadViews();
  renderHome();
});

function saveViews() {
  localStorage.setItem('dataView_views', JSON.stringify(views));
}

function loadViews() {
  const saved = localStorage.getItem('dataView_views');
  if (saved) views = JSON.parse(saved);
}

// ----------------------- Home Screen -----------------------
function renderHome() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <header class="app-header"><h1>Data View</h1></header>
    <main id="app-content">
      <button class="primary-btn" onclick="createNewView()">+ Create New View</button>
      <h2 style="margin-top:20px;">View Existing Displays</h2>
      <div id="view-list"></div>
    </main>
  `;

  const list = document.getElementById('view-list');
  if (views.length === 0) {
    list.innerHTML = '<p style="color:#666;">No displays yet. Create one to get started.</p>';
  } else {
    views.sort((a, b) => b.updatedAt - a.updatedAt).forEach(v => {
      const card = document.createElement('div');
      card.className = 'view-card';
      card.innerHTML = `
        <div>
          <strong>${v.name}</strong><br>
          <small>Modified: ${new Date(v.updatedAt).toLocaleDateString()}</small>
        </div>
        <button onclick="openMenu('${v.createdAt}')">Open</button>
      `;
      list.appendChild(card);
    });
  }
}

function createNewView() {
  const newView = {
    name: 'New View ' + (views.length + 1),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    boxes: [],
    headers: [],
    data: [],
    excelName: null
  };
  views.push(newView);
  saveViews();
  currentView = newView;
  renderEditCanvas();
}

// ----------------------- Action Menu (2x2 Grid) -----------------------
function openMenu(viewId) {
  currentView = views.find(v => v.createdAt == viewId);
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="menu-container">
      <div class="menu-grid">
        <button class="menu-item" onclick="exportView()">Export<br><small>(Top Left)</small></button>
        <button class="menu-item" onclick="startPresentation()">View<br><small>(Top Right)</small></button>
        <button class="menu-item" onclick="renderEditCanvas()">Edit<br><small>(Bottom Left)</small></button>
        <button class="menu-item delete" onclick="deleteView('${viewId}')">Delete<br><small>(Bottom Right)</small></button>
      </div>
      <button class="back-btn" onclick="renderHome()">Back to Home</button>
    </div>
  `;
}

// ----------------------- Canvas (Edit Mode) -----------------------
function renderEditCanvas() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="canvas-header">
      <button onclick="openMenu('${currentView.createdAt}')">Save & Next</button>
      <input type="text" id="viewNameInput" value="${currentView.name}" oninput="updateViewName(this.value)">
      <button id="excelBtn" class="orange-btn" onclick="triggerExcelUpload()">
        ${currentView.excelName ? 'Change Excel' : 'Upload Excel'}
      </button>
    </div>
    
    <div class="canvas-main">
      <h3 style="text-align:center;">Your Canvas</h3>
      <div id="canvas-container" class="canvas-16-9">
        <div id="grid-bg" class="grid-overlay"></div>
        <div id="box-layer"></div>
      </div>
    </div>

    <div class="palette-bar">
      <button onclick="setPendingBox(2,2)">2x2 Square</button>
      <button onclick="setPendingBox(2,1)">2x1 Rect</button>
      <button onclick="setPendingBox(4,1)">4x1 Rect</button>
      <button onclick="setPendingBox(6,1)">6x1 Rect</button>
      <button onclick="setPendingBox(3,3)">3x3 Square</button>
      <button onclick="setPendingBox(4,4)">4x4 Square</button>
    </div>
  `;
  renderGrid();
  renderBoxes();
}

function updateViewName(val) {
  currentView.name = val;
  saveViews();
}

function triggerExcelUpload() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx, .xls';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws);
      
      currentView.headers = Object.keys(json[0] || {});
      currentView.data = json;
      currentView.excelName = file.name;
      currentView.updatedAt = Date.now();
      saveViews();
      document.getElementById('excelBtn').innerText = 'Change Excel';
      alert('Excel Uploaded: ' + file.name);
    };
    reader.readAsBinaryString(file);
  };
  input.click();
}

function renderGrid() {
  const grid = document.getElementById('grid-bg');
  grid.innerHTML = '';
  // 6 columns x 4 rows
  for (let i = 0; i < 24; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    const r = Math.floor(i / 6);
    const c = i % 6;
    cell.onclick = () => placeBox(c, r);
    grid.appendChild(cell);
  }
}

function setPendingBox(w, h) {
  pendingBox = { w, h };
  // Add a visual indicator or class to the cursor here later
}

function placeBox(x, y) {
  if (!pendingBox) {
    alert("Select a box size from the bottom first!");
    return;
  }
  
  if (x + pendingBox.w > 6 || y + pendingBox.h > 4) {
    alert("Box extends beyond grid boundaries!");
    return;
  }
  
  const hasOverlap = currentView.boxes.some(b => {
    return x < b.x + b.w && x + pendingBox.w > b.x && 
           y < b.y + b.h && y + pendingBox.h > b.y;
  });

  if (hasOverlap) {
    alert("Space is already occupied!");
    return;
  }

  currentView.boxes.push({
    x, y, w: pendingBox.w, h: pendingBox.h,
    title: 'New Title',
    variable: null,
    bgColor: '#cce5ff',
    textColor: '#000000',
    fontSize: 16
  });
  
  pendingBox = null;
  saveViews();
  renderBoxes();
}

function renderBoxes() {
  const layer = document.getElementById('box-layer');
  layer.innerHTML = '';
  
  currentView.boxes.forEach((box, index) => {
    const el = document.createElement('div');
    el.className = 'box-instance';
    // Logic: Use grid-area or percentage for placement
    el.style.left = `${(box.x / 6) * 100}%`;
    el.style.top = `${(box.y / 4) * 100}%`;
    el.style.width = `${(box.w / 6) * 100}%`;
    el.style.height = `${(box.h / 4) * 100}%`;
    
    el.style.backgroundColor = box.bgColor;
    el.style.color = box.textColor;
    el.style.fontSize = box.fontSize + 'px';
    
    el.innerHTML = `<div class="box-content"><strong>${box.title}</strong><br>${box.variable || 'No Variable'}</div>`;
    el.onclick = (e) => { e.stopPropagation(); openBoxEditor(index); };
    layer.appendChild(el);
  });
}

// ----------------------- Box Editor Popup -----------------------
function openBoxEditor(index) {
  const box = currentView.boxes[index];
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  overlay.innerHTML = `
    <div class="box-editor-window">
      <div class="editor-left">
        <h4>Variables</h4>
        <div class="var-list">
          ${currentView.headers.length ? 
            currentView.headers.map(h => `<button class="var-pill" onclick="bindVar(${index}, '${h}')">${h}</button>`).join('') :
            '<p>Upload Excel to see variables</p>'}
        </div>
      </div>
      <div class="editor-center">
         <input type="text" class="title-edit" value="${box.title}" id="edit-title-${index}" oninput="updateBoxData(${index}, 'title', this.value)">
         <div class="preview-box-large" style="background:${box.bgColor}; color:${box.textColor};">
            ${box.variable ? box.variable : 'Variable Content'}
         </div>
      </div>
      <div class="editor-right">
        <h4>Coloring</h4>
        <label>Background</label>
        <input type="color" value="${box.bgColor}" onchange="updateBoxData(${index}, 'bgColor', this.value)">
        <label>Text Color</label>
        <input type="color" value="${box.textColor}" onchange="updateBoxData(${index}, 'textColor', this.value)">
        <label>Text Size</label>
        <div class="size-controls">
           <button onclick="updateFontSize(${index}, 2)">+</button>
           <button onclick="updateFontSize(${index}, -2)">-</button>
        </div>
      </div>
      <button class="save-box-final" onclick="closeEditor()">Save Box</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function updateBoxData(index, prop, val) {
  currentView.boxes[index][prop] = val;
}

function updateFontSize(index, delta) {
  currentView.boxes[index].fontSize += delta;
}

function bindVar(index, header) {
  currentView.boxes[index].variable = header;
  closeEditor();
}

function closeEditor() {
  document.querySelector('.popup-overlay').remove();
  saveViews();
  renderBoxes();
}

function deleteView(id) {
  if(confirm("Are you sure?")) {
    views = views.filter(v => v.createdAt != id);
    saveViews();
    renderHome();
  }
}
