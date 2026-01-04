export function renderHome(container) {
  console.log('renderHome called');

  const title = document.createElement('h2');
  title.textContent = 'Home Loaded';

  const btn = document.createElement('button');
  btn.textContent = 'Create New View';

  container.appendChild(title);
  container.appendChild(btn);
}
