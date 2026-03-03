from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.proxy_headers import ProxyHeadersMiddleware
from .routers import auth, tasks, chat, mcp
from .models import user, task, chat_models
from .db import get_engine
from sqlmodel import SQLModel

app = FastAPI(title="Todo API", version="1.0.0", redirect_slashes=False)

# CORS middleware — allow Vercel frontend + local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "https://frontend-six-swart-57.vercel.app",
        "https://laibaasif-chatbot.hf.space",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Respect proxy headers (X-Forwarded-Proto, X-Forwarded-For) so generated
# redirects and URL building use the original scheme/host when behind a proxy.
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=("*") )

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(mcp.router, prefix="/api/mcp", tags=["mcp"])


@app.get("/")
def read_root():
    return {"message": "Todo API is running"}


@app.on_event("startup")
def on_startup():
    """Create database tables on startup."""
    engine = get_engine()
    SQLModel.metadata.create_all(engine)


@app.get("/health")
def health_check():
    return {"status": "healthy"}
