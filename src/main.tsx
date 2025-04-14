import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Force dark mode by adding the dark class to the document element
document.documentElement.classList.add('dark');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);