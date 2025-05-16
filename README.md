# Strategy Game - _name pending_

A strategy simulation game with a procedurally generated world where you build mines and farms to manage resources.

## Overview

This is an isometric strategy game built with Three.js and TypeScript where you:
- Manage resources (Minerals and Food)
- Build mines on mountains to generate minerals
- Build farms on grass to produce food
- Balance resource production and upkeep costs

## Technologies Used

- **Three.js** - 3D graphics engine
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and development server
- **Troika** - Text rendering in 3D space
- **WebGL** - Hardware-accelerated graphics

## Features

- Procedurally generated terrain with mountains, water, grass, and sand
- Isometric camera with WASD movement and QE rotation controls
- Resource management system
- Building placement system
- Custom shader support for visual effects
- HUD overlay with resource counters
- FPS counter and debug information (toggle with '=' key)

## Development

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd strategy_game
```

2. Install dependencies:
```bash
npm install
```

### Running the Development Server

Start the development server:
```bash
npm run dev
```

The game will be available at `http://localhost:5173`

### Building for Production

Build the project:
```bash
npm run build
```

The built files will be in the `dist` directory.

## Controls

- **WASD** - Move camera
- **QE** - Rotate camera
- **Arrow Keys** - Alternative camera movement
- **Space/Shift** - Zoom in/out
- **Left Mouse Button** - Place buildings
- **Escape** - Exit game
- **=** - Toggle FPS counter

## Game Mechanics

### Resources
- **Minerals** - Used to construct buildings
- **Food** - Required for mine upkeep

### Buildings
- **Mine**
  - Must be built on mountains
  - Costs 20 minerals to build
  - Produces 10 minerals
  - Requires 5 food for upkeep
- **Farm**
  - Must be built on grass
  - Costs 5 minerals to build
  - Produces 1 food
  - No upkeep cost

### Project Structure

- `src/` - Source code
  - `components/` - Game components (buildings, UI)
  - `libraries/` - Core game systems
  - `shaders/` - Custom WebGL shaders
- `public/` - Static assets and 3D models
- `types/` - TypeScript type definitions

## License

[Your chosen license]

## Contributing

[Your contribution guidelines]