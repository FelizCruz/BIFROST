import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './index.css';

registerSW({
  immediate: true,
  onRegisteredSW(swUrl) {
    if (import.meta.env.DEV) {
      console.info('BIFROST service worker registered:', swUrl);
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
