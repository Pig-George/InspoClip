import React from 'react';
import ReactDOM from 'react-dom/client';
import '@inspoclip/workspace-ui/fonts';
import App from './App';
import './index.css';
import '@inspoclip/workspace-ui/styles/workspace-timeline.css';
import '@inspoclip/workspace-ui/styles/workspace-tokens.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
