export function renderImport(container) {
  container.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = 'Import Excel Spreadsheet';

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls';

  input.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (!rows.length) return;

    const view = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^/.]+$/, ''),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      headers: rows[0],
      rows: rows.slice(1),
      boxes: [],
      changeLog: []
    };

    const { saveView } = await import('./state.js');
    const { renderCanvas } = await import('./canvas.js');

    await saveView(view);
    navigate(renderCanvas, view);
  };

  container.append(title, input);
}
