# Visual Guide - Singularity.io

## 🎨 What You'll See

### Landing Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  SINGULARITY.io              [Connect Wallet]           │
│  Solana Blockchain Integration Platform                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│         Building the Future of Solana                   │
│    Integrating SolFunMeme technology to solve...        │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │🔗 Block- │  │💡 SolFun │  │💰 New    │  │🧠 Neural│ │
│  │  chain   │  │  Meme    │  │  Economy │  │ Network │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
├─────────────────────────────────────────────────────────┤
│                                                          │
│         Deep Q-Network Visualization                    │
│  ┌────────────────────────────────────────────────┐    │
│  │                                                 │    │
│  │    ●─────●─────●                               │    │
│  │    │     │     │                               │    │
│  │    ●─────●─────●─────●                         │    │
│  │    │     │     │     │                         │    │
│  │    ●─────●─────●─────●                         │    │
│  │    │     │     │                               │    │
│  │    ●─────●─────●                               │    │
│  │                                                 │    │
│  └────────────────────────────────────────────────┘    │
│  [Update Network]              Nodes: 48               │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                  System Status                          │
│  API: Online      Network: mainnet-beta                │
│  Phase: Phase 1   Wallet: Connected                    │
└─────────────────────────────────────────────────────────┘
```

## 🧠 Neural Network Visualization

### What You See

**Nodes (Circles)**
- Size: Represents activation value (0-1)
- Color: Cyan gradient based on value
  - Dim: Low activation (darker blue)
  - Bright: High activation (bright cyan)
- Glow: Pulsing effect around active nodes

**Connections (Lines)**
- Color: Semi-transparent cyan (#00d4ff)
- Opacity: 0.2 (subtle, not overwhelming)
- Pattern: Connects each layer to the next

**Layout**
- 4 Layers: Input → Hidden1 → Hidden2 → Output
- Vertical spacing: Evenly distributed
- Horizontal: Random within layer (organic look)

### Example Network State

```
Layer 0 (Input - 8 nodes)
    ●  ●  ●  ●  ●  ●  ●  ●
    │╲ │╲ │╲ │╲ │╲ │╲ │╲ │╲
    │ ╲│ ╲│ ╲│ ╲│ ╲│ ╲│ ╲│ ╲
Layer 1 (Hidden - 16 nodes)
    ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●
    │╲ │╲ │╲ │╲ │╲ │╲ │╲ │╲ │╲ │╲ │╲ │╲ │╲ │╲ │╲ │╲
    │ ╲│ ╲│ ╲│ ╲│ ╲│ ╲│ ╲│ ╲│ ╲│ ╲│ ╲│ ╲│ ╲│ ╲│ ╲│ ╲
Layer 2 (Hidden - 16 nodes)
    ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●
    │╲ │╲ │╲ │╲ │╲ │╲ │╲ │╲
    │ ╲│ ╲│ ╲│ ╲│ ╲│ ╲│ ╲│ ╲
Layer 3 (Output - 8 nodes)
    ●  ●  ●  ●  ●  ●  ●  ●
```

## 💼 Wallet Connection Flow

### Before Connection
```
┌──────────────────────┐
│  [Connect Wallet]    │  ← Blue gradient button
└──────────────────────┘
Status: Not Connected
```

### During Connection
```
┌──────────────────────┐
│  Phantom Popup       │
│  ┌────────────────┐  │
│  │ Connect to     │  │
│  │ Singularity.io?│  │
│  │                │  │
│  │ [Approve]      │  │
│  │ [Reject]       │  │
│  └────────────────┘  │
└──────────────────────┘
```

### After Connection
```
┌──────────────────────┐
│  [8xK2...mN4p]       │  ← Green gradient button
└──────────────────────┘
Status: Connected ✓
```

## 🎨 Color Scheme

### Primary Colors
```
Cyan:       #00d4ff  ████  Main accent
Blue:       #0088ff  ████  Secondary
Green:      #00ff88  ████  Success states
Dark:       #0a0a0a  ████  Background start
Navy:       #1a1a2e  ████  Background end
Light Gray: #e0e0e0  ████  Text
Gray:       #888888  ████  Muted text
```

### Gradients
```
Background:  #0a0a0a → #1a1a2e (135deg)
Button:      #00d4ff → #0088ff (135deg)
Connected:   #00ff88 → #00cc66 (135deg)
Node Glow:   Radial from center, cyan to transparent
```

## 📱 Responsive Breakpoints

### Desktop (>768px)
```
┌─────────────────────────────────────┐
│  Header: Horizontal layout          │
│  Features: 4 columns                │
│  Canvas: 400px height               │
│  Status: 2 columns                  │
└─────────────────────────────────────┘
```

### Mobile (<768px)
```
┌───────────────┐
│  Header:      │
│  Stacked      │
│               │
│  Features:    │
│  1 column     │
│               │
│  Canvas:      │
│  300px height │
│               │
│  Status:      │
│  1 column     │
└───────────────┘
```

## 🎭 Animations

### Hover Effects
```
Feature Cards:
  Normal:  opacity: 0.05, border: 0.3
  Hover:   opacity: 0.1,  border: 1.0, translateY(-5px)

Buttons:
  Normal:  shadow: 15px
  Hover:   shadow: 20px, translateY(-2px)
```

### Node Pulsing
```
Value changes: 0.1 per update
Smooth transition: Linear interpolation
Update rate: On-demand (button click)
```

## 🖼️ Canvas Rendering

### Drawing Order
1. Clear canvas
2. Draw connections (background layer)
3. Draw node glows (middle layer)
4. Draw nodes (foreground layer)
5. Draw node borders (top layer)

### Performance
- FPS: 60 target
- Redraw: Only on update
- Optimization: RequestAnimationFrame

## 📊 Status Indicators

### API Status
```
● Online    (Green)
● Offline   (Red)
● Checking  (Gray)
```

### Wallet Status
```
● Connected      (Green)
● Not Connected  (Gray)
● Failed         (Red)
```

## 🎯 Interactive Elements

### Clickable
- Connect Wallet button
- Update Network button
- Feature cards (hover effect)

### Non-Interactive
- Canvas (view only, no click events)
- Status displays
- Logo and text

## 🌟 Visual Hierarchy

### Primary Focus
1. Neural Network Canvas (largest, center)
2. Connect Wallet Button (top-right, bright)
3. Logo (top-left, glowing)

### Secondary Focus
1. Feature Cards (grid layout)
2. System Status (bottom section)
3. Hero Text (center, large)

### Tertiary
1. Tagline (subtle)
2. Footer (minimal)
3. Node count (small text)

## 💡 Design Philosophy

**Futuristic**: Cyan glows, dark backgrounds, tech fonts
**Minimal**: Clean layout, lots of whitespace
**Interactive**: Hover effects, clickable elements
**Responsive**: Works on all screen sizes
**Fast**: Lightweight, no heavy frameworks

---

This visual guide helps you understand what the interface looks like and how it behaves. For implementation details, see FEATURES.md.
