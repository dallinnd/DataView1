// ----------------------- State & Data -----------------------
let views = [];
let currentView = null;
let currentExcelData = []; // Array of objects (rows) from Excel
let currentRowIndex = 0;   // For the "Presentation" mode
let changeLog = [];        // Tracks on-the-spot edits

// ----------------------- Initialization -----------------------
document.addEventListener('DOMContentLoaded', () => {
  loadViews();
  renderHome();
});

// ----------------------- Storage -----------------------
function saveViews() {
  localStorage.setItem('dataView_views', JSON.stringify(views));
}

function loadViews() {
  const saved = localStorage.getItem('dataView_views');
  if (saved) views = JSON.parse(saved);
}

// ----------------------- Navigation -----------------------
function renderHome() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <header><h1>Data View</h1></header>
    <button onclick="createNewView()">Create New View</button>
    <h2>View Existing Displays</h2>
    <div id="view-list"></div>
  `;

  const list = document.getElementById('view-list');
  if (views.length === 0) {
    list.innerHTML = '<p>No displays yet.</p>';
  } else {
    views.sort((a, b) => b.updatedAt - a.updatedAt).forEach(v => {
      const card = document.createElement('div');
      card.className = 'view-card';
      card.innerHTML = `
        <span><strong>${v.name}</strong> (Last edited: ${new Date(v.updatedAt).toLocaleDateString()})</span>
        <button onclick="openMenu('${v.createdAt}')">Open</button>
      `;
      list.appendChild(card);
    });
  }
}

// ----------------------- 2x2 Action Menu -----------------------
function openMenu(viewId) {
  currentView = views.find(v => v.createdAt == viewId);
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="menu-grid">
      <button onclick="exportView()">Export (Top Left)</button>
      <button onclick="startPresentation()">View (Top Right)</button>
      <button onclick="renderEditCanvas()">Edit (Bottom Left)</button>
      <button onclick="deleteView('${viewId}')" style="color:red">Delete (Bottom Right)</button>
    </div>
    <button onclick="renderHome()">Back to Home</button>
  `;
}

// ----------------------- Excel Logic -----------------------
function createNewView() {
  const newView = {
    name: 'Untitled View',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    boxes: [],
    headers: [],
    data: [] // Storing data here for persistence (Note: Consider IndexedDB for large files)
  };
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx, .xls';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const json = XLSX.utils.sheet_to_json(ws);
      
      newView.headers = Object.keys(json[0] || {});
      newView.data = json;
      views.push(newView);
      saveViews();
      currentView = newView;
      renderEditCanvas();
    };
    reader.readAsBinaryString(file);
  };
  input.click();
}

// ----------------------- Canvas (Edit Mode) -----------------------
function renderEditCanvas() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="canvas-header">
      <input type="text" id="viewName" value="${currentView.name}" onchange="currentView.name=this.value">
      <div>
        <button onclick="saveAndGoToMenu()">Save & Next</button>
      </div>
    </div>
    <h3>Your Canvas (16:9)</h3>
    <div id="canvas-container" class="canvas-16-9">
      <div id="grid-bg"></div>
      <div id="box-layer"></div>
    </div>
    <div class="palette">
      <button onclick="prepareBox(2,2)">2x2 Square</button>
      <button onclick="prepareBox(2,1)">2x1 Rect</button>
      <button onclick="prepareBox(4,1)">4x1 Rect</button>
      <button onclick="prepareBox(6,1)">6x1 Rect</button>
      <button onclick="prepareBox(3,3)">3x3 Square</button>
      <button onclick="prepareBox(4,4)">4x4 Square</button>
    </div>
  `;
  renderBoxes();
}

let pendingBox = null;
function prepareBox(w, h) {
  pendingBox = { w, h };
  alert(`Click on the grid to place the ${w}x${h} box`);
}

function renderBoxes() {
  const layer = document.getElementById('box-layer');
  layer.innerHTML = '';
  
  // Create 6x4 Grid Click Targets
  const grid = document.getElementById('grid-bg');
  grid.innerHTML = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.onclick = () => placeBox(c, r);
      grid.appendChild(cell);
    }
  }

  currentView.boxes.forEach((box, index) => {
    const el = document.createElement('div');
    el.className = 'box-instance';
    el.style.gridColumn = `${box.x + 1} / span ${box.w}`;
    el.style.gridRow = `${box.y + 1} / span ${box.h}`;
    el.style.backgroundColor = box.bgColor || '#eee';
    el.style.color = box.textColor || '#000';
    el.innerHTML = `<strong>${box.title}</strong><br>${box.variable || 'No Variable'}`;
    el.onclick = (e) => { e.stopPropagation(); openBoxEditor(index); };
    layer.appendChild(el);
  });
}

function placeBox(x, y) {
  if (!pendingBox) return;
  
  // Collision/Boundary Check
  if (x + pendingBox.w > 6 || y + pendingBox.h > 4) {
    alert("Out of bounds!");
    return;
  }
  
  const overlap = currentView.boxes.some(b => {
    return x < b.x + b.w && x + pendingBox.w > b.x && y < b.y + b.h && y + pendingBox.h > b.y;
  });

  if (overlap) {
    alert("Space occupied!");
    return;
  }

  currentView.boxes.push({
    x, y, w: pendingBox.w, h: pendingBox.h,
    title: 'Title',
    variable: null,
    bgColor: '#ffffff',
    textColor: '#000000',
    fontSize: 16
  });
  
  pendingBox = null;
  renderBoxes();
}

// ----------------------- Box Editor Popup -----------------------
function openBoxEditor(index) {
  const box = currentView.boxes[index];
  const overlay = document.createElement('div');
  overlay.className = 'editor-overlay';
  overlay.innerHTML = `
    <div class="editor-popup">
      <div class="editor-left">
        <h4>Variables</h4>
        ${currentView.headers.map(h => `<button onclick="bindVar(${index}, '${h}')">${h}</button>`).join('')}
      </div>
      <div class="editor-center">
        <input type="text" value="${box.title}" oninput="updateBox(${index}, 'title', this.value)">
        <div class="preview-box" id="preview-${index}" style="background:${box.bgColor}; color:${box.textColor}">
          ${box.variable ? `<${box.variable}>` : 'Select a variable'}
        </div>
      </div>
      <div class="editor-right">
        <h4>Coloring</h4>
        <p>Background</p>
        <input type="color" onchange="updateBox(${index}, 'bgColor', this.value)">
        <p>Text</p>
        <input type="color" onchange="updateBox(${index}, 'textColor', this.value)">
        <p>Size</p>
        <button onclick="updateBox(${index}, 'fontSize', ${box.fontSize + 2})">+</button>
        <button onclick="updateBox(${index}, 'fontSize', ${box.fontSize - 2})">-</button>
      </div>
      <button class="save-box-btn" onclick="closeEditor()">Save Box</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function bindVar(index, header) {
  currentView.boxes[index].variable = header;
  closeEditor();
  renderBoxes();
}

function updateBox(index, prop, val) {
  currentView.boxes[index][prop] = val;
  // Live update if preview element exists
}

function closeEditor() {
  document.querySelector('.editor-overlay').remove();
  saveViews();
  renderBoxes();
}

// ----------------------- Presentation Mode -----------------------
function startPresentation() {
  currentRowIndex = 0;
  renderSlide();
}

function renderSlide() {
  const row = currentView.data[currentRowIndex];
  const app = document.getElementById('app');
  
  if (!row) {
    app.innerHTML = `<h1>End of Presentation</h1><button onclick="renderHome()">Exit to Home</button>`;
    return;
  }

  app.innerHTML = `
    <div class="presentation-slide">
      <div class="canvas-16-9" id="presentation-canvas"></div>
      <div class="nav-controls">
        <button onclick="prevSlide()">Prev</button>
        <button onclick="nextSlide()">Next</button>
      </div>
    </div>
  `;

  const canvas = document.getElementById('presentation-canvas');
  currentView.boxes.forEach(box => {
    const el = document.createElement('div');
    el.className = 'box-instance';
    el.style.gridColumn = `${box.x + 1} / span ${box.w}`;
    el.style.gridRow = `${box.y + 1} / span ${box.h}`;
    el.style.backgroundColor = box.bgColor;
    el.style.color = box.textColor;
    el.style.fontSize = box.fontSize + 'px';
    
    const val = row[box.variable] || '';
    el.innerHTML = `<strong>${box.title}</strong><br>${val}`;
    
    // Full text popup on click
    el.onclick = () => openFullText(box.variable, val, box.title);
    canvas.appendChild(el);
  });
}

function nextSlide() { currentRowIndex++; renderSlide(); }
function prevSlide() { if(currentRowIndex > 0) { currentRowIndex--; renderSlide(); } }

function openFullText(variable, value, title) {
  const overlay = document.createElement('div');
  overlay.className = 'fulltext-overlay';
  overlay.innerHTML = `
    <div class="fulltext-content">
      <span onclick="this.parentElement.parentElement.remove()">X</span>
      <h2>${title}</h2>
      <div class="scroll-area">${value}</div>
      <button onclick="editOnSpot('${variable}')">Edit</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function saveAndGoToMenu() {
  currentView.updatedAt = Date.now();
  saveViews();
  openMenu(currentView.createdAt);
}

function deleteView(id) {
  views = views.filter(v => v.createdAt != id);
  saveViews();
  renderHome();
}
