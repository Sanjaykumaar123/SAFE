FROM python:3.12-slim-bookworm

WORKDIR /app

# Install system dependencies for OpenCV, PyTorch, and video/image processing
RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true \
    && apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install lightweight PyTorch CPU build first to prevent timeouts
RUN pip install --no-cache-dir --default-timeout=1000 torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy and install remaining python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=1000 -r requirements.txt

# Copy source files, model weights, and scripts
COPY . .

# Ensure storage directories exist
RUN mkdir -p /app/uploads /app/static /app/models

# Expose port 8001 for AI service REST API
EXPOSE 8001

CMD ["uvicorn", "web_app:app", "--host", "0.0.0.0", "--port", "8001"]
