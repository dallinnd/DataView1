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
        view.importedColumns = ['Column1','Column2','Column3']; // Replace with parsing later
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
  canvas.style.width = '100%';
  canvas.style.aspectRatio = '6 / 4';
  canvas.style.position = 'relative';
  canvas.style.display = 'grid';
  canvas.style.gridTemplateColumns = 'repeat(6, 1fr)';
  canvas.style.gridTemplateRows = 'repeat(4, 1fr)';
  canvas.style.gap = '10px';
  canvas.style.padding = '0';
  canvas.style.background = '#f0f0f0';
  container.appendChild(canvas);

  const gridCols = 6;
  const gridRows = 4;
  const gap = 10;
  const gridOccupied = Array(gridRows).fill(null).map(()=>Array(gridCols).fill(false));

  // Semi-transparent placeholders
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

  const cellWidth = (canvas.clientWidth-(gridCols-1)*gap)/gridCols;
  const cellHeight = (canvas.clientHeight-(gridRows-1)*gap)/gridRows;

  if(view.boxes) view.boxes.forEach(box=>addBoxToCanvas(box, canvas, gridOccupied, cellWidth, cellHeight, view));

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

    const boxData={...selectedBox,col,row,title:'Title',text:'Box Variable'};
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
  boxDiv.style.position='absolute';
  boxDiv.style.left=boxData.col*(cellWidth+10)+'px';
  boxDiv.style.top=boxData.row*(cellHeight+10)+'px';
  boxDiv.style.width=cellWidth*boxData.w+(boxData.w-1)*10+'px';
  boxDiv.style.height=cellHeight*boxData.h+(boxData.h-1)*10+'px';
  boxDiv.style.background='rgba(0,0,255,0.2)';
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
    openBoxActionPopup(boxDiv, view, gridOccupied, canvas);
  });
}

// ----------------------- Box Popups -----------------------
function openBoxActionPopup(boxDiv, view, gridOccupied, canvas){
  const overlay=document.createElement('div');
  overlay.className='popup-overlay';
  overlay.style.position='fixed';
  overlay.style.top=0; overlay.style.left=0;
  overlay.style.width='100%'; overlay.style.height='100%';
  overlay.style.background='rgba(0,0,0,0.3)';
  overlay.style.display='flex';
  overlay.style.alignItems='center';
  overlay.style.justifyContent='center';
  overlay.style.zIndex=1000;

  const popup=document.createElement('div');
  popup.style.background='white';
  popup.style.borderRadius='12px';
  popup.style.padding='20px';
  popup.style.display='flex';
  popup.style.justifyContent='space-around';
  popup.style.minWidth='300px';

  const deleteBtn=document.createElement('button'); deleteBtn.textContent='Delete'; deleteBtn.style.background='red'; deleteBtn.style.color='white';
  deleteBtn.onclick=()=>{canvas.removeChild(boxDiv); for(let r=boxDiv.dataset.row;r<Number(boxDiv.dataset.row)+Number(boxDiv.dataset.h);r++) for(let c=boxDiv.dataset.col;c<Number(boxDiv.dataset.col)+Number(boxDiv.dataset.w);c++) gridOccupied[r][c]=false; const idx=view.boxes.findIndex(b=>b.col==boxDiv.dataset.col&&b.row==boxDiv.dataset.row); if(idx!==-1)view.boxes.splice(idx,1); saveViewsToLocal(); document.body.removeChild(overlay);};

  const editBtn=document.createElement('button'); editBtn.textContent='Edit'; editBtn.style.background='green'; editBtn.style.color='white';
  editBtn.onclick=()=>{ document.body.removeChild(overlay); openFullBoxEditor(boxDiv, view); };

  const backBtn=document.createElement('button'); backBtn.textContent='Back'; backBtn.style.background='gray'; backBtn.style.color='white';
  backBtn.onclick=()=>document.body.removeChild(overlay);

  popup.appendChild(deleteBtn); popup.appendChild(editBtn); popup.appendChild(backBtn);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}

// ----------------------- Full Box Editor -----------------------
function openFullBoxEditor(boxDiv, view){
  const overlay=document.createElement('div');
  overlay.className='popup-overlay';
  overlay.style.position='fixed'; overlay.style.top=0; overlay.style.left=0;
  overlay.style.width='100%'; overlay.style.height='100%';
  overlay.style.background='rgba(0,0,0,0.3)';
  overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center';
  overlay.style.zIndex=1000;

  const editor=document.createElement('div');
  editor.style.background='white'; editor.style.width='90%'; editor.style.height='90%';
  editor.style.display='flex'; editor.style.borderRadius='12px';
  overlay.appendChild(editor);

  const preview=document.createElement('div'); preview.style.flex='3'; preview.style.display='flex';
  preview.style.flexDirection='column'; preview.style.justifyContent='center'; preview.style.alignItems='center';
  preview.style.border='1px solid #ccc'; preview.style.margin='10px'; preview.style.position='relative';
  preview.style.background=boxDiv.style.background;

  const title=document.createElement('div'); title.textContent=boxDiv.dataset.title; title.style.fontSize='14px';
  title.style.position='absolute'; title.style.top='5px'; title.style.textAlign='center'; preview.appendChild(title);

  const mainText=document.createElement('div'); mainText.textContent=boxDiv.dataset.text; mainText.style.fontSize=boxDiv.style.fontSize||'16px';
  mainText.style.color=boxDiv.style.color||'#000'; mainText.style.textAlign='center';
  mainText.style.display='flex'; mainText.style.justifyContent='center'; mainText.style.alignItems='center';
  mainText.style.flex='1'; preview.appendChild(mainText);

  editor.appendChild(preview);

  // Right panel, background gradients, text color, font size, static/variable
  const editPanel=document.createElement('div'); editPanel.style.flex='2'; editPanel.style.display='flex'; editPanel.style.flexDirection='column'; editPanel.style.margin='10px';
  const gradients=['linear-gradient(135deg,#f6d365,#fda085)','linear-gradient(135deg,#a1c4fd,#c2e9fb)','linear-gradient(135deg,#d4fc79,#96e6a1)','linear-gradient(135deg,#fbc2eb,#a6c1ee)','linear-gradient(135deg,#84fab0,#8fd3f4)','linear-gradient(135deg,#fccb90,#d57eeb)','linear-gradient(135deg,#e0c3fc,#8ec5fc)','linear-gradient(135deg,#f093fb,#f5576c)','linear-gradient(135deg,#43e97b,#38f9d7)','linear-gradient(135deg,#fa709a,#fee140)','linear-gradient(135deg,#30cfd0,#330867)','linear-gradient(135deg,#ff9a9e,#fad0c4)'];
  const bgTitle=document.createElement('div'); bgTitle.textContent='Background:'; editPanel.appendChild(bgTitle);
  gradients.forEach(g=>{const b=document.createElement('button'); b.style.background=g; b.style.width='30px'; b.style.height='30px'; b.style.margin='3px'; b.onclick=()=>preview.style.background=g; editPanel.appendChild(b);});

  const textColorTitle=document.createElement('div'); textColorTitle.textContent='Text Color:'; textColorTitle.style.marginTop='10px'; editPanel.appendChild(textColorTitle);
  const blackBtn=document.createElement('button'); blackBtn.textContent='Black'; blackBtn.style.margin='3px'; blackBtn.onclick=()=>mainText.style.color='black';
  const whiteBtn=document.createElement('button'); whiteBtn.textContent='White'; whiteBtn.style.margin='3px'; whiteBtn.onclick=()=>mainText.style.color='white';
  editPanel.appendChild(blackBtn); editPanel.appendChild(whiteBtn);

  const fontDiv=document.createElement('div'); fontDiv.style.marginTop='10px';
  const minusBtn=document.createElement('button'); minusBtn.textContent='-'; const plusBtn=document.createElement('button'); plusBtn.textContent='+';
  minusBtn.onclick=()=>mainText.style.fontSize=(parseInt(mainText.style.fontSize)||16)-1+'px';
  plusBtn.onclick=()=>mainText.style.fontSize=(parseInt(mainText.style.fontSize)||16)+1+'px';
  fontDiv.appendChild(minusBtn); fontDiv.appendChild(plusBtn); editPanel.appendChild(fontDiv);

  const toggleDiv=document.createElement('div'); toggleDiv.style.marginTop='10px';
  const staticBtn=document.createElement('button'); staticBtn.textContent='Static';
  const variableBtn=document.createElement('button'); variableBtn.textContent='Variable';
  toggleDiv.appendChild(staticBtn); toggleDiv.appendChild(variableBtn); editPanel.appendChild(toggleDiv);

  const staticInput=document.createElement('input'); staticInput.value=mainText.textContent; staticInput.style.display='block'; staticInput.style.marginTop='10px';
  const variableList=document.createElement('div'); variableList.style.display='none'; variableList.style.flexWrap='wrap'; variableList.style.marginTop='10px'; variableList.style.gap='5px';
  staticBtn.onclick=()=>{ staticInput.style.display='block'; variableList.style.display='none'; mainText.textContent=staticInput.value; };
  staticInput.oninput=()=>mainText.textContent=staticInput.value;
  variable
