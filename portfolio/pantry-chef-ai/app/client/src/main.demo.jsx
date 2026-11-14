// PREVIEW ONLY entry point: same screens, but no server (see api.demo.js)
// and the address is kept in memory instead of the browser's address bar.
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import './styles.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <MemoryRouter>
    <p className="preview-bar">Preview. Sample recipes and sample chef answers. Changes reset when you reload.</p>
    <App />
  </MemoryRouter>,
);
