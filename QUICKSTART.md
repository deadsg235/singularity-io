# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites
- Python 3.9+
- Modern web browser
- (Optional) Phantom Wallet extension

### Step 1: Start the Backend

```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend running at: http://localhost:8000

### Step 2: Start the Frontend

Open a new terminal:

```bash
cd web/singularity-frontend
python -m http.server 8080
```

Frontend running at: http://localhost:8080

### Step 3: Test the Features

1. **View Neural Network**
   - Open http://localhost:8080
   - See the Deep Q-Network visualization
   - Click "Update Network" to see it evolve

2. **Connect Wallet**
   - Install [Phantom Wallet](https://phantom.app/)
   - Click "Connect Wallet" button
   - Approve connection
   - See your address in the header

3. **Check API**
   - Visit http://localhost:8000/docs
   - Interactive API documentation
   - Test all endpoints

## 🧪 Testing the Neural Network

### Via Browser
1. Open http://localhost:8080
2. Watch the network visualization
3. Click "Update Network" multiple times
4. Observe nodes changing values

### Via API
```bash
# Get network state
curl http://localhost:8000/api/neural/network

# Update network
curl -X POST http://localhost:8000/api/neural/update

# Get updated state
curl http://localhost:8000/api/neural/network
```

## 💼 Testing Phantom Wallet

### Setup
1. Install Phantom: https://phantom.app/
2. Create or import a wallet
3. Switch to Devnet (Settings → Developer Settings → Change Network)

### Connect
1. Click "Connect Wallet" on the site
2. Approve in Phantom popup
3. See connection status update

### Verify
- Button shows truncated address
- Status shows "Connected"
- Console logs wallet address

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check Python version
python --version  # Should be 3.9+

# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

### Frontend can't connect to API
- Check backend is running on port 8000
- Check browser console for CORS errors
- Try http://localhost:8080 (not file://)

### Wallet won't connect
- Ensure Phantom is installed
- Check browser console for errors
- Try refreshing the page
- Make sure you're on http:// or https:// (not file://)

### Network visualization not showing
- Check canvas element loaded
- Open browser console for errors
- Verify API endpoint returns data
- Try refreshing the page

## 📝 Next Steps

1. **Customize the Network**
   - Edit `api/neural_network.py`
   - Change layer sizes: `DeepQNetwork(layers=[16, 32, 16])`
   - Restart backend to see changes

2. **Modify the UI**
   - Edit `web/singularity-frontend/style.css`
   - Change colors, fonts, layout
   - Refresh browser to see changes

3. **Add Features**
   - See [FEATURES.md](FEATURES.md) for ideas
   - Check [PROJECT_PLAN.md](PROJECT_PLAN.md) for roadmap
   - Read [SOLFUNMEME.md](SOLFUNMEME.md) for vision

## 🚢 Deploy to Production

When ready to deploy:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions.

## 💡 Tips

- Use Chrome DevTools to inspect network visualization
- Check FastAPI docs at http://localhost:8000/docs
- Monitor backend logs for debugging
- Use Phantom's developer mode for testing
- Keep backend and frontend terminals open

## 🆘 Need Help?

- Check [FEATURES.md](FEATURES.md) for feature documentation
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for deployment issues
- See [PROJECT_PLAN.md](PROJECT_PLAN.md) for project context
