FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose port (HF Spaces expects 7860)
EXPOSE 7860

# Run the application on port 7860 for Hugging Face Spaces
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "7860"]
