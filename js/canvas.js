import { saveView } from './state.js';
import { navigate } from './app.js';
import { renderHome } from './home.js';

export function renderCanvas(container, view) {
  /* ---------- Header ---------- */
  const header = document.createElement('div');
  header.className = 'canvas-header';

  const nameInput = document.createElement('input');
  nameInput.value = view.name;
  nameInput.className = 'view-name-input';

  nameInput.oninput = () => {
    view.name = nameInput.value;
    view.updatedAt = Date.now();
  };

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save & Next';
  saveBtn.onclick = async () => {
    await saveView(view);
    navigate(renderHome);
  };

  header.append(nameInput, saveBtn);

  /* ---------- Canvas Wrapper ---------- */
  const canvasWrapper = document.createElement('div');
  canvasWrapper.className = 'canvas-wrapper';

  const canvas = document.createElement('div');
  canvas.className = 'canvas';

  /* ---------- Grid ---------- */
  const grid = document.createElement('div');
  grid.className = 'grid';

  for (let i = 0; i < 24; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    grid.appendChild(cell);
  }

  canvas.appendChild(grid);
  canvasWrapper.appendChild(canvas);

  /* ---------- Box Palette ---------- */
  const palette = document.createElement('div');
  palette.className = 'box-palette';

  const boxTypes = [
    '2×2',
    '2×1',
    '4×1',
    '6×1',
    '3×3',
    '4×4'
  ];

  boxTypes.forEach(label => {
    const box = document.createElement('div');
    box.className = 'palette-box';
    box.textContent = label;
    palette.appendChild(box);
  });

  /* ---------- Mount ---------- */
  container.append(header, canvasWrapper, palette);
}
