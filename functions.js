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

  // Header
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

  const excelBtn = document.createElement('button');
  excelBtn.textContent = view.excelBase64 ? 'Change Excel' : 'Upload Excel';
  excelBtn.style.background = '#f97316';
  excelBtn.style.color = 'white';
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
        view.importedColumns = ['Column1','Column2','Column3']; // placeholder
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

  // Canvas grid
  const canvas = document.createElement('div');
  canvas.className = 'canvas';
  container.appendChild(canvas);

  const gridCols = 6;
  const gridRows = 4;
  const gap = 10;
  const gridOccupied = Array(gridRows).fill(null).map(()=>Array(gridCols).fill(false));

  // Placeholder grid cells
  for(let i=0;i<gridCols*gridRows;i++){
    const cell = document.createElement('div');
    cell.className='grid-cell';
    cell.style.background='rgba(0,0,0,0.05)';
    canvas.appendChild(cell);
  }

  // Box palette
  const palette = document.createElement('div');
  palette.style.marginTop='10px';
  const boxTypes = [
    { label: '2×2', w: 2, h:2 }, { label:'2×1', w:2, h:1 }, { label:'4×1', w:4, h:1 },
    { label:'6×1', w:6, h:1 }, { label:'3×3', w:3, h:3 }, { label:'4×4', w:4, h:4 }
  ];
  let selectedBox = null;
  boxTypes.forEach(b=>{
    const btn=document.createElement('button');
    btn.textContent=b.label;
    btn.onclick=()=> selectedBox=b;
    palette.appendChild(btn);
  });
  container.appendChild(palette);

  // Placeholder for adding boxes (simple logic)
  canvas.addEventListener('click', (e)=>{
    if(!selectedBox) return;
    alert('Box selected: ' + selectedBox.label + '. Box placement logic goes here.');
    selectedBox=null;
  });
}
