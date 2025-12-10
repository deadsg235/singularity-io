from mangum import Mangum
from main import app

# Vercel serverless handler
handler = Mangum(app)