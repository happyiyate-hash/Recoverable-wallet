
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import flutterwave, withdraw, accounts, webhook, ws, activities
from app.services.connection_manager import manager

app = FastAPI(
    title="Movement Engine",
    description="Institutional Fintech Orchestration Node",
    version="3.0.0"
)

@app.on_event("startup")
async def startup_event():
    # Start the distributed event listener
    await manager.start_redis_listener()

# Enable CORS for terminal interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Handshake Routes
# These connect the brain to the bank rails and identity registry
app.include_router(flutterwave.router)
app.include_router(withdraw.router)
app.include_router(accounts.router)
app.include_router(webhook.router)
app.include_router(ws.router)
app.include_router(activities.router)

@app.get("/")
def health_check():
    return {
        "status": "operational",
        "registry": "synchronized",
        "version": "3.0.0",
        "node": "WNC_BACKEND_CENTRAL"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
