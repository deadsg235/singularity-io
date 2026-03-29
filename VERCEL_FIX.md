# Vercel Deployment Fix

## Issues Fixed

1. **Double /api/ prefix** - Fixed API_BASE in app.js
2. **500 Internal Server Error** - Added error handling for neural network import
3. **404 Favicon** - Added favicon.svg
4. **Vercel routing** - Updated vercel.json with proper builds configuration

## Changes Made

### 1. app.js - Fixed API URL
```javascript
// Before
const API_BASE = '/api';

// After
const API_BASE = '';  // Vercel handles /api/ routing
```

### 2. main.py - Added Error Handling
```python
try:
    from neural_network import dqn
    NEURAL_AVAILABLE = True
except Exception as e:
    NEURAL_AVAILABLE = False
    dqn = None
```

### 3. vercel.json - Proper Configuration
```json
{
    "builds": [
        {
            "src": "api/index.py",
            "use": "@vercel/python"
        }
    ],
    "routes": [
        {
            "src": "/api/(.*)",
            "dest": "api/index.py"
        },
        {
            "src": "/(.*)",
            "dest": "web/singularity-frontend/$1"
        }
    ]
}
```

## Deploy Again

```bash
git add .
git commit -m "Fix Vercel deployment issues"
git push
```

Vercel will auto-deploy, or manually:
```bash
vercel --prod
```

## Test Endpoints

After deployment, test:
- https://your-domain.vercel.app/
- https://your-domain.vercel.app/api/health
- https://your-domain.vercel.app/api/neural/network

## If Still Having Issues

### Option 1: Check Vercel Logs
```bash
vercel logs
```

### Option 2: Test Locally First
```bash
cd api
uvicorn main:app --reload
```

Then in another terminal:
```bash
cd web/singularity-frontend
python -m http.server 8080
```

### Option 3: Simplify Further

If neural network still causes issues, temporarily disable it:

**api/main.py:**
```python
NEURAL_AVAILABLE = False  # Force disable
```

This will return empty network data but keep the API working.

## Common Vercel Python Issues

1. **Import errors**: Make sure all imports are in requirements.txt
2. **Path issues**: Use absolute imports, not relative
3. **Cold starts**: First request may be slow
4. **Timeout**: Functions timeout after 10s on free tier

## Success Indicators

✅ No 500 errors in browser console
✅ API endpoints return JSON
✅ Neural network visualization loads
✅ Wallet button appears
✅ Status shows "Online"
