# Singularity.io

Singularity.io is a futuristic, interactive .io website that integrates the SolFunMeme technology to solve problems on the Solana blockchain and create a new economy. This project aims to be the key interface for interacting with our custom blockchain.

## Key Features

*   **Interactive .io Website:** A modern and engaging user interface for interacting with the Solana blockchain.
*   **SolFunMeme Technology:** A novel technology to address challenges within the Solana ecosystem.
*   **Custom Blockchain:** A Rust-based blockchain for a new digital economy.
*   **Python-Rust Bridge:** A neural network component with a Python-Rust bridge for high-performance computing.
*   **Vercel & FastAPI:** A scalable and fast backend powered by Vercel and FastAPI.

## Project Structure

```
singularity-io/
├── api/                    # FastAPI backend
│   ├── main.py            # Main API application
│   ├── index.py           # Vercel serverless wrapper
│   ├── solana_client.py   # Solana blockchain client
│   └── requirements.txt   # Python dependencies
├── web/                   # Frontend
│   └── singularity-frontend/
│       ├── index.html     # Main page
│       ├── app.js         # Frontend logic
│       └── style.css      # Styling
├── blockchain/            # Rust blockchain (future)
├── neural_network/        # AI components (future)
└── vercel.json           # Vercel deployment config
```

## Getting Started

### Local Development

#### Backend
```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload
```

#### Frontend
```bash
cd web/singularity-frontend
python -m http.server 8080
```

### Deployment to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## API Endpoints

- `GET /` - API information
- `GET /api/health` - Health check
- `GET /api/network/stats` - Solana network statistics
- `GET /api/solfunmeme/status` - SolFunMeme technology status
- `GET /api/economy/overview` - Economy overview

## Development Phases

This is a base template for the Singularity.io project. See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the full development roadmap.

**Current Phase:** Phase 1 - Foundational Infrastructure

## Documentation

- [SolFunMeme Technology](SOLFUNMEME.md)
- [New Economy Framework](NEW_ECONOMY.md)
- [Project Plan](PROJECT_PLAN.md)
- [Deployment Guide](DEPLOYMENT.md)

## License

MIT
