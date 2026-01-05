let views = [];
let currentView = null;
let pendingBox = null;

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('dataView_views');
  if (saved) views = JSON.parse(saved);
  renderHome();
});

function saveAll() {
  localStorage.setItem('dataView_views', JSON.stringify(views));
}

// --- Home Screen ---
function renderHome() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <button class="primary-btn" onclick="createNewView()">Create New View</button>
    <h2 style="margin-top:40px; text-align:center;">View Existing Displays</h2>
    <div id="view-list"></div>
  `;

  const list = document.getElementById('view-list');
  views.sort((a,b) => b.updatedAt - a.updatedAt).forEach(v => {
    const card = document.createElement('div');
    card.style = "background:white; padding:20px; border-radius:12px; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 4px 6px rgba(0,0,0,0.05);";
    card.innerHTML = `
      <div><strong>${v.name}</strong><br><small>Last modified: ${new Date(v.updatedAt).toLocaleDateString()}</small></div>
      <button class="blue-btn" onclick="openMenu('${v.createdAt}')">Open</button>
    `;
    list.appendChild(card);
  });
}

function createNewView() {
  const newView = {
    name: 'New View',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    boxes: [],
    headers: [],
    data: [],
    excelName: null
  };
  views.push(newView);
  currentView = newView;
  renderEditCanvas();
}

// --- Action Menu (2x2) ---
function openMenu(id) {
  currentView = views.find(v => v.createdAt == id);
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="menu-grid">
      <button class="menu-item" onclick="alert('Export Logic Coming Next')">Export<br><small>Top Left</small></button>
      <button class="menu-item" onclick="alert('Presentation Logic Coming Next')">View<br><small>Top Right</small></button>
      <button class="menu-item" onclick="renderEditCanvas()">Edit<br><small>Bottom Left</small></button>
      <button class="menu-item" onclick="deleteView('${id}')" style="color:red;">Delete<br><small>Bottom Right</small></button>
    </div>
    <button onclick="renderHome()" style="margin-top:20px; background:none; border:none; text-decoration:underline; cursor:pointer; width:100%;">Back to Home</button>
  `;
}

// --- Canvas Edit View ---
function renderEditCanvas() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="canvas-header">
      <input type="text" value="${currentView.name}" oninput="currentView.name=this.value; saveAll();" style="font-size:1.2rem; font-weight:bold; border:none; border-bottom:2px solid #3b82f6; background:transparent;">
      
      <div style="text-align:center;">
        <button class="orange-btn" onclick="uploadExcel()">${currentView.excelName ? 'Change Excel' : 'Upload Excel'}</button>
      </div>

      <div style="text-align:right;">
        <button class="blue-btn" onclick="openMenu('${currentView.createdAt}')">Save & Next</button>
      </div>
    </div>

    <div class="canvas-16-9" id="canvas-container">
      <div id="grid-overlay" class="grid-overlay"></div>
      <div id="box-layer"></div>
    </div>

    <div class="palette-bar">
      <button onclick="selectSize(2,2)">2x2 Sq</button>
      <button onclick="selectSize(2,1)">2x1 Rect</button>
      <button onclick="selectSize(4,1)">4x1 Rect</button>
      <button onclick="selectSize(6,1)">6x1 Rect</button>
      <button onclick="selectSize(3,3)">3x3 Sq</button>
      <button onclick="selectSize(4,4)">4x4 Sq</button>
    </div>
  `;
  drawGrid();
  drawBoxes();
}

function uploadExcel() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx, .xls';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, {type:'binary'});
      const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      currentView.headers = Object.keys(json[0] || {});
      currentView.data = json;
      currentView.excelName = file.name;
      currentView.updatedAt = Date.now();
      saveAll();
      renderEditCanvas();
    };
    reader.readAsBinaryString(file);
  };
  input.click();
}

function drawGrid() {
  const grid = document.getElementById('grid-overlay');
  grid.innerHTML = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.onclick = () => placeBox(c, r);
      grid.appendChild(cell);
    }
  }
}

function selectSize(w, h) {
  pendingBox = { w, h };
  alert(`Click a grid cell to place the ${w}x${h} box.`);
}

function placeBox(x, y) {
  if (!pendingBox) return;
  if (x + pendingBox.w > 6 || y + pendingBox.h > 4) {
    alert("Out of bounds!");
    return;
  }
  
  // Simple collision check
  const overlap = currentView.boxes.some(b => 
    x < b.x + b.w && x + pendingBox.w > b.x && y < b.y + b.h && y + pendingBox.h > b.y
  );
  if (overlap) { alert("Space occupied!"); return; }

  currentView.boxes.push({
    x, y, w: pendingBox.w, h: pendingBox.h,
    title: 'Title',
    variable: null,
    bgColor: '#cce5ff',
    textColor: '#000000',
    fontSize: 16
  });
  pendingBox = null;
  saveAll();
  drawBoxes();
}

function drawBoxes() {
  const layer = document.getElementById('box-layer');
  layer.innerHTML = '';
  const container = document.getElementById('canvas-container');
  const cw = container.clientWidth - 20; // accounting for 10px padding on each side
  const ch = container.clientHeight - 20;
  
  currentView.boxes.forEach((box, i) => {
    const div = document.createElement('div');
    div.className = 'box-instance';
    
    // Position calculation (Grid size is 6x4)
    div.style.left = `calc(${(box.x / 6) * 100}% + 10px)`;
    div.style.top = `calc(${(box.y / 4) * 100}% + 10px)`;
    div.style.width = `calc(${(box.w / 6) * 100}% - 10px)`;
    div.style.height = `calc(${(box.h / 4) * 100}% - 10px)`;
    
    div.style.backgroundColor = box.bgColor;
    div.style.color = box.textColor;
    div.innerHTML = `<strong>${box.title}</strong><br>${box.variable || 'No Var'}`;
    div.onclick = (e) => { e.stopPropagation(); alert('Editor logic comes after CSS confirm'); };
    layer.appendChild(div);
  });
}

function deleteView(id) {
  if(confirm("Delete this view?")) {
    views = views.filter(v => v.createdAt != id);
    saveAll();
    renderHome();
  }
}
