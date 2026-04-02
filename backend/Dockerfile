# Używamy oficjalnego obrazu python:3.12-slim opartym na Debianie, zawierającego Pythona 3.12
FROM python:3.12-slim

# Ustawienie zmiennej do instalacji paczek systemowych
ENV DEBIAN_FRONTEND=noninteractive

# Instalacja zależności systemowych (absolutne minimum)
RUN apt-get update && apt-get install -y \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Ścieżka, gdzie globalnie Playwright będzie trzymał binarki przeglądarek
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Instalujemy globalnie playwrighta, żeby pobrać zależności systemowe dla przeglądarek 
# (flaga --break-system-packages pozwala na instalację bez venv, tylko w celach zbudowania środowiska)
RUN pip install --break-system-packages playwright && \
    playwright install-deps chromium && \
    playwright install chromium && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# W kontenerze używamy skryptu startowego, który utworzy/podepnie venv z wolumenu
ENTRYPOINT ["/app/entrypoint.sh"]

# Domyślna komenda
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
