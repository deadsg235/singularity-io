# Singularity.io API

FastAPI backend for the Singularity.io platform.

## Features

- RESTful API endpoints for Solana blockchain integration
- SolFunMeme technology status tracking
- Economy and network statistics
- Health monitoring

## Endpoints

### Core
- `GET /` - API information
- `GET /api/health` - Health check

### Network
- `GET /api/network/stats` - Solana network statistics

### SolFunMeme
- `GET /api/solfunmeme/status` - SolFunMeme technology status

### Economy
- `GET /api/economy/overview` - Economy overview and token stats

## Local Development

```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload
```

## Deployment

Configured for Vercel serverless deployment via `index.py`.
