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

  // Create New View button
  const createBtn = document.createElement('button');
  createBtn.textContent = 'Create New View';
  createBtn.onclick = () => {
    const newView = {
      name: 'New View',
      boxes: [],
      excelBase64: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    renderCanvas(newView);
  };
  container.appendChild(createBtn);

  // Existing Views section
  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = 'View Existing Displays';
  container.appendChild(sectionTitle);

  if (views.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No displays yet. Create one to get started.';
    empty.style.color = '#666';
    container.appendChild(empty);
  } else {
    views.forEach(view => {
      const card = document.createElement('div');
      card.className = 'view-card';

      const left = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = view.name;
      left.appendChild(name);

      const right = document.createElement('div');
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.onclick = () => renderCanvas(view);
      right.appendChild(editBtn);

      card.appendChild(left);
      card.appendChild(right);
      container.appendChild(card);
    });
  }
}

// ----------------------- Canvas Screen -----------------------
function renderCanvas(view) {
  const container = document.getElementById('app');
  container.innerHTML = '';

  // ---------------- Canvas Header ----------------
  const header = document.createElement('div');
  header.className = 'canvas-header';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.marginBottom = '10px';

  const nameInput = document.createElement('input');
  nameInput.value = view.name;
  nameInput.style.fontSize = '20px';
  nameInput.style.width = '40%';
  nameInput.style.marginRight = '10px';

  // Excel Upload Button (orange)
  const excelBtn = document.createElement('button');
  excelBtn.textContent = view.excelBase64 ? 'Change Excel' : 'Upload Excel';
  excelBtn.style.background = '#f97316';
  excelBtn.style.marginRight = '10px';
  excelBtn.style.color = 'white';
  excelBtn.onclick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx,.xls';
    fileInput.style.display = 'none';
    fileInput.onchange = () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        view.excelBase64 = e.target.result;
        view.updatedAt = Date.now();
        saveViewsToLocal();
        excelBtn.textContent = 'Change Excel';
        alert('Excel uploaded successfully!');
      };
      reader.readAsDataURL(file);
    };
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  };

  // Save & Back button
  const backBtn = document.createElement('button');
  backBtn.textContent = 'Save & Back';
  backBtn.onclick = () => {
    view.name = nameInput.value;
    view.updatedAt = Date.now();

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

  // ---------------- Canvas Grid ----------------
  const canvas = document.createElement('div');
  canvas.className = 'canvas';
  canvas.style.width = '100%';
  canvas.style.aspectRatio = '6 / 4'; // width : height = 6:4
  canvas.style.position = 'relative';
  canvas.style.display = 'grid';
  canvas.style.gridTemplateColumns = 'repeat(6, 1fr)';
  canvas.style.gridTemplateRows = 'repeat(4, 1fr)';
  canvas.style.gap = '10px';
  canvas.style.padding = '0';
  canvas.style.margin = '0';
  canvas.style.background = '#f0f0f0';
  canvas.style.border = '1px solid #ccc';
  container.appendChild(canvas);

  const gap = 10;
  const gridCols = 6;
  const gridRows = 4;

  const gridOccupied = Array(gridRows).fill(null).map(() => Array(gridCols).fill(false));

  // Semi-transparent placeholder cells
  for (let i = 0; i < gridCols * gridRows; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.style.background = 'rgba(0,0,0,0.05)';
    canvas.appendChild(cell);
  }

  // ---------------- Box Palette ----------------
  const palette = document.createElement('div');
  palette.className = 'palette';
  palette.style.marginTop = '10px';

  const boxTypes = [
    { label: '2×2', w: 2, h: 2 },
    { label: '2×1', w: 2, h: 1 },
    { label: '4×1', w: 4, h: 1 },
    { label: '6×1', w: 6, h: 1 },
    { label: '3×3', w: 3, h: 3 },
    { label: '4×4', w: 4, h: 4 },
  ];

  let selectedBox = null;
  boxTypes.forEach(box => {
    const btn = document.createElement('button');
    btn.textContent = box.label;
    btn.onclick = () => selectedBox = box;
    palette.appendChild(btn);
  });
  container.appendChild(palette);

  // ---------------- Cell size for absolute positioning ----------------
  const cellWidth = (canvas.clientWidth - gap * (gridCols - 1)) / gridCols;
  const cellHeight = (canvas.clientHeight - gap * (gridRows - 1)) / gridRows;

  // ---------------- Load existing boxes ----------------
  if (view.boxes) {
    view.boxes.forEach(box => addBoxToCanvas(box, canvas, gridOccupied, cellWidth, cellHeight, view));
  }

  // ---------------- Click to place new boxes ----------------
  canvas.addEventListener('click', (e) => {
    if (!selectedBox) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / (cellWidth + gap));
    const row = Math.floor(y / (cellHeight + gap));

    if (col + selectedBox.w > gridCols || row + selectedBox.h > gridRows) {
      alert('Box too big for this position!');
      return;
    }

    for (let r = row; r < row + selectedBox.h; r++) {
      for (let c = col; c < col + selectedBox.w; c++) {
        if (gridOccupied[r][c]) {
          alert('Space already occupied!');
          return;
        }
      }
    }

    const boxData = { ...selectedBox, col, row, title: 'Title', text: 'Box Variable' };
    if (!view.boxes) view.boxes = [];
    view.boxes.push(boxData);

    addBoxToCanvas(boxData, canvas, gridOccupied, cellWidth, cellHeight, view);

    selectedBox = null;
    saveViewsToLocal();
  });
}

// ----------------------- Add box helper -----------------------
function addBoxToCanvas(boxData, canvas, gridOccupied, cellWidth, cellHeight, view) {
  const boxDiv = document.createElement('div');
  boxDiv.className = 'box';
  boxDiv.textContent = boxData.text;
  boxDiv.dataset.title = boxData.title;
  boxDiv.dataset.text = boxData.text;
  boxDiv.dataset.col = boxData.col;
  boxDiv.dataset.row = boxData.row;
  boxDiv.dataset.w = boxData.w;
  boxDiv.dataset.h = boxData.h;
  boxDiv.style.position = 'absolute';
  boxDiv.style.width = `${cellWidth * boxData.w + (boxData.w - 1) * 10}px`;
  boxDiv.style.height = `${cellHeight * boxData.h + (boxData.h - 1) * 10}px`;
  boxDiv.style.left = `${boxData.col * (cellWidth + 10)}px`;
  boxDiv.style.top = `${boxData.row * (cellHeight + 10)}px`;
  boxDiv.style.background = 'rgba(0,0,255,0.2)';
  boxDiv.style.border = '1px solid blue';
  boxDiv.style.display = 'flex';
  boxDiv.style.flexDirection = 'column';
  boxDiv.style.justifyContent = 'center';
  boxDiv.style.alignItems = 'center';
  boxDiv.style.cursor = 'pointer';

  // Mark occupied
  for (let r = boxData.row; r < boxData.row + boxData.h; r++) {
    for (let c = boxData.col; c < boxData.col + boxData.w; c++) {
      gridOccupied[r][c] = true;
    }
  }

  canvas.appendChild(boxDiv);

  // Click popup
  boxDiv.addEventListener('click', (e) => {
    e.stopPropagation();
    openBoxPopup(boxDiv, view, gridOccupied, canvas);
  });
}

// ----------------------- Box popup -----------------------
function openBoxPopup(boxDiv, view, gridOccupied, canvas) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'rgba(0,0,0,0.3)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = 1000;

  const popup = document.createElement('div');
  popup.className = 'box-popup';
  popup.style.background = 'white';
  popup.style.padding = '20px';
  popup.style.borderRadius = '12px';
  popup.style.width = '400px';
  popup.style.display = 'flex';
  popup.style.flexDirection = 'column';
  popup.style.alignItems = 'stretch';

  // ---------------- Buttons Row ----------------
  const buttonsRow = document.createElement('div');
  buttonsRow.style.display = 'flex';
  buttonsRow.style.justifyContent = 'space-between';
  buttonsRow.style.marginBottom = '15px';

  const trashBtn = document.createElement('button');
  trashBtn.textContent = '🗑';
  trashBtn.style.background = 'red';
  trashBtn.style.color = 'white';
  trashBtn.onclick = () => {
    // Remove box
    canvas.removeChild(boxDiv);

    // Free occupied
    for (let r = boxDiv.dataset.row; r < Number(boxDiv.dataset.row)+Number(boxDiv.dataset.h); r++) {
      for (let c = boxDiv.dataset.col; c < Number(boxDiv.dataset.col)+Number(boxDiv.dataset.w); c++) {
        gridOccupied[r][c]=false;
      }
    }

    // Remove from view.boxes
    const idx = view.boxes.findIndex(b => b.col==boxDiv.dataset.col && b.row==boxDiv.dataset.row);
    if(idx!==-1) view.boxes.splice(idx,1);
    saveViewsToLocal();
    document.body.removeChild(overlay);
  };

  const editBtn = document.createElement('button');
  editBtn.textContent = '✏️ Edit';
  editBtn.style.background = 'green';
  editBtn.style.color = 'white';
  editBtn.onclick = () => {
    openBoxEditPreview(boxDiv, view);
    document.body.removeChild(overlay);
  };

  const backBtn = document.createElement('button');
  backBtn.textContent = '↩ Back';
  backBtn.style.background = 'blue';
  backBtn.style.color = 'white';
  backBtn.onclick = () => document.body.removeChild(overlay);

  buttonsRow.appendChild(trashBtn);
  buttonsRow.appendChild(editBtn);
  buttonsRow.appendChild(backBtn);
  popup.appendChild(buttonsRow);

  // ---------------- Box Info Preview ----------------
  const infoDiv = document.createElement('div');
  infoDiv.style.display = 'flex';
  infoDiv.style.flexDirection = 'column';
  infoDiv.style.alignItems = 'stretch';
  infoDiv.style.gap = '10px';

  // Title input
  const titleInput = document.createElement('input');
  titleInput.value = boxDiv.dataset.title || 'Title';
  titleInput.placeholder = 'Title';
  infoDiv.appendChild(titleInput);

  // Main text input
  const textInput = document.createElement('input');
  textInput.value = boxDiv.dataset.text || 'Box Variable';
  textInput.placeholder = 'Main Text / Variable';
  infoDiv.appendChild(textInput);

  // Color pickers
  const bgColorInput = document.createElement('input');
  bgColorInput.type = 'color';
  bgColorInput.value = boxDiv.style.background || '#aaddff';
  const textColorInput = document.createElement('input');
  textColorInput.type = 'color';
  textColorInput.value = boxDiv.style.color || '#000000';

  const bgLabel = document.createElement('label');
  bgLabel.textContent = 'Background: ';
  bgLabel.appendChild(bgColorInput);

  const textLabel = document.createElement('label');
  textLabel.textContent = 'Text: ';
  textLabel.appendChild(textColorInput);

  infoDiv.appendChild(bgLabel);
  infoDiv.appendChild(textLabel);

  // Font size input
  const fontSizeInput = document.createElement('input');
  fontSizeInput.type = 'number';
  fontSizeInput.min = 8;
  fontSizeInput.max = 100;
  fontSizeInput.value = parseInt(boxDiv.style.fontSize) || 16;
  const fontLabel = document.createElement('label');
  fontLabel.textContent = 'Font Size: ';
  fontLabel.appendChild(fontSizeInput);
  infoDiv.appendChild(fontLabel);

  popup.appendChild(infoDiv);

  // ---------------- Save Button ----------------
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save Box';
  saveBtn.style.background = 'green';
  saveBtn.style.color = 'white';
  saveBtn.style.marginTop = '15px';
  saveBtn.onclick = () => {
    // Update boxDiv and data
    boxDiv.dataset.title = titleInput.value;
    boxDiv.dataset.text = textInput.value;
    boxDiv.style.background = bgColorInput.value;
    boxDiv.style.color = textColorInput.value;
    boxDiv.style.fontSize = fontSizeInput.value + 'px';
    boxDiv.textContent = textInput.value;

    const boxData = view.boxes.find(b => b.col==boxDiv.dataset.col && b.row==boxDiv.dataset.row);
    if(boxData){
      boxData.title = titleInput.value;
      boxData.text = textInput.value;
      boxData.bgColor = bgColorInput.value;
      boxData.textColor = textColorInput.value;
      boxData.fontSize = fontSizeInput.value;
    }

    saveViewsToLocal();
    document.body.removeChild(overlay);
  };

  popup.appendChild(saveBtn);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}
