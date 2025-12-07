# Vercel Deployment Guide

## Prerequisites
- Vercel account
- Vercel CLI installed: `npm i -g vercel`

## Deployment Steps

### 1. Install Vercel CLI (if not installed)
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy from root directory
```bash
vercel
```

### 4. Follow prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? **singularity-io** (or your choice)
- In which directory is your code located? **./**
- Want to override settings? **N**

### 5. Production deployment
```bash
vercel --prod
```

## Project Structure for Vercel

```
singularity-io/
├── api/
│   ├── index.py          # Vercel serverless entry point
│   ├── main.py           # FastAPI app
│   ├── q_network.py      # Q-Network logic
│   ├── requirements.txt  # Python dependencies
│   └── Q_Layered_Network/
│       └── dqn_node_model.onnx
└── web/
    └── singularity-frontend/
        ├── index.html
        ├── app.js
        └── style.css
```

## API Endpoints

After deployment, your API will be available at:
- `https://your-domain.vercel.app/api/` - Root endpoint
- `https://your-domain.vercel.app/api/nodes` - Node count
- `https://your-domain.vercel.app/api/q_network/state` - Network state
- `https://your-domain.vercel.app/api/q_network/update` - Update network
- `https://your-domain.vercel.app/api/q_network/perturb/{node_id}` - Perturb node
- `https://your-domain.vercel.app/api/game/state` - Game state
- `https://your-domain.vercel.app/api/game/reset` - Reset game

## Frontend

Your frontend will be served at: `https://your-domain.vercel.app/`

## Troubleshooting

### ONNX Model Issues
If the ONNX model fails to load, check:
- File is included in deployment (not in .vercelignore)
- Path is correct in q_network.py
- onnxruntime is in requirements.txt

### API Not Working
- Check Vercel function logs: `vercel logs`
- Ensure mangum is installed
- Verify index.py imports main.app correctly

### CORS Issues
CORS is configured to allow all origins in main.py. Adjust for production security.
