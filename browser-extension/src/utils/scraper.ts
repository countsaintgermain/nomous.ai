export function scrapeCurrentPage(doc: Document = document): any {
  const allText = doc.body.innerText || doc.body.textContent || "";
  let signature = "";
  
  const breadcrumb = doc.querySelector('sh-breadcrumb');
  if (breadcrumb) {
      const lines = breadcrumb.textContent?.split('\n').map(l => l.trim()).filter(l => l.length > 0) || [];
      for (const line of lines) {
          if (line.toLowerCase() === 'sprawy' || line.toLowerCase() === 'strona główna') continue;
          const match = line.match(/([IVXLCDM]+\s+[A-Z]+\s+\d+\s*\/\s*\d+)/i);
          if (match) {
              signature = match[0].trim().replace(/\s+/g, ' ');
              break;
          }
      }
  }

  let metadata: any = {};
  const details = doc.querySelector('app-lawsuit-general');
  if (details) {
      const text = (details as HTMLElement).innerText;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      for (let i = 0; i < lines.length; i++) {
          const label = lines[i].toLowerCase();
          const value = lines[i+1];
          if (!value) continue;
          if (label === 'sygnatura') metadata.signature = value;
          if (label === 'sąd') metadata.court = value;
          if (label === 'wydział') metadata.department = value;
          if (label === 'status') metadata.status = value;
          if (label === 'data wpływu') metadata.receiptDate = value;
          if (label === 'data zakończenia') metadata.conclusionDate = value;
          if (label === 'data publikacji w pi') metadata.publicationDate = value;
          if (label === 'przedmiot sprawy') metadata.caseSubject = value;
          if (label === 'referent') metadata.referent = value;
          if (label === 'wartość przedmiotu sporu') metadata.claimValue = value;
          if (label === 'rozstrzygnięcie') metadata.resolution = value;
          if (label === 'główne podmioty sprawy') metadata.mainEntities = value;
      }
  }

  return { 
    signature: signature.replace(/\s+/g, ' ').trim(), 
    rawText: allText, 
    structured: { activities: [], hearings: [], metadata }
  };
}
