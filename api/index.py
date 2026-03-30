"""
index.py — Vercel serverless entry point for Singularity.io API.

Vercel looks for `handler` or the ASGI app at module level.
All routes are defined in main.py — this file just bootstraps the path
so dqn_core (dqn-core/) is importable, then re-exports the app.
"""

import sys
import os
from pathlib import Path

# Make dqn-core importable as `dqn_core` without installation.
# Vercel deploys the whole repo, so the dqn-core directory is at ../dqn-core
# relative to this file. We add its *parent* to sys.path so that
# `import dqn_core` resolves to the dqn-core/ package directory.
_repo_root = Path(__file__).parent.parent
_dqn_parent = _repo_root  # dqn-core lives at repo_root/dqn-core

if str(_dqn_parent) not in sys.path:
    sys.path.insert(0, str(_dqn_parent))

# Symlink trick: if dqn_core isn't importable by name (hyphen issue),
# create a dqn_core alias in sys.modules pointing at the dqn-core package.
try:
    import dqn_core  # noqa: F401
except ModuleNotFoundError:
    import importlib.util
    _spec = importlib.util.spec_from_file_location(
        "dqn_core",
        str(_repo_root / "dqn-core" / "__init__.py"),
        submodule_search_locations=[str(_repo_root / "dqn-core")],
    )
    _mod = importlib.util.module_from_spec(_spec)
    sys.modules["dqn_core"] = _mod
    _spec.loader.exec_module(_mod)

# Also add api/ itself to path so relative imports within api/ work
_api_dir = Path(__file__).parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

# Import the FastAPI app from main.py
from main import app  # noqa: E402

# Vercel ASGI handler
handler = app
