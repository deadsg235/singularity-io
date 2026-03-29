# Singularity.io Features

## 🧠 Neural Network Visualization

### Deep Q-Network System
- **Multi-layer architecture**: 4 layers (8→16→16→8 nodes)
- **Real-time visualization**: Canvas-based rendering
- **Interactive updates**: Click to update network state
- **Dynamic node values**: Nodes pulse and change based on Q-values
- **Connection mapping**: Visual representation of neural pathways

### How It Works
1. Backend generates a Deep Q-Network with configurable layers
2. Each node has a value (0-1) representing activation
3. Connections between layers show neural pathways
4. Frontend renders nodes and connections on HTML5 canvas
5. Click "Update Network" to see the network evolve

### API Integration
```javascript
GET /api/neural/network  // Get current network state
POST /api/neural/update  // Update network values
```

## 💼 Phantom Wallet Integration

### Features
- **One-click connection**: Connect Phantom wallet instantly
- **Address display**: Shows truncated wallet address
- **Status indicator**: Visual feedback for connection state
- **Auto-detection**: Detects if Phantom is installed
- **Fallback**: Redirects to Phantom download if not installed

### How to Use
1. Install [Phantom Wallet](https://phantom.app/) browser extension
2. Click "Connect Wallet" button in header
3. Approve connection in Phantom popup
4. Your wallet address appears in the button
5. Status updates to "Connected"

### Integration Code
```javascript
// Connect to Phantom
const resp = await window.solana.connect();
const publicKey = resp.publicKey.toString();
```

## 🎨 Visual Design

### Color Scheme
- **Primary**: Cyan (#00d4ff) - Neural connections, highlights
- **Background**: Dark gradient (#0a0a0a → #1a1a2e)
- **Accents**: Green (#00ff88) for success states
- **Typography**: Orbitron (headers), Inter (body)

### Responsive Design
- Desktop: Full visualization with side-by-side layout
- Tablet: Stacked sections with optimized canvas
- Mobile: Compact view with touch-friendly controls

## 🔗 Solana Integration (Planned)

### Phase 2 Features
- Transaction signing via Phantom
- SPL token interactions
- Smart contract deployment
- NFT minting capabilities
- Staking interface

## 🚀 Performance

### Optimization
- Canvas rendering: 60 FPS target
- API polling: 30-second intervals
- Lazy loading: Components load on demand
- Minimal dependencies: Vanilla JS for speed

### Scalability
- Network supports up to 1000+ nodes
- Configurable layer architecture
- Serverless backend via Vercel
- CDN-optimized static assets

## 🛠️ Customization

### Neural Network Configuration
Edit `api/neural_network.py`:
```python
# Change layer architecture
dqn = DeepQNetwork(layers=[16, 32, 32, 16])
```

### Visual Customization
Edit `web/singularity-frontend/style.css`:
```css
/* Change primary color */
--primary-color: #00d4ff;
```

## 📊 Future Enhancements

- [ ] 3D neural network visualization
- [ ] Multiple wallet support (Solflare, Slope)
- [ ] Real-time training visualization
- [ ] Node interaction (click to activate)
- [ ] Export network state as JSON
- [ ] Import pre-trained models
- [ ] WebGL acceleration
- [ ] VR/AR visualization mode
