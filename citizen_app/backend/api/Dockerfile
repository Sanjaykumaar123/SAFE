FROM python:3.12-slim-bookworm

WORKDIR /app

RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true \
    && apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --default-timeout=1000 torch torchvision --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=1000 -r requirements.txt

COPY . .

RUN mkdir -p /app/media

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
