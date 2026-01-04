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

  const nameInput = document.createElement('input');
  nameInput.value = view.name;
  nameInput.style.fontSize = '20px';
  nameInput.style.width = '40%';

  // Excel Upload Button (orange)
  const excelBtn = document.createElement('button');
  excelBtn.textContent = view.excelBase64 ? 'Change Excel' : 'Upload Excel';
  excelBtn.style.background = '#f97316'; // orange
  excelBtn.style.marginRight = '10px';
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

      // ✅ Update the button text immediately
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

    // Save or update view in views array
    const existingIndex = views.findIndex(v => v.createdAt === view.createdAt);
    if (existingIndex === -1) {
      views.push(view);
    } else {
      views[existingIndex] = view;
    }

    saveViewsToLocal();
    renderHome();
  };

  // Append header elements
  header.appendChild(nameInput);
  header.appendChild(excelBtn);
  header.appendChild(backBtn);
  container.appendChild(header);

  // ---------------- Canvas Grid ----------------
  const canvas = document.createElement('div');
  canvas.className = 'canvas';
  container.appendChild(canvas);

  const gap = 10; // matches CSS grid-gap
  const gridCols = 6;
  const gridRows = 4;

  // Create semi-transparent placeholder grid
  const gridCells = [];
  for (let i = 0; i < gridCols * gridRows; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    canvas.appendChild(cell);
    gridCells.push(cell);
  }

  // Grid occupancy
  const gridOccupied = Array(gridRows).fill(null).map(() => Array(gridCols).fill(false));

  // ---------------- Box Palette ----------------
  const palette = document.createElement('div');
  palette.className = 'palette';

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
    btn.onclick = () => { selectedBox = box; };
    palette.appendChild(btn);
  });
  container.appendChild(palette);

  // ---------------- Load Existing Boxes ----------------
  const canvasRect = canvas.getBoundingClientRect();
  const cellWidth = (canvasRect.width - gap * (gridCols - 1)) / gridCols;
  const cellHeight = (canvasRect.height - gap * (gridRows - 1)) / gridRows;

  if (view.boxes) {
    view.boxes.forEach(box => {
      const boxDiv = document.createElement('div');
      boxDiv.className = 'box';
      boxDiv.textContent = box.label;
      boxDiv.style.width = `${cellWidth * box.w + gap * (box.w - 1)}px`;
      boxDiv.style.height = `${cellHeight * box.h + gap * (box.h - 1)}px`;
      boxDiv.style.left = `${box.col * (cellWidth + gap)}px`;
      boxDiv.style.top = `${box.row * (cellHeight + gap)}px`;
      canvas.appendChild(boxDiv);

      for (let r = box.row; r < box.row + box.h; r++) {
        for (let c = box.col; c < box.col + box.w; c++) {
          gridOccupied[r][c] = true;
        }
      }
    });
  }

  // ---------------- Click to Place Boxes ----------------
  canvas.addEventListener('click', (e) => {
    if (!selectedBox) return;
    const index = gridCells.indexOf(e.target);
    if (index === -1) return;

    const col = index % gridCols;
    const row = Math.floor(index / gridCols);

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

    const boxDiv = document.createElement('div');
    boxDiv.className = 'box';
    boxDiv.textContent = selectedBox.label;
    boxDiv.style.width = `${cellWidth * selectedBox.w + gap * (selectedBox.w - 1)}px`;
    boxDiv.style.height = `${cellHeight * selectedBox.h + gap * (selectedBox.h - 1)}px`;
    boxDiv.style.left = `${col * (cellWidth + gap)}px`;
    boxDiv.style.top = `${row * (cellHeight + gap)}px`;
    canvas.appendChild(boxDiv);

    for (let r = row; r < row + selectedBox.h; r++) {
      for (let c = col; c < col + selectedBox.w; c++) {
        gridOccupied[r][c] = true;
      }
    }

    if (!view.boxes) view.boxes = [];
    view.boxes.push({ ...selectedBox, col, row });
    selectedBox = null;
    saveViewsToLocal();
  });
}
