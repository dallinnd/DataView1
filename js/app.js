import { renderHome } from './home.js';

console.log('app.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready');

  const app = document.getElementById('app');

  if (!app) {
    console.error('App container not found');
    return;
  }

  window.navigate = (screen, data) => {
    console.log('Navigating to', screen.name);
    app.innerHTML = '';
    screen(app, data);
  };

  navigate(renderHome);
});
