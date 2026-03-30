"""
index.py — Vercel serverless entry point for Singularity.io API.

Vercel looks for `handler` or the ASGI app at module level.
All routes are defined in main.py — this file just bootstraps the path
so dqn_core (dqn-core/) is importable, then re-exports the app.
"""

import sys
import os
from pathlib import Path

# Make dqn-core importable as `dqn_core` without torch being loaded at startup.
# The lazy __getattr__ in dqn-core/__init__.py defers torch import until first use.
_repo_root = Path(__file__).parent.parent
for _p in [str(_repo_root), str(_repo_root / "dqn-core"), str(Path(__file__).parent.parent / "api")]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

if "dqn_core" not in sys.modules:
    try:
        import importlib.util as _ilu
        _init = _repo_root / "dqn-core" / "__init__.py"
        if _init.exists():
            _spec = _ilu.spec_from_file_location(
                "dqn_core", str(_init),
                submodule_search_locations=[str(_repo_root / "dqn-core")],
            )
            _mod = _ilu.module_from_spec(_spec)
            sys.modules["dqn_core"] = _mod
            # Intentionally NOT calling exec_module — lazy __getattr__ handles it
    except Exception:
        pass

# Import the FastAPI app from main.py
from main import app  # noqa: E402

# Vercel ASGI handler
handler = app
