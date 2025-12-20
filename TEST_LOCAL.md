# Test Locally First

## Start Backend
```bash
cd api
pip install fastapi uvicorn mangum pydantic
python -m uvicorn index:app --reload --port 8000
```

## Start Frontend
```bash
cd web/singularity-frontend
python -m http.server 8080
```

## Test URLs
- Frontend: http://localhost:8080
- API Health: http://localhost:8000/api/health
- Neural Network: http://localhost:8000/api/neural/network

## Check Console
Open browser console (F12) and look for:
- Network errors
- JavaScript errors
- API responses

## Common Issues
1. CORS errors - backend must be running
2. Canvas not found - check HTML has canvas element
3. API 404 - wrong URL or backend not running
4. No visualization - check network data loads
