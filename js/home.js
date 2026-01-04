import { getAllViews } from './state.js';
import { renderImport } from './import.js';

export async function renderHome(container) {
  // Clear container (safety)
  container.innerHTML = '';

  /* ---------- Create New View Button ---------- */
  const createBtn = document.createElement('button');
  createBtn.textContent = 'Create New View';
  createBtn.onclick = () => {
    navigate(renderImport);
  };

  container.appendChild(createBtn);

  /* ---------- Existing Views Section ---------- */
  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = 'View Existing Displays';
  sectionTitle.style.marginTop = '30px';

  container.appendChild(sectionTitle);

  const viewList = document.createElement('div');
  viewList.className = 'view-list';

  const views = await getAllViews();

  if (views.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No displays yet. Create one to get started.';
    empty.style.color = '#666';
    viewList.appendChild(empty);
  } else {
    views
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .forEach(view => {
        const card = document.createElement('div');
        card.className = 'view-card';

        card.innerHTML = `
          <strong>${view.name}</strong><br />
          <small>Last modified: ${new Date(view.updatedAt).toLocaleString()}</small>
        `;

        card.onclick = () => {
          alert(`View selected:\n${view.name}\n\nMenu comes next.`);
        };

        viewList.appendChild(card);
      });
  }

  container.appendChild(viewList);
}
