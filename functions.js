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
  createBtn.onclick = () => renderUploadScreen();
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
    views.forEach(view => {
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
      editBtn.onclick = () => renderUploadScreen(view);

      card.appendChild(name);
      card.appendChild(boxCount);
      card.appendChild(editBtn);

      container.appendChild(card);
    });
  }
}

// ----------------------- Upload Screen -----------------------
function renderUploadScreen(existingView) {
  const container = document.getElementById('app');
  container.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = existingView ? 'Edit View: ' + existingView.name : 'New View: Upload Spreadsheet';
  container.appendChild(title);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.xlsx,.xls';
  container.appendChild(fileInput);

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next';
  nextBtn.onclick = () => {
    if (!fileInput.files[0] && !existingView) {
      alert('Please select an Excel file.');
      return;
    }

    let view = existingView;
    if (!existingView) {
      view = { name: 'New View', boxes: [], excelBase64: '', createdAt: Date.now(), updatedAt: Date.now() };
      const reader = new FileReader();
      reader.onload = (e) => {
        view.excelBase64 = e.target.result;
        saveViewsToLocal();
        renderCanvas(view);
      };
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      renderCanvas(view);
    }
  };

  const backBtn = document.createElement('button');
  backBtn.textContent = 'Back';
  backBtn.onclick = renderHome;

  container.appendChild(nextBtn);
  container.appendChild(backBtn);
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

  const gridCells = [];
  for (let i=0; i<24; i++){
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    canvas.appendChild(cell);
    gridCells.push(cell);
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
    btn.onclick = () => { selectedBox = box; };
    palette.appendChild(btn);
  });

  container.appendChild(palette);

  // ------------------- Load Existing Boxes -------------------
  if (view.boxes) {
    view.boxes.forEach(box => {
      const boxDiv = document.createElement('div');
      boxDiv.textContent = box.label;
      boxDiv.style.background = '#34d399';
      boxDiv.style.gridColumn = `${box.col + 1} / span ${box.w}`;
      boxDiv.style.gridRow = `${box.row + 1} / span ${box.h}`;
      boxDiv.style.display = 'flex';
      boxDiv.style.alignItems = 'center';
      boxDiv.style.justifyContent = 'center';
      boxDiv.style.borderRadius = '8px';
      boxDiv.style.color = 'white';
      boxDiv.style.fontWeight = 'bold';
      canvas.appendChild(boxDiv);

      for (let r = box.row; r < box.row + box.h; r++) {
        for (let c = box.col; c < box.col + box.w; c++) {
          gridOccupied[r][c] = true;
        }
      }
    });
  }

  // ------------------- Click to place boxes -------------------
  canvas.addEventListener('click', (e) => {
    if (!selectedBox) return;
    const index = gridCells.indexOf(e.target);
    if (index === -1) return;

    const col = index % 6;
    const row = Math.floor(index / 6);

    if (col + selectedBox.w > 6 || row + selectedBox.h > 4) {
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
