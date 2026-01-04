import { saveView } from './state.js';
import { navigate } from './app.js';
import { renderHome } from './home.js';

export function renderImport(container) {
  const title = document.createElement('h2');
  title.textContent = 'Import Excel Spreadsheet';

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls';

  input.onchange = async e => {
    const file = e.target.files[0];
    const data = await file.arrayBuffer();

    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const headers = rows[0];
    const body = rows.slice(1);

    const view = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^/.]+$/, ''),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      headers,
      rows: body,
      boxes: [],
      changeLog: []
    };

    await saveView(view);
    navigate(renderHome);
  };

  container.append(title, input);
}
