# Onboarding Guide — singularity-io

Welcome to the kagenti ecosystem! This guide gets you from clone to running service.

## Quick Start

```bash
cd /home/mdupont/git/github.com/deadsg235/singularity-io
make install
make dev
```

## Prerequisites

### Option A: Nix (recommended)
```bash
nix develop   # drops you into a shell with all deps
make dev
```

### Option B: Manual
```bash
pip install -r requirements.txt
python -m uvicorn api.main:app --reload
```

## Project Structure

- `Makefile` — build/dev/test/clean targets
- `flake.nix` — reproducible Nix dev environment
- Service port: **9109**

## Testing

```bash
python -m pytest
```

## kagenti Integration

This repo is registered as a kagenti agent in the `deadsg` namespace.

| Field | Value |
|-------|-------|
| Agent name | `deadsg-singularity-io` |
| Namespace | `deadsg` |
| Type | `python` |
| Port | `9109` |
| Health | `http://127.0.0.1:9109/` |

### systemd

```bash
# Install the service
cp systemd/deadsg-singularity-io.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now deadsg-singularity-io

# Check status
systemctl --user status deadsg-singularity-io
curl http://127.0.0.1:9109/
```

## Monster Group Orbifold

Your repo maps to orbifold coordinate **(24, 49, 30)** in the 196,883-cell Monster torus (71 × 59 × 47).

- Conformal weight: h = 1.8068
- Bott class: B7
- Eigenspace: Clock

This coordinate is used by the FRACTRAN navigator and CFT analysis tools.

## erdfa Shards

Source files are content-hashed to DA51 CBOR shards for the erdfa content-addressed layer.

```bash
make erdfa   # regenerate shard index
```

## Contributing

1. Fork this repo
2. `nix develop` for reproducible environment
3. Make changes, `make test`
4. PR back to `deadsg235/singularity-io`

## Links

- [kagenti ecosystem](https://github.com/meta-introspector/kagenti)
- [notebooklm-tools](https://github.com/meta-introspector/notebooklm-tools)
- [FRACTRAN breeder](https://github.com/meta-introspector/fractran-breed-rs)
