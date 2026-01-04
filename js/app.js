import { renderHome } from './home.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');

  window.navigate = function (screen, data) {
    app.innerHTML = '';
    screen(app, data);
  };

  navigate(renderHome);
});
