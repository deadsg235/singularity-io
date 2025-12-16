# Singularity.io Desktop Application

A futuristic Python GUI application for Solana blockchain interaction with Python-Rust bridge integration.

## Features

🎨 **Futuristic UI**
- Sleek blue and black theme
- Matrix-style falling code background
- Orbitron font for cyber aesthetic

🔗 **Blockchain Integration**
- Python-Rust bridge for Solana operations
- Wallet connection and management
- SPL token operations
- Real-time balance checking

🤖 **ULTIMA Terminal**
- Integrated AI chat terminal
- 5-layer DQN reasoning simulation
- Command processing system

## Installation

### Prerequisites
- Python 3.8+
- Rust (optional, for full functionality)

### Setup
```bash
# Install Python dependencies
pip install -r requirements-desktop.txt

# Build Rust bridge (optional)
cargo build --release

# Run application
python run.py
```

## Quick Start
```bash
python run.py
```

## Architecture

```
singularity-io/
├── main.py              # Main GUI application
├── wallet_bridge.py     # Python-Rust bridge
├── src/main.rs          # Rust Solana operations
├── run.py              # Application launcher
└── requirements-desktop.txt
```

## GUI Components

- **Matrix Background**: Animated falling code effect
- **Navigation Panel**: Access to all features
- **ULTIMA Terminal**: AI chat interface
- **Dashboard**: Portfolio overview
- **Wallet Integration**: Connect/disconnect functionality

## Python-Rust Bridge

The application uses a Python-Rust bridge for high-performance Solana operations:

- **Python GUI**: User interface and application logic
- **Rust Binary**: Blockchain operations and wallet management
- **JSON Communication**: Data exchange between Python and Rust

## Usage

1. Launch the application with `python run.py`
2. Connect your wallet using the "Connect Wallet" button
3. Navigate through different features using the side panel
4. Use ULTIMA terminal for AI assistance
5. Monitor your portfolio in the dashboard

## Development

The application is designed as a desktop replacement for the web version, providing:
- Native performance
- Offline capabilities
- Enhanced security
- Direct system integration