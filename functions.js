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
        view.importedColumns = ['Column1','Column2','Column3']; // placeholder for imported columns
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

  // Canvas
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

  // Dimensions for absolute positioning
  const cellWidth = canvas.clientWidth/gridCols - gap + 1;
  const cellHeight = canvas.clientHeight/gridRows - gap + 1;

  // Load existing boxes
  if(view.boxes) view.boxes.forEach(box=>addBoxToCanvas(box, canvas, gridOccupied, cellWidth, cellHeight, view));

  // Canvas click to add box
  canvas.addEventListener('click', (e)=>{
    if(!selectedBox) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x/(cellWidth+gap));
    const row = Math.floor(y/(cellHeight+gap));
    if(col+selectedBox.w>gridCols || row+selectedBox.h>gridRows){
      alert('Box too big!');
      return;
    }
    for(let r=row;r<row+selectedBox.h;r++)
      for(let c=col;c<col+selectedBox.w;c++)
        if(gridOccupied[r][c]){
          alert('Space occupied!');
          return;
        }

    const boxData={...selectedBox,col,row,title:'Title',text:'Box Variable',bgColor:'#cce5ff',textColor:'#000',fontSize:16,variable:null};
    view.boxes.push(boxData);
    addBoxToCanvas(boxData,canvas,gridOccupied,cellWidth,cellHeight,view);
    selectedBox=null;
    saveViewsToLocal();
  });
}

// ----------------------- Add box helper -----------------------
function addBoxToCanvas(boxData,canvas,gridOccupied,cellWidth,cellHeight,view){
  const boxDiv=document.createElement('div');
  boxDiv.className='box';
  boxDiv.dataset.col=boxData.col;
  boxDiv.dataset.row=boxData.row;
  boxDiv.dataset.w=boxData.w;
  boxDiv.dataset.h=boxData.h;
  boxDiv.dataset.title=boxData.title;
  boxDiv.dataset.text=boxData.text;
  boxDiv.dataset.bgColor=boxData.bgColor;
  boxDiv.dataset.textColor=boxData.textColor;
  boxDiv.dataset.fontSize=boxData.fontSize;
  boxDiv.style.position='absolute';
  boxDiv.style.left=boxData.col*(cellWidth+10)+'px';
  boxDiv.style.top=boxData.row*(cellHeight+10)+'px';
  boxDiv.style.width=cellWidth*boxData.w+(boxData.w-1)*10+'px';
  boxDiv.style.height=cellHeight*boxData.h+(boxData.h-1)*10+'px';
  boxDiv.style.background=boxData.bgColor;
  boxDiv.style.color=boxData.textColor;
  boxDiv.style.fontSize=boxData.fontSize+'px';
  boxDiv.style.border='1px solid blue';
  boxDiv.style.display='flex';
  boxDiv.style.flexDirection='column';
  boxDiv.style.justifyContent='center';
  boxDiv.style.alignItems='center';
  boxDiv.style.cursor='pointer';
  boxDiv.textContent=boxData.text;

  for(let r=boxData.row;r<boxData.row+boxData.h;r++)
    for(let c=boxData.col;c<boxData.col+boxData.w;c++)
      gridOccupied[r][c]=true;

  canvas.appendChild(boxDiv);

  boxDiv.addEventListener('click',(e)=>{
    e.stopPropagation();
    openBoxEditor(boxDiv, view);
  });
}

// ----------------------- Full Box Editor -----------------------
function openBoxEditor(boxDiv, view){
  const overlay=document.createElement('div');
  overlay.className='popup-overlay';
  overlay.style.display='flex';
  overlay.style.justifyContent='center';
  overlay.style.alignItems='center';

  const editor=document.createElement('div');
  editor.className='full-editor';
  editor.style.width='90%';
  editor.style.height='90%';
  editor.style.background='white';

  // Preview
  const preview=document.createElement('div');
  preview.className='preview';
  preview.style.background=boxDiv.dataset.bgColor;
  preview.style.color=boxDiv.dataset.textColor;
  preview.style.fontSize=boxDiv.dataset.fontSize+'px';
  preview.textContent=boxDiv.dataset.text;

  // Edit panel
  const editPanel=document.createElement('div');
  editPanel.className='edit-panel';

  // Background gradients
  const gradients=[
    '#cce5ff','#d4edda','#fff3cd','#f8d7da','#e2e3e5','#f5c6cb','#bee5eb','#d1ecf1','#f1f1f1','#e2f0cb','#fef0cb','#fde2e2'
  ];
  const gradTitle=document.createElement('p'); gradTitle.textContent='Background';
  editPanel.appendChild(gradTitle);
  gradients.forEach(g=>{
    const btn=document.createElement('button');
    btn.style.background=g;
    btn.onclick=()=>{
      preview.style.background=g;
      boxDiv.dataset.bgColor=g;
    };
    editPanel.appendChild(btn);
  });

  // Text color
  const textTitle=document.createElement('p'); textTitle.textContent='Text Color';
  editPanel.appendChild(textTitle);
  const textColors=['#000','#fff','#333','#666','#007bff','#28a745'];
  textColors.forEach(c=>{
    const btn=document.createElement('button');
    btn.style.background=c;
    btn.onclick=()=>{
      preview.style.color=c;
      boxDiv.dataset.textColor=c;
    };
    editPanel.appendChild(btn);
  });

  // Font size
  const fontTitle=document.createElement('p'); fontTitle.textContent='Font Size';
  editPanel.appendChild(fontTitle);
  const plusBtn=document.createElement('button'); plusBtn.textContent='+';
  plusBtn.onclick=()=>{ boxDiv.dataset.fontSize=parseInt(boxDiv.dataset.fontSize)+2; preview.style.fontSize=boxDiv.dataset.fontSize+'px'; };
  const minusBtn=document.createElement('button'); minusBtn.textContent='-';
  minusBtn.onclick=()=>{ boxDiv.dataset.fontSize=parseInt(boxDiv.dataset.fontSize)-2; preview.style.fontSize=boxDiv.dataset.fontSize+'px'; };
  editPanel.appendChild(plusBtn); editPanel.appendChild(minusBtn);

  // Static/Variable
  const toggleDiv=document.createElement('div'); toggleDiv.className='toggle-buttons';
  const staticBtn=document.createElement('button'); staticBtn.textContent='Static';
  const variableBtn=document.createElement('button'); variableBtn.textContent='Variable';
  toggleDiv.appendChild(staticBtn); toggleDiv.appendChild(variableBtn);
  editPanel.appendChild(toggleDiv);

  // Static input
  const staticInput=document.createElement('input'); staticInput.type='text'; staticInput.value=boxDiv.dataset.text;
  staticInput.oninput=(e)=>{ preview.textContent=e.target.value; boxDiv.dataset.text=e.target.value; };
  editPanel.appendChild(staticInput);

  // Variable selection
  const variableContainer=document.createElement('div'); variableContainer.className='variable-pills';
  if(view.importedColumns){
    view.importedColumns.forEach(col=>{
      const pill=document.createElement('div');
      pill.className='variable-pill';
      pill.textContent=col;
      pill.onclick=()=>{ preview.textContent=`<${col}>`; boxDiv.dataset.text=`<${col}>`; };
      variableContainer.appendChild(pill);
    });
  }
  editPanel.appendChild(variableContainer);

  // Save button
  const saveBtn=document.createElement('button');
  saveBtn.textContent='Save';
  saveBtn.style.marginTop='10px';
  saveBtn.onclick=()=>{
    document.body.removeChild(overlay);
    saveViewsToLocal();
  };

  editPanel.appendChild(saveBtn);

  editor.appendChild(preview);
  editor.appendChild(editPanel);
  overlay.appendChild(editor);
  document.body.appendChild(overlay);
    }
