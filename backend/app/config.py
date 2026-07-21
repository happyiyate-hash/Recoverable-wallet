
import os
from dotenv import load_dotenv

load_dotenv()

# SUPABASE REGISTRY
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# REDIS DISTRIBUTED STATE
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# FLUTTERWAVE GATEWAY
FLW_SECRET_KEY = os.getenv("FLW_SECRET_KEY")
FLW_WEBHOOK_HASH = os.getenv("FLW_WEBHOOK_HASH")
PAYMENT_BASE_URL = "https://api.flutterwave.com/v3"
