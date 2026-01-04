export function renderHome(container) {
  console.log('renderHome');

  container.innerHTML = '';

  const createBtn = document.createElement('button');
  createBtn.textContent = 'Create New View';

  createBtn.onclick = async () => {
    console.log('Create New View clicked');
    const module = await import('./canvas.js');
    navigate(module.renderCanvas);
  };

  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = 'View Existing Displays';
  sectionTitle.style.marginTop = '30px';

  const empty = document.createElement('p');
  empty.textContent = 'No displays yet. Create one to get started.';
  empty.style.color = '#666';

  container.appendChild(createBtn);
  container.appendChild(sectionTitle);
  container.appendChild(empty);
}
