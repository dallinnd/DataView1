// ----------------------- State -----------------------
const views = [];

// ----------------------- LocalStorage -----------------------
function saveViewsToLocal() {
  localStorage.setItem('dataView_views', JSON.stringify(views));
}

function loadViewsFromLocal() {
  const saved = localStorage.getItem('dataView_views');
  if (saved) {
    const parsed = JSON.parse(saved);
    views.length = 0;
    parsed.forEach(v => views.push(v));
  }
}

// ----------------------- Home Screen -----------------------
function renderHome() {
  const container = document.getElementById('app');
  container.innerHTML = '';

  const createBtn = document.createElement('button');
  createBtn.textContent = 'Create New View';
  createBtn.onclick = () => {
    const newView = {
      name: 'New View',
      boxes: [],
      excelBase64: null,
      importedColumns: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    renderCanvas(newView);
  };
  container.appendChild(createBtn);

  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = 'View Existing Displays';
  container.appendChild(sectionTitle);

  if (views.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No displays yet. Create one to get started.';
    container.appendChild(empty);
  } else {
    views.forEach(view => {
      const card = document.createElement('div');
      card.className = 'view-card';
      const name = document.createElement('strong');
      name.textContent = view.name;
      card.appendChild(name);

      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.onclick = () => renderCanvas(view);
      card.appendChild(editBtn);

      container.appendChild(card);
    });
  }
}

// ----------------------- Canvas Screen -----------------------
function renderCanvas(view) {
  const container = document.getElementById('app');
  container.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.marginBottom = '10px';

  const nameInput = document.createElement('input');
  nameInput.value = view.name;
  nameInput.style.fontSize = '20px';
  nameInput.style.width = '40%';
  nameInput.style.marginRight = '10px';

  const excelBtn = document.createElement('button');
  excelBtn.textContent = view.excelBase64 ? 'Change Excel' : 'Upload Excel';
  excelBtn.style.background = '#f97316';
  excelBtn.style.color = 'white';
  excelBtn.onclick = () => uploadExcel(view, excelBtn);

  const backBtn = document.createElement('button');
  backBtn.textContent = 'Save & Back';
  backBtn.onclick = () => {
    view.name = nameInput.value;
    const existingIndex = views.findIndex(v => v.createdAt === view.createdAt);
    if (existingIndex === -1) views.push(view);
    else views[existingIndex] = view;
    saveViewsToLocal();
    renderHome();
  };

  header.appendChild(nameInput);
  header.appendChild(excelBtn);
  header.appendChild(backBtn);
  container.appendChild(header);

  // Canvas
  const canvas = document.createElement('div');
  canvas.className = 'canvas';
  canvas.style.position = 'relative';
  container.appendChild(canvas);

  const gridCols = 6;
  const gridRows = 4;
  const gridOccupied = Array(gridRows).fill(null).map(() => Array(gridCols).fill(false));

  // Box types
  const boxTypes = [
    { label: '2×2', w: 2, h: 2 },
    { label: '2×1', w: 2, h: 1 },
    { label: '4×1', w: 4, h: 1 },
    { label: '6×1', w: 6, h: 1 },
    { label: '3×3', w: 3, h: 3 },
    { label: '4×4', w: 4, h: 4 }
  ];

  let selectedBox = null;

  const palette = document.createElement('div');
  palette.style.marginTop = '10px';
  boxTypes.forEach(b => {
    const btn = document.createElement('button');
    btn.textContent = b.label;
    btn.onclick = () => selectedBox = b;
    palette.appendChild(btn);
  });
  container.appendChild(palette);

  // Canvas click to add box
  canvas.addEventListener('click', (e) => {
    if (!selectedBox) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / (rect.width / gridCols));
    const row = Math.floor(y / (rect.height / gridRows));

    if (col + selectedBox.w > gridCols || row + selectedBox.h > gridRows) {
      alert('Box too big!');
      return;
    }

    for (let r = row; r < row + selectedBox.h; r++)
      for (let c = col; c < col + selectedBox.w; c++)
        if (gridOccupied[r][c]) {
          alert('Space occupied!');
          return;
        }

    // Mark occupied
    for (let r = row; r < row + selectedBox.h; r++)
      for (let c = col; c < col + selectedBox.w; c++)
        gridOccupied[r][c] = true;

    const boxData = {
      ...selectedBox,
      col, row,
      title: 'Title',
      text: 'Box Variable',
      bgColor: '#cce5ff',
      textColor: '#000',
      fontSize: 16,
      variable: null
    };

    view.boxes.push(boxData);
    addBoxToCanvas(boxData, canvas, gridOccupied, view);
    selectedBox = null;
    saveViewsToLocal();
  });

  // Load existing boxes
  if (view.boxes) view.boxes.forEach(box => addBoxToCanvas(box, canvas, gridOccupied, view));
}

// ---------- Excel Upload ----------
function uploadExcel(view, button) {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.xlsx,.xls';
  fileInput.style.display = 'none';
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      view.importedColumns = json[0] || [];
      view.excelBase64 = e.target.result;
      saveViewsToLocal();
      button.textContent = 'Change Excel';
      alert('Excel uploaded! Columns: ' + view.importedColumns.join(', '));
    };
    reader.readAsArrayBuffer(file);
  };
  document.body.appendChild(fileInput);
  fileInput.click();
  document.body.removeChild(fileInput);
}

// ---------- Add box helper ----------
function addBoxToCanvas(boxData, canvas, gridOccupied, view) {
  const boxDiv = document.createElement('div');
  boxDiv.className = 'box';
  boxDiv.style.left = (boxData.col * 100 / 6) + '%';
  boxDiv.style.top = (boxData.row * 100 / 4) + '%';
  boxDiv.style.width = (boxData.w * 100 / 6) + '%';
  boxDiv.style.height = (boxData.h * 100 / 4) + '%';
  boxDiv.style.background = boxData.bgColor;
  boxDiv.style.color = boxData.textColor;
  boxDiv.style.fontSize = boxData.fontSize + 'px';
  boxDiv.innerHTML = `<div class="box-title">${boxData.title}</div><div class="box-text">${boxData.text}</div>`;
  canvas.appendChild(boxDiv);
}
