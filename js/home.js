import { navigate } from './app.js';
import { getAllViews } from './state.js';
import { renderImport } from './import.js';

export async function renderHome(container) {
  const views = await getAllViews();

  const createBtn = document.createElement('button');
  createBtn.textContent = 'Create New View';
  createBtn.onclick = () => navigate(renderImport);

  container.appendChild(createBtn);

  const section = document.createElement('div');
  section.className = 'view-list';

  views.forEach(view => {
    const card = document.createElement('div');
    card.className = 'view-card';
    card.innerHTML = `
      <strong>${view.name}</strong><br>
      <small>Last modified: ${new Date(view.updatedAt).toLocaleString()}</small>
    `;
    section.appendChild(card);
  });

  container.appendChild(section);
}
