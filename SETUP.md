# Singularity.io - Base Template Setup

This is the base template for the Singularity.io project, rebuilt from the ground up to focus on Solana blockchain integration and the SolFunMeme technology framework.

## What Changed

### Removed
- Game-related code (Q-Network game logic, ONNX models)
- 3D visualization dependencies
- Game-specific endpoints

### Added
- Clean Singularity.io landing page
- Solana blockchain client foundation
- SolFunMeme status tracking
- Economy overview endpoints
- Modern, futuristic UI design
- Proper Vercel deployment configuration

## Project Structure

```
singularity-io/
├── api/
│   ├── main.py              # FastAPI app with Singularity.io endpoints
│   ├── index.py             # Vercel serverless wrapper
│   ├── solana_client.py     # Solana blockchain client (foundation)
│   └── requirements.txt     # Minimal dependencies
├── web/
│   └── singularity-frontend/
│       ├── index.html       # Landing page
│       ├── app.js           # Frontend logic
│       └── style.css        # Modern styling
├── blockchain/              # Future: Rust blockchain
├── neural_network/          # Future: AI components
├── vercel.json             # Deployment config
└── .vercelignore           # Exclude unnecessary files
```

## Quick Start

### 1. Local Development

**Backend:**
```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload
```
Visit: http://localhost:8000

**Frontend:**
```bash
cd web/singularity-frontend
python -m http.server 8080
```
Visit: http://localhost:8080

### 2. Deploy to Vercel

```bash
# Install CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Or connect your GitHub repo to Vercel dashboard for automatic deployments.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | API information |
| `GET /api/health` | Health check |
| `GET /api/network/stats` | Solana network statistics |
| `GET /api/solfunmeme/status` | SolFunMeme technology status |
| `GET /api/economy/overview` | Economy and token overview |

## Frontend Features

- Real-time system status monitoring
- Solana network connection display
- SolFunMeme phase tracking
- Responsive, futuristic design
- Auto-updating status (30s intervals)

## Next Steps

This is a **base template**. To build the full Singularity.io platform:

1. **Phase 1** (Current): Foundational infrastructure ✓
2. **Phase 2**: Implement Solana smart contracts
3. **Phase 3**: Add SolFunMeme technology
4. **Phase 4**: Build economy and token system
5. **Phase 5**: Integrate neural network components

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the complete roadmap.

## Documentation

- [README.md](README.md) - Project overview
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [SOLFUNMEME.md](SOLFUNMEME.md) - SolFunMeme technology
- [NEW_ECONOMY.md](NEW_ECONOMY.md) - Economy framework
- [PROJECT_PLAN.md](PROJECT_PLAN.md) - Development roadmap

## Technology Stack

- **Backend**: FastAPI, Python 3.9+
- **Frontend**: Vanilla JS, CSS3
- **Deployment**: Vercel (serverless)
- **Future**: Solana (blockchain), Rust (custom chain), PyTorch (AI)

## Contributing

This is a foundational template. Expand it by:
- Adding Solana Web3.js integration
- Implementing smart contract interactions
- Building out the neural network components
- Creating the token economy system

---

**Status**: Base Template Ready ✓  
**Version**: 0.1.0  
**Last Updated**: 2025
