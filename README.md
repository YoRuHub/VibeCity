# VibeCity

**Interactive 3D Visualization with Hexagonal Grid and Tile Placement**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-green.svg)](https://github.com/yourusername/VibeCity)
[![Three.js](https://img.shields.io/badge/three.js-0.170.0-blue.svg)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-purple.svg)](https://vitejs.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/yourusername/VibeCity/pulls)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/yourusername/VibeCity)

## Overview

VibeCity is an interactive 3D hexagonal grid system built with Three.js. Users can manipulate time in real-time and place various types of 3D tiles on the hexagonal grid.

### Key Features

- **Hexagonal Grid**: Interactive hexagonal grid with ripple effects
- **3D Tile Placement**: Place 4 types of tiles (dirt, water, grass, stone)
- **Time Control**: Manipulate time in real-time and observe sun movement
- **Modern UI**: Stylish game-like interface
- **Lightweight Design**: Optimized rendering performance

## Tech Stack

### Core Technologies
- **Three.js** (v0.170.0) - 3D graphics rendering
- **TypeScript** (v5.6) - Type-safe development
- **Vite** (v6.0) - Fast build tool

### Architecture
- Modular design with clear separation of concerns
- Event-driven architecture
- Memory optimization with object pooling

## Installation

### Requirements
- Node.js 18.x or later
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/VibeCity.git
cd VibeCity

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

## Usage

### Basic Controls

#### Mouse Controls
- **Left Click**: Place tiles in tile placement mode
- **Drag**: Rotate camera
- **Wheel**: Zoom in/out

#### Time Control
- **Play/Pause Button**: Control time flow
- **Time Slider**: Drag to set specific time
- Sun and moon move according to time, changing the sky color

#### Tile Placement
1. Select a tile from the palette at the bottom of the screen
2. Click on the grid to place the tile
3. Select different tiles to place additional ones

### Tile Types

| Type | Color | Purpose |
|------|-------|---------|
| **Dirt** | Brown | Basic terrain |
| **Water** | Light Blue | Water areas |
| **Grass** | Green | Vegetation areas |
| **Stone** | Gray | Rocky terrain |

## Project Structure

```
VibeCity/
├── src/
│   ├── core/
│   │   └── Scene.ts          # Main scene management
│   ├── hex/
│   │   ├── HexGrid.ts        # Hexagonal grid system
│   │   ├── TileRenderer.ts   # 3D tile rendering
│   │   └── TileTypes.ts      # Tile definitions
│   ├── time/
│   │   └── TimeManager.ts    # Time simulation
│   ├── ui/
│   │   ├── TilePalette.ts    # Tile selection UI
│   │   └── TimeController.ts # Time control UI
│   ├── effects/
│   │   └── WaveEffect.ts     # Ripple effects
│   ├── audio/
│   │   └── AudioManager.ts   # Sound management
│   ├── utils/
│   │   └── EventEmitter.ts   # Event management
│   ├── main.ts               # Application entry point
│   └── style.css             # Global styles
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Development

### Build

```bash
# Production build
npm run build

# Preview
npm run preview
```

### Code Quality

```bash
# Type check
npm run type-check

# Format
npm run format
```

## Architecture Details

For more technical information, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## License

MIT License - See [LICENSE](./LICENSE) for details

## Usage Policy

This project is provided **as-is** without active maintenance.  
Feel free to fork, modify, and use it as you wish.

You may use it for commercial or non-commercial purposes as long as you comply with the license.

## Credits

- **Three.js** - 3D graphics library
- **Vite** - Build tool

---

VibeCity Project - Free to use
