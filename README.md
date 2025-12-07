# Singularity.io

Singularity.io is a futuristic, interactive .io website that integrates the SolFunMeme technology to solve problems on the Solana blockchain and create a new economy. This project aims to be the key interface for interacting with our custom blockchain.

## Key Features

*   **Interactive .io Website:** A modern and engaging user interface for interacting with the Solana blockchain.
*   **Sleek 3D Neural Network Visualization:** Real-time Deep Q-Network with animated particles, 3D-style nodes, and dynamic connections.
*   **Phantom Wallet Integration:** Connect your Solana wallet with one click.
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
│   ├── neural_network.py  # Deep Q-Network system
│   ├── solana_client.py   # Solana blockchain client
│   └── requirements.txt   # Python dependencies
├── web/                   # Frontend
│   └── singularity-frontend/
│       ├── index.html     # Main page with visualization
│       ├── app.js         # Frontend logic + wallet
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
- `GET /api/neural/network` - Get neural network state
- `POST /api/neural/update` - Update neural network

## Development Phases

This is a base template for the Singularity.io project. See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the full development roadmap.

**Current Phase:** Phase 1 - Foundational Infrastructure

## Documentation

- [Quick Start Guide](QUICKSTART.md) - Get running in 5 minutes
- [Features Overview](FEATURES.md) - Neural network & wallet integration
- [Deployment Guide](DEPLOYMENT.md) - Deploy to Vercel
- [SolFunMeme Technology](SOLFUNMEME.md) - Core technology vision
- [New Economy Framework](NEW_ECONOMY.md) - Token economy design
- [Project Plan](PROJECT_PLAN.md) - Development roadmap

## License

MIT
