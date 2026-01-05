let views = [];
let currentView = null;
let pendingBox = null;

// Color Presets
const bgOptions = [
  '#ffffff', '#f1f5f9', '#cbd5e1', 
  'linear-gradient(135deg, #60a5fa, #3b82f6)', 'linear-gradient(135deg, #34d399, #10b981)', 'linear-gradient(135deg, #fb923c, #f97316)',
  '#fee2e2', '#fef3c7', '#dcfce7',
  '#1e293b', '#334155', '#475569'
];
const textOptions = ['#000000', '#ffffff', '#475569', '#ef4444', '#3b82f6', '#10b981'];

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('dataView_storage');
  if (saved) views = JSON.parse(saved);
  renderHome();
});

function save() { localStorage.setItem('dataView_storage', JSON.stringify(views)); }

function renderHome() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <button class="primary-btn" onclick="createNewView()">+ Create New View</button>
    <h2 style="margin-top:40px; text-align:center; color:#475569;">Existing Displays</h2>
    <div id="view-list"></div>
  `;
  const list = document.getElementById('view-list');
  views.forEach(v => {
    const card = document.createElement('div');
    card.style = "background:white; padding:20px; border-radius:16px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 4px 6px rgba(0,0,0,0.02);";
    card.innerHTML = `
      <div><strong style="font-size:1.1rem">${v.name}</strong><br><small style="color:#94a3b8">Modified: ${new Date(v.updatedAt).toLocaleDateString()}</small></div>
      <button class="blue-btn" onclick="openMenu('${v.createdAt}')">Open</button>
    `;
    list.appendChild(card);
  });
}

function createNewView() {
  const nv = { name: 'Untitled Display', createdAt: Date.now(), updatedAt: Date.now(), boxes: [], headers: [], data: [] };
  views.push(nv); currentView = nv; renderEditCanvas();
}

function renderEditCanvas() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="canvas-header">
      <input type="text" value="${currentView.name}" oninput="currentView.name=this.value; save();" style="font-size:1.2rem; font-weight:700; border:none; background:transparent; border-bottom:2px solid #e2e8f0; outline:none;">
      <div style="text-align:center;">
        <button class="orange-btn" onclick="handleExcel()">${currentView.excelName ? 'Change Excel' : 'Upload Excel'}</button>
      </div>
      <div style="text-align:right;">
        <button class="blue-btn" onclick="openMenu('${currentView.createdAt}')">Save & Exit</button>
      </div>
    </div>

    <div class="canvas-16-9" id="canvas-container">
      <div id="grid-overlay" class="grid-overlay"></div>
      <div id="box-layer"></div>
    </div>

    <div style="display:flex; justify-content:center; gap:10px; margin-top:20px;">
      ${['2x2','2x1','4x1','6x1','3x3','4x4'].map(size => {
        const [w,h] = size.split('x').map(Number);
        return `<button class="blue-btn" style="background:#f1f5f9; color:#475569;" onclick="pendingBox={w:${w},h:${h}}">${size}</button>`;
      }).join('')}
    </div>
  `;
  drawGrid(); drawBoxes();
}

function drawGrid() {
  const grid = document.getElementById('grid-overlay');
  for (let i = 0; i < 24; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.onclick = () => {
      if (!pendingBox) return alert("Pick a box size first!");
      const x = i % 6, y = Math.floor(i / 6);
      if (x + pendingBox.w > 6 || y + pendingBox.h > 4) return alert("Too large for this spot!");
      currentView.boxes.push({ x, y, w: pendingBox.w, h: pendingBox.h, title:'Title', variable:null, bgColor:'#ffffff', textColor:'#000', fontSize:18 });
      pendingBox = null; save(); drawBoxes();
    };
    grid.appendChild(cell);
  }
}

function drawBoxes() {
  const layer = document.getElementById('box-layer'); layer.innerHTML = '';
  currentView.boxes.forEach((box, i) => {
    const div = document.createElement('div');
    div.className = 'box-instance';
    div.style.left = `calc(${(box.x / 6) * 100}% + 10px)`;
    div.style.top = `calc(${(box.y / 4) * 100}% + 10px)`;
    div.style.width = `calc(${(box.w / 6) * 100}% - 10px)`;
    div.style.height = `calc(${(box.h / 4) * 100}% - 10px)`;
    div.style.background = box.bgColor; div.style.color = box.textColor;
    div.innerHTML = `<small style="opacity:0.7">${box.title}</small><div style="font-size:${box.fontSize}px; font-weight:bold;">${box.variable || 'No Data'}</div>`;
    div.onclick = (e) => { e.stopPropagation(); openBoxEditor(i); };
    layer.appendChild(div);
  });
}

function openBoxEditor(idx) {
  const box = currentView.boxes[idx];
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  overlay.innerHTML = `
    <div class="editor-window">
      <div style="flex:1; border-right:1px solid #f1f5f9; overflow-y:auto; padding-right:15px;">
        <h4 style="margin-top:0">Import Variables</h4>
        ${currentView.headers.map(h => `<button onclick="bindVar(${idx},'${h}')" style="display:block; width:100%; text-align:left; padding:10px; margin-bottom:5px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">${h}</button>`).join('')}
      </div>
      <div style="flex:2; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f8fafc; border-radius:20px;">
        <input type="text" value="${box.title}" oninput="currentView.boxes[${idx}].title=this.value" style="text-align:center; font-size:1.5rem; font-weight:bold; border:none; background:transparent; margin-bottom:20px; outline:none;">
        <div id="live-prev" style="width:300px; height:200px; border-radius:15px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:${box.bgColor}; color:${box.textColor}; box-shadow:0 10px 20px rgba(0,0,0,0.1);">
          <small>${box.title}</small>
          <div style="font-size:${box.fontSize}px; font-weight:bold;">${box.variable || 'Variable Name'}</div>
        </div>
      </div>
      <div style="flex:1; padding-left:15px;">
        <h4 style="margin-top:0">Coloring</h4>
        <p><small>Background</small></p>
        <div class="color-grid bg-grid">${bgOptions.map(c => `<div class="color-circle" style="background:${c}" onclick="updateBox(${idx},'bgColor','${c}')"></div>`).join('')}</div>
        <p style="margin-top:20px;"><small>Text</small></p>
        <div class="color-grid text-grid">${textOptions.map(c => `<div class="color-circle" style="background:${c}" onclick="updateBox(${idx},'textColor','${c}')"></div>`).join('')}</div>
        <p style="margin-top:20px;"><small>Text Size</small></p>
        <button class="blue-btn" style="padding:5px 15px" onclick="updateBox(${idx},'fontSize',${box.fontSize+2})">+</button>
        <button class="blue-btn" style="padding:5px 15px" onclick="updateBox(${idx},'fontSize',${box.fontSize-2})">-</button>
        <button class="primary-btn" onclick="document.querySelector('.popup-overlay').remove(); drawBoxes();" style="margin-top:40px;">Save Box</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function updateBox(i, prop, val) {
  currentView.boxes[i][prop] = val; save();
  const lp = document.getElementById('live-prev');
  if(prop==='bgColor') lp.style.background = val;
  if(prop==='textColor') lp.style.color = val;
  if(prop==='fontSize') lp.querySelector('div').style.fontSize = val+'px';
}

function bindVar(i, h) { currentView.boxes[i].variable = h; save(); document.querySelector('.popup-overlay').remove(); drawBoxes(); }

function handleExcel() {
  const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx,.xls';
  input.onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, {type:'binary'});
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      currentView.headers = Object.keys(data[0] || {});
      currentView.data = data; currentView.excelName = e.target.files[0].name;
      currentView.updatedAt = Date.now(); save(); renderEditCanvas();
    };
    reader.readAsBinaryString(e.target.files[0]);
  };
  input.click();
}

function openMenu(id) {
  currentView = views.find(v => v.createdAt == id);
  document.getElementById('app').innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:50px;">
      <button class="menu-item" style="height:150px; background:white; font-size:1.2rem; border:1px solid #e2e8f0;" onclick="alert('Exporting...')">Export<br><small>Excel + Change Log</small></button>
      <button class="menu-item" style="height:150px; background:white; font-size:1.2rem; border:1px solid #e2e8f0;" onclick="alert('Starting View...')">View<br><small>Presentation Mode</small></button>
      <button class="menu-item" style="height:150px; background:white; font-size:1.2rem; border:1px solid #e2e8f0;" onclick="renderEditCanvas()">Edit<br><small>Modify Layout</small></button>
      <button class="menu-item" style="height:150px; background:#fef2f2; color:#ef4444; font-size:1.2rem; border:1px solid #fee2e2;" onclick="views=views.filter(v=>v.createdAt!=${id}); save(); renderHome();">Delete<br><small>Permanent</small></button>
    </div>
    <button onclick="renderHome()" style="margin-top:30px; width:100%; background:none; text-decoration:underline; color:#64748b;">Back to Home</button>
  `;
}
