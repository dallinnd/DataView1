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
      card.style.display = 'flex';
      card.style.justifyContent = 'space-between';
      card.style.marginBottom = '5px';

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

  // --- Header ---
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
  excelBtn.style.marginRight = '10px';
  excelBtn.onclick = () => uploadExcel(view, excelBtn);

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

  // --- Canvas ---
  const canvas = document.createElement('div');
  canvas.className = 'canvas';
  canvas.style.position = 'relative';
  canvas.style.width = '100%';
  canvas.style.paddingBottom = '66%'; // 16:9 aspect ratio
  canvas.style.background = '#f5f5f5';
  container.appendChild(canvas);

  const gridCols = 6;
  const gridRows = 4;
  const gap = 10;
  const gridOccupied = Array(gridRows).fill(null).map(()=>Array(gridCols).fill(false));

  // --- Box Palette ---
  const palette = document.createElement('div');
  palette.style.marginTop = '10px';
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

  // Canvas click to add box
  canvas.addEventListener('click', (e)=>{
    if(!selectedBox) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x/(rect.width/gridCols));
    const row = Math.floor(y/(rect.height/gridRows));
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
    addBoxToCanvas(boxData,canvas,gridOccupied,view);
    selectedBox=null;
    saveViewsToLocal();
  });

  // Load existing boxes
  if(view.boxes) view.boxes.forEach(box=>addBoxToCanvas(box, canvas, gridOccupied, view));
}

// ----------------------- Excel Upload -----------------------
function uploadExcel(view, button) {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.xlsx,.xls';
  fileInput.style.display = 'none';
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, {type:'array'});
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(firstSheet, {header:1});
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

// ----------------------- Add box helper -----------------------
function addBoxToCanvas(boxData,canvas,gridOccupied,view){
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
  const canvasRect = canvas.getBoundingClientRect();
  const cellWidth = canvasRect.width/6;
  const cellHeight = canvasRect.height/4;
  boxDiv.style.left=boxData.col*cellWidth+'px';
  boxDiv.style.top=boxData.row*cellHeight+'px';
  boxDiv.style.width=boxData.w*cellWidth+'px';
  boxDiv.style.height=boxData.h*cellHeight+'px';
  boxDiv.style.background=boxData.bgColor;
  boxDiv.style.color=boxData.textColor;
  boxDiv.style.fontSize=boxData.fontSize+'px';
  boxDiv.style.border='1px solid blue';
  boxDiv.style.display='flex';
  boxDiv.style.flexDirection='column';
  boxDiv.style.justifyContent='center';
  boxDiv.style.alignItems='center';
  boxDiv.style.cursor='pointer';
  boxDiv.innerHTML = `<div class="box-title" style="opacity:0.6;font-size:0.7em">${boxData.title}</div><div class="box-text">${boxData.text}</div>`;

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
  overlay.style.position='fixed';
  overlay.style.top='0'; overlay.style.left='0';
  overlay.style.width='100%'; overlay.style.height='100%';
  overlay.style.background='rgba(0,0,0,0.5)';
  overlay.style.display='flex';
  overlay.style.justifyContent='center';
  overlay.style.alignItems='center';
  overlay.style.zIndex='9999';

  const editor=document.createElement('div');
  editor.style.background='white';
  editor.style.width='90%';
  editor.style.height='90%';
  editor.style.display='flex';
  editor.style.borderRadius='10px';
  editor.style.overflow='hidden';
  overlay.appendChild(editor);

  // --- Preview panel (60%) ---
  const previewPanel=document.createElement('div');
  previewPanel.style.width='60%';
  previewPanel.style.display='flex';
  previewPanel.style.justifyContent='center';
  previewPanel.style.alignItems='center';
  previewPanel.style.background='#f0f0f0';
  editor.appendChild(previewPanel);

  const preview = document.createElement('div');
  preview.style.width = boxDiv.offsetWidth + 'px';
  preview.style.height = boxDiv.offsetHeight + 'px';
  preview.style.background = boxDiv.dataset.bgColor;
  preview.style.color = boxDiv.dataset.textColor;
  preview.style.fontSize = boxDiv.dataset.fontSize + 'px';
  preview.style.display = 'flex';
  preview.style.flexDirection='column';
  preview.style.alignItems='center';
  preview.style.justifyContent='center';
  preview.style.border='1px solid blue';
  preview.innerHTML = `<div class="box-title" style="opacity:0.6;font-size:0.7em">${boxDiv.dataset.title}</div><div class="box-text">${boxDiv.dataset.text}</div>`;
  previewPanel.appendChild(preview);

  // --- Edit panel (40%) ---
  const editPanel = document.createElement('div');
  editPanel.style.width='40%';
  editPanel.style.padding='10px';
  editPanel.style.overflowY='auto';
  editor.appendChild(editPanel);

  // Title
  const titleInput = document.createElement('input');
  titleInput.value=boxDiv.dataset.title;
  titleInput.placeholder='Title';
  titleInput.oninput=()=>{ boxDiv.dataset.title=titleInput.value; preview.querySelector('.box-title').textContent=titleInput.value; };
  editPanel.appendChild(titleInput);

  // Background gradients 3x4
  const gradients=[
    '#cce5ff','#d4edda','#fff3cd','#f8d7da','#e2e3e5','#f5c6cb','#bee5eb','#d1ecf1','#f1f1f1','#e2f0cb','#fef0cb','#fde2e2'
  ];
  editPanel.appendChild(document.createElement('p')).textContent='Background';
  const gradContainer=document.createElement('div');
  gradContainer.style.display='grid';
  gradContainer.style.gridTemplateColumns='repeat(4,1fr)';
  gradContainer.style.gridGap='5px';
  gradients.forEach(g=>{
    const b=document.createElement('div');
    b.style.width='100%'; b.style.height='30px'; b.style.background=g; b.style.cursor='pointer';
    b.onclick=()=>{ boxDiv.dataset.bgColor=g; preview.style.background=g; };
    gradContainer.appendChild(b);
  });
  editPanel.appendChild(gradContainer);

  // Font colors 3x2
  editPanel.appendChild(document.createElement('p')).textContent='Text Color';
  const colors=['#000','#fff','#333','#666','#007bff','#28a745'];
  const colorContainer=document.createElement('div');
  colorContainer.style.display='grid';
  colorContainer.style.gridTemplateColumns='repeat(3,1fr)';
  colorContainer.style.gridGap='5px';
  colors.forEach(c=>{
    const b=document.createElement('div');
    b.style.width='100%'; b.style.height='30px'; b.style.background=c; b.style.cursor='pointer';
    b.onclick=()=>{ boxDiv.dataset.textColor=c; preview.style.color=c; };
    colorContainer.appendChild(b);
  });
  editPanel.appendChild(colorContainer);

  // Font size
  const fontDiv=document.createElement('div');
  fontDiv.style.marginTop='5px';
  const minusBtn=document.createElement('button'); minusBtn.textContent='-';
  minusBtn.onclick=()=>{ boxDiv.dataset.fontSize=parseInt(boxDiv.dataset.fontSize)-2; preview.style.fontSize=boxDiv.dataset.fontSize+'px'; boxDiv.querySelector('.box-text')?.style.fontSize=boxDiv.dataset.fontSize+'px'; };
  const plusBtn=document.createElement('button'); plusBtn.textContent='+';
  plusBtn.onclick=()=>{ boxDiv.dataset.fontSize=parseInt(boxDiv.dataset.fontSize)+2; preview.style.fontSize=boxDiv.dataset.fontSize+'px'; boxDiv.querySelector('.box-text')?.style.fontSize=boxDiv.dataset.fontSize+'px'; };
  fontDiv.appendChild(minusBtn); fontDiv.appendChild(plusBtn);
  editPanel.appendChild(fontDiv);

  // Main Text: Static / Variable
  const toggleDiv=document.createElement('div'); toggleDiv.style.marginTop='10px';
  const staticBtn=document.createElement('button'); staticBtn.textContent='Static';
  const variableBtn=document.createElement('button'); variableBtn.textContent='Variable';
  toggleDiv.appendChild(staticBtn); toggleDiv.appendChild(variableBtn);
  editPanel.appendChild(toggleDiv);

  const mainTextContainer=document.createElement('div'); mainTextContainer.style.marginTop='5px';
  editPanel.appendChild(mainTextContainer);

  function renderMainTextPanel(mode){
    mainTextContainer.innerHTML='';
    if(mode==='Static'){
      const input=document.createElement('input'); input.type='text'; input.value=boxDiv.dataset.text;
      input.oninput=(e)=>{ boxDiv.dataset.text=e.target.value; preview.querySelector('.box-text').textContent=e.target.value; };
      mainTextContainer.appendChild(input);
    } else {
      if(view.importedColumns){
        const pillContainer=document.createElement('div');
        pillContainer.style.display='flex'; pillContainer.style.flexWrap='wrap'; pillContainer.style.gap='5px';
        view.importedColumns.forEach(col=>{
          const pill=document.createElement('div');
          pill.textContent=col;
          pill.style.border='1px solid #333';
          pill.style.padding='2px 5px';
          pill.style.borderRadius='12px';
          pill.style.cursor='pointer';
          pill.onclick=()=>{
            boxDiv.dataset.text=`<${col}>`;
            preview.querySelector('.box-text').textContent=`<${col}>`;
          };
          pillContainer.appendChild(pill);
        });
        mainTextContainer.appendChild(pillContainer);
      }
    }
  }

  renderMainTextPanel('Static');

  staticBtn.onclick=()=>renderMainTextPanel('Static');
  variableBtn.onclick=()=>renderMainTextPanel('Variable');

  // Save button
  const saveBtn=document.createElement('button'); saveBtn.textContent='Save'; saveBtn.style.marginTop='10px';
  saveBtn.onclick=()=>{
    document.body.removeChild(overlay);
    // update main canvas box
    boxDiv.querySelector('.box-title').textContent=boxDiv.dataset.title;
    boxDiv.querySelector('.box-text').textContent=boxDiv.dataset.text;
    boxDiv.style.background=boxDiv.dataset.bgColor;
    boxDiv.style.color=boxDiv.dataset.textColor;
    boxDiv.style.fontSize=boxDiv.dataset.fontSize+'px';
    saveViewsToLocal();
  };
  editPanel.appendChild(saveBtn);

  document.body.appendChild(overlay);
}
