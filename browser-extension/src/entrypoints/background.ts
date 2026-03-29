export default defineBackground(() => {
  console.log('Nomous.ia Assistant: Background Service Worker initialized.');

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 1. Proxy dla zapytań API
    if (message.type === 'SYNC_DATA') {
      const { url, method, body, headers } = message.payload;
      fetch(url, {
        method: method || 'GET',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body ? JSON.stringify(body) : undefined
      })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        sendResponse({ success: res.ok, status: res.status, data });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    // 2. Proxy dla pobierania plików - DODANO credentials: 'include'
    if (message.type === 'DOWNLOAD_FILE') {
        const { url, headers } = message.payload;
        console.log(`[Background] Pobieranie pliku: ${url}`, { hasAuth: !!headers?.Authorization });
        
        fetch(url, { 
            headers, 
            credentials: 'include' // Przekazujemy ciasteczka sesyjne portalu
        })
        .then(async (res) => {
            if (!res.ok) {
                console.error(`[Background] Błąd pobierania ${res.status} dla ${url}`);
                throw new Error(`HTTP ${res.status}`);
            }
            const blob = await res.blob();
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
            const base64 = await base64Promise;
            sendResponse({ success: true, base64 });
        })
        .catch(err => {
            console.error(`[Background] Krytyczny błąd fetch: ${err.message}`);
            sendResponse({ success: false, error: err.message });
        });
        return true;
    }

    // 3. Proxy dla uploadu FormData
    if (message.type === 'UPLOAD_FILE_FORM') {
        const { url, fileName, fileBase64, tag, pisp_id } = message.payload;
        fetch(fileBase64)
            .then(res => res.blob())
            .then(blob => {
                const formData = new FormData();
                formData.append('file', blob, fileName);
                formData.append('tag', tag || 'PISP');
                if (pisp_id) formData.append('pisp_id', pisp_id.toString());
                return fetch(url, { method: 'POST', body: formData });
            })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                sendResponse({ success: res.ok, data });
            })
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
  });
});
