import { renderHome } from './home.js';

console.log('app.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready');

  const app = document.getElementById('app');

  window.navigate = (screen, data) => {
    app.innerHTML = '';
    screen(app, data);
  };

  navigate(renderHome);
});
