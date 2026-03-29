import React, { useState } from 'react';
import { RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { scrapeCurrentPage } from '../utils/scraper';
import '../assets/sync-button.css';

// Używamy 127.0.0.1 zamiast localhost dla większej stabilności połączeń międzyprocesowych
const API_BASE = "http://127.0.0.1:8000";

export const SyncButton: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState("");

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const syncCall = async (url: string, options: any = {}) => {
      return new Promise<any>((resolve, reject) => {
          if (!chrome.runtime?.sendMessage) {
              reject(new Error("Context lost. Refresh page."));
              return;
          }

          const token = localStorage.getItem('authentication_token');
          const headers: Record<string, string> = {};
          if (token && url.includes('sa.gov.pl')) {
              headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          }

          chrome.runtime.sendMessage({
              type: 'SYNC_DATA',
              payload: { 
                  url, 
                  method: options.method || 'GET', 
                  body: options.body,
                  headers: headers 
              }
          }, (res) => {
              if (res && res.success) {
                  // LOGOWANIE KAŻDEJ ODPOWIEDZI Z API
                  console.log(`%c[API Response] %c${url}`, 'color: #10b981; font-weight: bold;', 'color: #94a3b8;', res.data);
                  resolve(res.data);
              } else {
                  console.error(`%c[API Error] %c${url}`, 'color: #ff4444; font-weight: bold;', 'color: #94a3b8;', {
                      status: res?.status,
                      error: res?.error,
                      details: res?.data
                  });
                  reject(new Error(res?.error || `HTTP ${res?.status}`));
              }
          });
      });
  };

  const fetchApiData = async (baseUrl: string, endpoint: string, idParam: string, sort: string = "id,desc") => {
      let page = 0;
      let allResults: any[] = [];
      console.log(`%c--- 📥 START: ${endpoint} ---`, 'color: #3b82f6; font-weight: bold;');
      
      while (true) {
          const url = `${baseUrl}/${endpoint}?page=${page}&size=100&sort=${sort}&${idParam}`;
          const data = await syncCall(url);
          
          if (!data || !Array.isArray(data) || data.length === 0) break;
          allResults = [...allResults, ...data];
          if (data.length < 100) break;
          page++;
      }
      console.log(`%c--- ✅ KONIEC: ${endpoint} (Pobrano: ${allResults.length}) ---`, 'color: #3b82f6; font-weight: bold;');
      return allResults;
  };

  const getAppelationFromPisp = (): string => {
      const headerElements = Array.from(document.querySelectorAll('app-header, header, .top-bar, app-work-context-view, .mat-toolbar'));
      const headerText = headerElements.map(el => el.textContent).join(" ").toLowerCase();
      
      console.group('%c🔍 Nomous.ia: Wykrywanie Regionu', 'color: #8b5cf6; font-weight: bold;');
      
      const mappings = [
          { keys: ['lublin', 'lubel'], value: 'lublin' },
          { keys: ['warszawa', 'warszaw'], value: 'warszawa' },
          { keys: ['wrocław', 'wroclaw', 'wrocl'], value: 'wroclaw' },
          { keys: ['kraków', 'krakow'], value: 'krakow' },
          { keys: ['poznań', 'poznan'], value: 'poznan' },
          { keys: ['gdańsk', 'gdansk'], value: 'gdansk' },
          { keys: ['katowice', 'katowic'], value: 'katowice' },
          { keys: ['łódź', 'lodz'], value: 'lodz' },
          { keys: ['białystok', 'bialystok'], value: 'bialystok' },
          { keys: ['rzeszów', 'rzeszow'], value: 'rzeszow' },
          { keys: ['szczecin', 'szczecin'], value: 'szczecin' }
      ];

      for (const m of mappings) {
          if (m.keys.some(k => headerText.includes(k))) {
              console.log(`%cWykryto: ${m.value.toUpperCase()}`, 'color: #10b981; font-weight: bold;');
              console.groupEnd();
              return m.value;
          }
      }

      const domainMatch = window.location.href.match(/portal\.([a-z]+)\.sa\.gov\.pl/);
      const fallback = domainMatch ? domainMatch[1] : 'wroclaw';
      console.warn(`Fallback na domenę: ${fallback}`);
      console.groupEnd();
      return fallback;
  };

  const handleFullSync = async () => {
    setIsSyncing(true);
    setSyncStatus('loading');
    console.clear();
    console.log("%c🚀 Nomous.ia Assistant v0.1.3: Pełny Log Synchronizacji", "font-size: 16px; font-weight: bold; color: #6366f1;");
    
    try {
        const url = window.location.href;
        const domainMatch = url.match(/(https?:\/\/[^\/]+)/);
        const lawsuitIdMatch = url.match(/\/sprawy\/(\d+)/);
        
        if (!domainMatch || !lawsuitIdMatch) throw new Error("Błąd: Nie jesteś na stronie szczegółów sprawy.");
        
        const domain = domainMatch[1];
        const lawsuitId = lawsuitIdMatch[1];

        await sleep(500); // Mały delay dla stabilności

        const appelation = getAppelationFromPisp();
        const baseUrl = `${domain}/${appelation}`;
        
        console.log(`%c[Konfiguracja] API URL: ${baseUrl}`, 'font-weight: bold; color: #3b82f6;');

        const entities = await fetchApiData(baseUrl, 'api/v2/parties/lawsuit', `lawsuitId.equals=${lawsuitId}`, "");
        const hearings = await fetchApiData(baseUrl, 'api/court-sessions/lawsuit', `lawsuitId.equals=${lawsuitId}`, "dateFrom,desc");
        const activities = await fetchApiData(baseUrl, 'api/proceeding-views', `caseId.equals=${lawsuitId}`, "date,desc");
        const documents = await fetchApiData(baseUrl, 'api/v3/documents', `lawsuitId.equals=${lawsuitId}`, "publicationDate,desc");
        const relations = await fetchApiData(baseUrl, 'api/relations', `lawsuitId.equals=${lawsuitId}`, "id,asc");
        
        console.log(`%c[PISP] Pobrano powiązania: ${relations.length}`, 'color: #8b5cf6; font-weight: bold;');

        const scrape = scrapeCurrentPage(document);
        
        const payload = {
            signature: scrape.signature,
            raw_texts: { "PISP": scrape.rawText },
            document_links: documents.map(d => ({
                id: d.id,
                name: d.documentName,
                fileName: d.fileName,
                downloadLink: `${domain}/doc/documents/web/${d.id}/download/pdf`,
                sourceDownloadLink: `${domain}/doc/documents/web/${d.id}/download`
            })),
            structured_data: {
                signature: scrape.signature,
                entities: entities,
                hearings: hearings,
                activities: activities,
                documents: documents,
                relations: relations,
                ...scrape.structured.metadata
            }
        };

        console.log("%c🚀 WYŚLIJ PAYLOAD DO NOMOUS.IA", "font-size: 14px; font-weight: bold; color: #ec4899;", payload);

        setProgress("Zapisywanie...");
        const casesList = await syncCall(`${API_BASE}/api/cases`);
        const normSig = scrape.signature.replace(/\s+/g, '').toLowerCase();
        let target = casesList.find((c: any) => c.signature?.replace(/\s+/g, '').toLowerCase() === normSig);
        
        if (!target) {
            target = await syncCall(`${API_BASE}/api/cases`, {
                method: 'POST',
                body: { title: `Sprawa ${scrape.signature}`, signature: scrape.signature }
            });
        }

        await syncCall(`${API_BASE}/api/cases/${target.id}/pisp-sync`, {
            method: 'POST',
            body: payload
        });

        // 3. UPLOAD PLIKÓW PDF I SOURCE
        const token = localStorage.getItem('authentication_token');
        const authHeaders = token ? { 'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {};

        for (let i = 0; i < documents.length; i++) {
            const d = documents[i];
            setProgress(`Plik ${i+1}/${documents.length}`);
            
            // Pobieranie i wysyłanie PDF
            try {
                const pdfRes = await new Promise<any>((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        type: 'DOWNLOAD_FILE',
                        payload: { url: `${domain}/doc/documents/web/${d.id}/download/pdf`, headers: authHeaders }
                    }, (res) => res?.success ? resolve(res) : reject(new Error(res?.error)));
                });

                await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        type: 'UPLOAD_FILE_FORM',
                        payload: {
                            url: `${API_BASE}/api/cases/${target.id}/documents`,
                            fileName: `${d.documentName || 'dokument'}.pdf`,
                            fileBase64: pdfRes.base64,
                            tag: 'PISP',
                            pisp_id: d.id
                        }
                    }, (res) => res?.success ? resolve(res) : reject(new Error(res?.error)));
                });
            } catch (e) { console.error(`Błąd PDF ${d.id}:`, e); }

            // Pobieranie i wysyłanie SOURCE (Oryginał)
            try {
                const srcRes = await new Promise<any>((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        type: 'DOWNLOAD_FILE',
                        payload: { url: `${domain}/doc/documents/web/${d.id}/download`, headers: authHeaders }
                    }, (res) => res?.success ? resolve(res) : reject(new Error(res?.error)));
                });

                await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        type: 'UPLOAD_FILE_FORM',
                        payload: {
                            url: `${API_BASE}/api/cases/${target.id}/documents`,
                            fileName: `${d.documentName || 'dokument'}.doc`,
                            fileBase64: srcRes.base64,
                            tag: 'PISP',
                            pisp_id: d.id
                        }
                    }, (res) => res?.success ? resolve(res) : reject(new Error(res?.error)));
                });
            } catch (e) { console.error(`Błąd Source ${d.id}:`, e); }
        }

        setSyncStatus('success');
        setProgress("Gotowe!");
    } catch (e: any) {
        console.error("%c[KRYTYCZNY BŁĄD SYNC]", "color: #ff0000; font-weight: bold;", e);
        setSyncStatus('error');
        setProgress("Błąd");
    } finally {
        setIsSyncing(false);
        setTimeout(() => { setSyncStatus('idle'); setProgress(""); }, 5000);
    }
  };

  return (
    <button onClick={handleFullSync} disabled={isSyncing} className={`nomous-sync-btn ${syncStatus === 'success' ? 'nomous-sync-success' : syncStatus === 'error' ? 'nomous-sync-error' : ''}`}>
      {isSyncing ? <Loader2 className="nomous-animate-spin" size={16} /> : (syncStatus === 'error' ? <AlertCircle size={16} /> : <RefreshCw size={16} />)}
      {isSyncing ? progress : (syncStatus === 'success' ? 'Gotowe' : 'Synchronizuj WSZYSTKO')}
    </button>
  );
};
