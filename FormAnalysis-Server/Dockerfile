FROM python:3.11-slim

ENV MALLOC_ARENA_MAX=2
ENV PYTHONMALLOC=malloc
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 libxcb1 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["/bin/sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT} --workers 1 --timeout-keep-alive 30"]