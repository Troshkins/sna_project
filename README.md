# SNA Chat

A real-time messenger with a twist: every chat you join becomes a node in
your personal social-network graph. Friends and groups float in a
force-directed canvas you can drag, rotate and zoom. Strangers who only
share a group with you stay anonymous — visible as faint dots, no name
exposed.

The graph is the navigation. Click a person to open the conversation,
click a group to expand its name and members, click yourself to open
Saved Messages.

## Highlights

- Force-directed layout with floating edges and a slow pseudo-3D tumble
- Dark, calm UI (palette built around `#09090B` / `#18181A` / `#009669`)
- Sidebar with contacts, group / DM tabs, search, and quick actions
- Group and direct messaging over Socket.IO with persisted history
- Right-drag rotates the graph around its geometric center
- Off-screen detection with auto-recenter after a few idle seconds
- "Saved Messages" self-chat (no extra graph node — opens from your own
  user node)
- Friends-only labels: people you don't share a DM with appear as
  unnamed dots

## Tech stack

Backend
- Node.js + Express
- Socket.IO
- MongoDB via Mongoose
- JWT auth, bcrypt password hashing

Frontend
- React + React Router
- React Flow + custom floating edges
- d3-force for the layout simulation
- framer-motion for transitions
- socket.io-client + axios

## Prerequisites

You need a working install of:

- Node.js 18 or newer (`node -v`)
- npm (`npm -v`)
- MongoDB 6+ — either a local install, MongoDB Atlas, or Docker (the
  easiest option, see below)
- Git

Verify each is on your `PATH` before continuing.

## Quick start (local development)

1. Clone the repo

   ```
   git clone https://github.com/Troshkins/sna_project.git
   cd sna_project
   ```

2. Start a MongoDB instance. The fastest way is Docker:

   ```
   docker run -d --name sna-mongo -p 27017:27017 ^
     -e MONGO_INITDB_ROOT_USERNAME=admin ^
     -e MONGO_INITDB_ROOT_PASSWORD=admin123 ^
     mongo:7
   ```

   On macOS / Linux replace `^` with `\`. If you already have a local
   MongoDB without auth, point `MONGO_URI` to it in the next step.

3. Configure backend environment. Create `backend/.env`:

   ```
   PORT=5000
   MONGO_URI=mongodb://admin:admin123@localhost:27017/chatapp?authSource=admin
   JWT_SECRET=replace-me-with-a-long-random-string
   FRONTEND_ORIGIN=http://localhost:3000
   ```

   For production, generate a real `JWT_SECRET` (e.g. `openssl rand -hex
   32`) and never commit the file.

4. (Optional) Configure frontend environment. Defaults work for local
   dev; only override when the backend runs elsewhere. Create
   `frontend/.env`:

   ```
   REACT_APP_API_URL=http://localhost:5000
   ```

5. Install dependencies and start both processes (use two terminals).

   Backend:

   ```
   cd backend
   npm install
   npm run dev
   ```

   Frontend:

   ```
   cd frontend
   npm install
   npm start
   ```

6. Open http://localhost:3000, register an account, and start chatting.

## How to use the app

- **Sidebar** — your contacts, grouped into All / Chats / Groups. The top
  card opens Saved Messages, the bottom buttons create a new DM or group.
- **Graph canvas**
  - Left-drag empty space to pan
  - Mouse wheel / pinch to zoom
  - Right-drag to rotate the graph around its visual center
  - Click a friend's node to open the DM
  - Click a stranger (anonymous dot) — nothing happens, by design
  - Click yourself to open Saved Messages
  - Click a group ring to expand the name and highlight its members
- **Chat panel** — opens on the right. Enter sends, Shift+Enter inserts
  a newline.

If the graph drifts entirely off-screen, an arrow appears below the
**Fit** button. After ~3 seconds of inactivity it auto-recenters; you
can also click Fit any time.

## HTTP API reference

All routes are prefixed with `/api`. Authenticated routes require an
`Authorization: Bearer <token>` header.

Auth
- `POST /auth/register` — `{ username, email, password }`
- `POST /auth/login` — `{ email, password }`, returns `{ token, user }`
- `GET /auth/me` — current user (auth)

Users
- `GET /users/search?q=...` — fuzzy search by username / email, min 2
  characters, max 10 results, excludes self (auth)

Rooms
- `GET /rooms` — list of rooms the current user belongs to (auth)
- `POST /rooms` — create a group, body `{ name }` (auth)
- `POST /rooms/direct` — find or create a DM, body `{ userId }`. Passing
  your own id creates the Saved Messages room (auth)
- `GET /rooms/:id` — fetch a room (auth, member)
- `PATCH /rooms/:id` — rename a group (auth, creator only)
- `DELETE /rooms/:id` — delete a group (auth, creator only)
- `GET /rooms/:id/members` — list members (auth, member)
- `POST /rooms/:id/members` — add member, body `{ userId }` (auth,
  creator only)
- `DELETE /rooms/:id/members/:userId` — remove member (auth, creator
  only)
- `DELETE /rooms/:id/members/me` — leave the group (auth, member, not
  creator)

Messages
- `GET /rooms/:roomId/messages` — full history (auth, member). New
  messages are sent only over Socket.IO.

## Real-time chat (Socket.IO)

Connect with `auth: { token }`. Three events:

- Client → server `join_room` `{ roomId }`
- Client → server `send_message` `{ roomId, text }` (text is trimmed,
  max 1000 chars)
- Server → client `new_message` — broadcast to everyone in the room

Server also emits `socket_error` for invalid payloads. Removed members
are evicted from the live broadcast as soon as the room mutation
completes.

## Project layout

```
backend/
  src/
    app.js              Express app
    server.js           HTTP + Socket.IO bootstrap
    config/             env, db connection
    controllers/        auth, rooms, users, messages
    middlewares/        auth, error handler
    models/             User, Room, Message
    routes/             auth, users, rooms, messages
    socket/             Socket.IO server with auth + handlers
    utils/              cors, async helpers, validation
frontend/
  src/
    api/                axios instance, shared socket
    components/
      Auth/             Login, Register
      Chat/             ChatWindow
      Graph/            GraphView, force layout, floating edge, nodes
      Layout/           MainLayout
      Sidebar/          Sidebar, modals, avatar
    context/            AuthContext, RoomsContext
    styles/             single global stylesheet
    utils/              avatar palette, room helpers
```

## Troubleshooting

- **Network Error on register/login** — backend isn't reachable. Check
  that `npm run dev` shows `MongoDB connected` and `Server running on
  port 5000`, and that http://localhost:5000/api/health returns `{
  status: "ok" }`.
- **`MongoServerError: bad auth`** — your `MONGO_URI` doesn't match the
  MongoDB credentials. With the Docker command above use
  `admin:admin123` and `?authSource=admin`.
- **`Definition for rule 'react-hooks/exhaustive-deps' was not found`**
  — outdated lint config, fixed in this repo. Pull latest and rerun
  `npm start`.
- **`ResizeObserver loop completed with undelivered notifications`** —
  harmless warning suppressed in `index.js`. If it still pops up in your
  console, ignore it.
- **Graph never recenters** — make sure you're on the latest version;
  the watchdog kicks in only when *every* node leaves the viewport.

## License

MIT
