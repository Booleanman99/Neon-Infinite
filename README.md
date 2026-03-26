# NEON DRIFT

Infinite cyberpunk city driving game built with Three.js.

![Neon Drift](https://img.shields.io/badge/NEON-DRIFT-00ffff?style=for-the-badge&labelColor=040410)

## Features

- **Infinite procedural city** — neon-lit buildings with window grids, signs, billboards, and storefronts regenerate endlessly
- **Crisp car models** — multi-layer body, windshields, DRL headlights, neon underglow, taillights, wheel glow rings
- **6-lane traffic** — oncoming and same-direction vehicles with full collision detection
- **Autopilot mode** — AI drives center-lane and dodges traffic automatically
- **Weather system** — clear, rain (particle system), fog, storm
- **Time of day** — night, dawn, sunset, day with distinct lighting
- **Traffic density slider** — from empty roads to gridlock
- **Slow Roads-inspired UI** — minimal, clean HUD with speed, score, and speed bar

## Controls

| Key | Action |
|-----|--------|
| W / ↑ | Accelerate |
| S / ↓ | Brake |
| A / ← | Steer left |
| D / → | Steer right |
| SHIFT / SPACE | Boost |

## Deploy to Vercel

```bash
npm install
npm run build
```

Or just connect this repo to [Vercel](https://vercel.com) and it auto-deploys.

## Dev

```bash
npm install
npm run dev
```

## Tech

- [Three.js](https://threejs.org/) — 3D rendering
- [Vite](https://vitejs.dev/) — build tool
- Vanilla JS — no framework overhead
