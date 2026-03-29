import React from 'react';
import ReactDOM from 'react-dom/client';
import { SyncButton } from '../components/SyncButton';

export default defineContentScript({
  matches: ['*://*.gov.pl/*'],
  main() {
    console.log('Nomous.ia: Content script starting...');
    const root = document.createElement('div');
    root.id = 'nomous-root';
    document.body.appendChild(root);

    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <SyncButton />
      </React.StrictMode>
    );
    console.log('Nomous.ia: Button rendered.');
  },
});
