// ----------------------- In-Memory State -----------------------
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
  createBtn.onclick = () => renderCanvas();
  container.appendChild(createBtn);

  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = 'View Existing Displays';
  container.appendChild(sectionTitle);

  if (views.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No displays yet. Create one to get started.';
    empty.style.color = '#666';
    container.appendChild(empty);
  } else {
    views.forEach((view) => {
      const card = document.createElement('div');
      card.className = 'view-card';

      const name = document.createElement('strong');
      name.textContent = view.name;

      const boxCount = document.createElement('span');
      boxCount.style.marginLeft = '10px';
      boxCount.style.color = '#666';
      const numBoxes = view.boxes ? view.boxes.length : 0;
      boxCount.textContent = `Boxes: ${numBoxes}`;

      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.style.marginLeft = '20px';
      editBtn.onclick = () => renderCanvas(view);

      card.appendChild(name);
      card.appendChild(boxCount);
      card.appendChild(editBtn);

      container.appendChild(card);
    });
  }
}

// ----------------------- Canvas Screen -----------------------
function renderCanvas(existingView) {
  const container = document.getElementById('app');
  container.innerHTML = '';

  const view = existingView || { 
    name: 'New View', 
    boxes: [], 
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  };

  // Header
  const header = document.createElement('div');
  header.className = 'canvas-header';

  const nameInput = document.createElement('input');
  nameInput.value = view.name;
  nameInput.style.fontSize='20px';
  nameInput.style.width='60%';

  const backBtn = document.createElement('button');
  backBtn.textContent = 'Save & Back';
  backBtn.onclick = () => {
    view.name = nameInput.value;
    view.updatedAt = Date.now();
    if (!existingView) views.push(view);
    saveViewsToLocal();
    renderHome();
  };

  header.appendChild(nameInput);
  header.appendChild(backBtn);
  container.appendChild(header);

  // Canvas grid
  const canvas = document.createElement('div');
  canvas.className = 'canvas';

  for (let i=0; i<24; i++){
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    canvas.appendChild(cell);
  }

  container.appendChild(canvas);

  // ------------------- Grid Occupancy -------------------
  const gridOccupied = Array(4).fill(null).map(() => Array(6).fill(false));

  // ------------------- Box Palette -------------------
  const palette = document.createElement('div');
  palette.className = 'palette';

  const boxTypes = [
    { label:'2×2', w:2, h:2 },
    { label:'2×1', w:2, h:1 },
    { label:'4×1', w:4, h:1 },
    { label:'6×1', w:6, h:1 },
    { label:'3×3', w:3, h:3 },
    { label:'4×4', w:4, h:4 },
  ];

  let selectedBox = null;

  boxTypes.forEach(box => {
    const btn = document.createElement('button');
    btn.textContent = box.label;
    btn.onclick = () => {
      selectedBox = box;
    };
    palette.appendChild(btn);
  });

  container.appendChild(palette);

  // ------------------- Click to place boxes -------------------
  const gridCells = Array.from(canvas.children);

  canvas.addEventListener('click', (e) => {
    if (!selectedBox) return;

    const index = gridCells.indexOf(e.target);
    if (index === -1) return;

    const col = index % 6;
    const row = Math.floor(index / 6);

    // Check bounds
    if (col + selectedBox.w > 6 || row + selectedBox.h > 4) {
      alert('Box too big for this position!');
      return;
    }

    // Check occupancy
    for (let r = row; r < row + selectedBox.h; r++) {
      for (let c = col; c < col + selectedBox.w; c++) {
        if (gridOccupied[r][c]) {
          alert('Space already occupied!');
          return;
        }
      }
    }

    // Create box element
    const boxDiv = document.createElement('div');
    boxDiv.textContent = selectedBox.label;
    boxDiv.style.background = '#34d399';
    boxDiv.style.gridColumn = `${col+1} / span ${selectedBox.w}`;
    boxDiv.style.gridRow = `${row+1} / span ${selectedBox.h}`;
    boxDiv.style.display = 'flex';
    boxDiv.style.alignItems = 'center';
    boxDiv.style.justifyContent = 'center';
    boxDiv.style.borderRadius = '8px';
    boxDiv.style.color = 'white';
    boxDiv.style.fontWeight = 'bold';

    canvas.appendChild(boxDiv);

    // Mark occupied
    for (let r = row; r < row + selectedBox.h; r++) {
      for (let c = col; c < col + selectedBox.w; c++) {
        gridOccupied[r][c] = true;
      }
    }

    // Save box
    if (!view.boxes) view.boxes = [];
    view.boxes.push({ ...selectedBox, col, row });

    selectedBox = null; // reset
  });
}
