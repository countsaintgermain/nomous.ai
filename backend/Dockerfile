FROM python:3.12-slim

# Instalacja zależności systemowych dla PaddleOCR, PyPDF2 i innych (np. tesseract, poppler)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Kopiowanie zależności backendowych
COPY requirements.txt .

# Instalacja zależności Pythona
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Jeżeli potrzebujesz dodatkowych paczek odkrytych w trakcie (Pinecone, LangChain, pdfplumber):
RUN pip install pinecone langchain-pinecone langchain-google-genai langchain-classic pdfplumber

# Skopiuj kod źródłowy na końcu, żeby wykorzystać cache warstw Dockera dla wymagań powyzęj.
COPY . .

EXPOSE 8000

# Komenda domyślna dla API (fastapi)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
