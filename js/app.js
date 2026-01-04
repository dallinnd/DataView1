import { renderHome } from './home.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}

const app = document.getElementById('app');

export function navigate(screen, data) {
  app.innerHTML = '';
  screen(app, data);
}

navigate(renderHome);
