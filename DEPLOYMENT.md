# Vercel Deployment Guide

## Prerequisites
- Vercel account
- Vercel CLI installed: `npm i -g vercel`
- Git repository (GitHub recommended)

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect settings from `vercel.json`
6. Click "Deploy"

### Option 2: Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from root directory
vercel

# Production deployment
vercel --prod
```

## Project Structure

```
singularity-io/
├── api/
│   ├── index.py          # Vercel serverless entry point
│   ├── main.py           # FastAPI application
│   ├── solana_client.py  # Solana blockchain client
│   └── requirements.txt  # Python dependencies
└── web/
    └── singularity-frontend/
        ├── index.html    # Landing page
        ├── app.js        # Frontend logic
        └── style.css     # Styling
```

## API Endpoints

After deployment, your API will be available at:
- `https://your-domain.vercel.app/` - API info
- `https://your-domain.vercel.app/api/health` - Health check
- `https://your-domain.vercel.app/api/network/stats` - Network statistics
- `https://your-domain.vercel.app/api/solfunmeme/status` - SolFunMeme status
- `https://your-domain.vercel.app/api/economy/overview` - Economy overview

## Frontend

Your frontend will be served at: `https://your-domain.vercel.app/`

## Configuration Files

### vercel.json
```json
{
    "outputDirectory": "web/singularity-frontend",
    "rewrites": [
        { "source": "/api/(.*)", "destination": "/api/index" }
    ]
}
```

### .vercelignore
Excludes unnecessary files from deployment:
- blockchain/
- neural_network/
- Documentation files
- Cache directories

## Troubleshooting

### Build Fails
- Check `vercel logs` for detailed error messages
- Ensure all dependencies in `requirements.txt` are valid
- Verify Python version compatibility (3.9+)

### API Not Working
- Verify `api/index.py` correctly imports `main.app`
- Check that `mangum` is in requirements.txt
- Review function logs in Vercel dashboard

### Frontend Not Loading
- Ensure `outputDirectory` in vercel.json points to correct path
- Verify all frontend files are in `web/singularity-frontend/`
- Check browser console for errors

### CORS Issues
CORS is configured to allow all origins. For production:
```python
allow_origins=["https://your-domain.vercel.app"]
```

## Environment Variables

For production, add environment variables in Vercel dashboard:
- `SOLANA_NETWORK` - Network to connect to (mainnet-beta, testnet, devnet)
- `API_KEY` - API keys for external services

## Custom Domain

1. Go to Project Settings in Vercel
2. Navigate to Domains
3. Add your custom domain
4. Update DNS records as instructed

## Monitoring

- View logs: `vercel logs`
- Analytics: Available in Vercel dashboard
- Performance: Monitor via Vercel Speed Insights
