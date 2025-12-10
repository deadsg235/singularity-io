from main import app

# Vercel serverless function handler
def handler(request):
    return app(request.environ, lambda status, headers: None)