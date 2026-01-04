import { getAllViews } from './state.js';
import { renderImport } from './import.js';

export async function renderHome(container) {
  console.log('renderHome (full)');

  container.innerHTML = '';

  /* Create New View */
  const createBtn = document.createElement('button');
  createBtn.textContent = 'Create New View';
  createBtn.onclick = () => navigate(renderImport);

  container.appendChild(createBtn);

  /* Section Title */
  const title = document.createElement('h2');
  title.textContent = 'View Existing Displays';
  title.style.marginTop = '30px';
  container.appendChild(title);

  /* View List */
  const list = document.createElement('div');
  list.className = 'view-list';

  let views = [];
  try {
    views = await getAllViews();
  } catch (e) {
    console.error('Failed to load views', e);
  }

  if (!views.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No displays yet.';
    empty.style.color = '#666';
    list.appendChild(empty);
  } else {
    views
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .forEach(view => {
        const card = document.createElement('div');
        card.className = 'view-card';
        card.innerHTML = `
          <strong>${view.name}</strong><br>
          <small>Last modified: ${new Date(view.updatedAt).toLocaleString()}</small>
        `;
        list.appendChild(card);
      });
  }

  container.appendChild(list);
}
