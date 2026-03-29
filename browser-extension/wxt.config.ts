import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  manifest: {
    name: 'Nomous.ia Assistant',
    description: 'Synchronizuj akta sprawy z PISP bezpośrednio do Nomous.ia',
    version: '0.1.2',
    permissions: [
      'storage',
      'tabs',
      'scripting'
    ],
    host_permissions: [
      '*://*.gov.pl/*',
      'http://localhost:8000/*',
      'http://127.0.0.1:8000/*',
      'https://*.sa.gov.pl/*'
    ],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'"
    }
  },
});
