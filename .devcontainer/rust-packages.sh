#!/bin/bash

set -e  # Exit on error

echo "[INFO] Step 1: Installing sccache..."
cargo install sccache
echo "[INFO] Step 1 completed."

echo "[INFO] Step 2: Configuring Cargo with sccache and mold..."
cat <<EOF > /usr/local/cargo/config.toml
[build]
rustc-wrapper = "/usr/local/cargo/bin/sccache"

[target.'cfg(target_os = "linux")']
rustflags = ["-C", "link-arg=-fuse-ld=mold"]
EOF
echo "[INFO] Cargo config written to /usr/local/cargo/config.toml"
echo "[INFO] Step 2 completed."

echo "[INFO] Step 3: Installing additional Rust tools (cargo-binstall, dioxus-cli, cargo-edit, bat)..."
cargo install cargo-binstall
cargo binstall dioxus-cli cargo-edit bat -y
echo "[INFO] Step 3 completed."

echo "[INFO] All steps completed successfully."
