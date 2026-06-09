# RPG Forum

A full-stack real-time RPG forum with a 3D world map, character system, travel, encounters, quests, and area-based forums.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router 6 |
| 3D rendering | Three.js 0.184, React Three Fiber 8, Drei 9 |
| Backend | Node.js, Express 5 |
| Database | MongoDB via Mongoose 9 |
| Real-time | Socket.io 4 |
| Auth | JWT + bcryptjs |

## Project Structure

```
rpg-forum/
├── server.js              # Entry point: Express + Socket.io setup
├── src/
│   ├── config/            # Database connection
│   ├── controllers/       # Route handlers (auth, character, posts, quests, travel, world, admin)
│   ├── middleware/         # JWT auth middleware (protect, requireRole)
│   ├── models/            # Mongoose schemas (User, Character, Post, Comment, Quest, Location, Region, SubLocation, Travel, ChatMessage)
│   ├── routes/            # Express routers
│   ├── seed/              # worldSeed.js — populates 10 regions/locations on startup
│   └── socket/
│       ├── chat.js        # Global real-time chat namespace
│       └── map.js         # /map namespace: player positions + encounter system
└── client/
    └── src/
        ├── App.jsx                        # Routes + auth guards
        ├── context/AuthContext.jsx        # Global auth state (login, logout, character CRUD)
        ├── lib/
        │   ├── api.js                     # Fetch wrapper with Bearer token auth
        │   └── utils.js                   # Shared utilities (toId)
        ├── hooks/
        │   ├── useMapSocket.js            # Real-time player positions + encounters
        │   └── useTravel.js               # Travel state management
        ├── components/
        │   ├── layout/                    # BgScene, LoadingScreen, Topbar
        │   ├── map3d/                     # 3D map components (see below)
        │   ├── travel/TravelPanel.jsx     # In-area travel UI
        │   └── GlobalChat.jsx             # Real-time global chat
        └── pages/                         # One component per route
```

### 3D Map Components (`client/src/components/map3d/`)

| File | Purpose |
|------|---------|
| `terrainNoise.js` | fbm noise, continent mask, `getTerrainHeight()` |
| `Terrain.jsx` | 520×520 mesh (240 segs, 58k vertices) with per-pixel procedural ShaderMaterial |
| `Rivers.jsx` | Gradient-descent river paths + animated ribbon meshes |
| `Lakes.jsx` | Inland basin detection + water planes |
| `MapScene.jsx` | Scene root: terrain, rivers, lakes, pins, player markers, fog, controls |
| `CrystalPin.jsx` | Location pin markers |
| `PlayerMarker.jsx` | Player avatar + travel interpolation, frozen during encounters |
| `OtherPlayerDot.jsx` | Other players (lerped positions) |
| `FogPlane.jsx` | Fog of war shader (currently hidden, code preserved) |
| `EncounterOverlay.jsx` | PvP encounter UI (greet / flee / attack) |

## Setup

```bash
# 1. Install server dependencies
npm install

# 2. Install client dependencies
cd client && npm install && cd ..

# 3. Create .env (see .env.example)
cp .env.example .env

# 4. Start dev servers (server + client concurrently)
npm run dev
```

## Environment Variables

See `.env.example`. Required:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | `development` or `production` |
| `CLIENT_URL` | Frontend origin for CORS (production only) |

## API Routes

All routes are prefixed with `/api`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Create account |
| POST | `/auth/login` | — | Login, returns JWT |
| GET | `/auth/me` | ✓ | Current user |
| GET | `/characters/me` | ✓ | Active character |
| POST | `/characters` | ✓ | Create character |
| PUT | `/characters/setup` | ✓ | Set class/race/avatar |
| GET | `/world/locations` | ✓ | All locations with coords |
| GET | `/world/areas` | ✓ | Regions + sub-locations |
| POST | `/travel/start` | ✓ | Begin travel to location |
| POST | `/travel/cancel` | ✓ | Cancel active travel |
| GET | `/quests` | ✓ | Available/active quests |
| GET/POST | `/posts` | ✓ | Forum posts |
| GET/POST | `/posts/:id/comments` | ✓ | Post comments |
| GET | `/admin/users` | admin | All users |

## Socket.io Events

### Global chat (root namespace)

| Event | Direction | Payload |
|-------|-----------|---------|
| `chat:history` | server→client | Last 50 messages |
| `chat:message` | client→server | `{ text }` |
| `chat:message` | server→client | Full message object |

### Map (`/map` namespace)

| Event | Direction | Payload |
|-------|-----------|---------|
| `map:join` | client→server | `{ token }` |
| `map:position` | client→server | `{ mapX, mapY }` |
| `map:positions` | server→client | `[{ charId, name, mapX, mapY }]` |
| `map:encounter` | server→client | `{ opponent: { charId, name, class } }` |
| `map:encounter:respond` | client→server | `{ action: 'greet'|'flee'|'attack' }` |
| `map:encounter:result` | server→client | `{ outcome, message }` |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start server + client in watch mode |
| `npm run server` | Server only (with `--watch`) |
| `npm start` | Production server |
| `npm run build` | Build client for production |
