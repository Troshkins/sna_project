# sna_project

Мессенджер с визуализацией сети общения: пользователи и комнаты — узлы графа,
связи — участие в чатах. Тёмная тема в духе Obsidian, force-directed физика,
плавные анимации.

## Стек

- backend: Node.js + Express + Socket.IO + MongoDB (Mongoose) + JWT
- frontend: React + React Router + React Flow + d3-force + framer-motion + socket.io-client

## Требования

- Node.js 18+
- npm
- MongoDB (локально или через docker)

## Как запустить

```
cd backend
npm install
npm run dev

cd ../frontend
npm install
npm start
```

Frontend поднимается на `http://localhost:3000`, backend — на `http://localhost:5000`.

## Переменные окружения

### backend/.env

```
PORT=5000
MONGO_URI=mongodb://admin:admin123@localhost:27017/chatapp?authSource=admin
JWT_SECRET=somesecretkey
FRONTEND_ORIGIN=http://localhost:3000
```

### frontend (опционально)

```
REACT_APP_API_URL=http://localhost:5000
```

## HTTP API

- `POST /api/auth/register` — регистрация
- `POST /api/auth/login` — вход, возвращает JWT
- `GET /api/auth/me` — текущий пользователь
- `GET /api/users/search?q=...` — поиск пользователей по username/email (min 2 символа)
- `GET /api/rooms` — комнаты пользователя
- `POST /api/rooms` — создать группу `{ name }`
- `POST /api/rooms/direct` — найти/создать DM `{ userId }`
- `GET /api/rooms/:id` — карточка комнаты
- `PATCH /api/rooms/:id` — переименовать группу (только создатель)
- `DELETE /api/rooms/:id` — удалить группу (только создатель)
- `GET /api/rooms/:id/members` — участники
- `POST /api/rooms/:id/members` — добавить участника `{ userId }` (только создатель)
- `DELETE /api/rooms/:id/members/:userId` — удалить участника (только создатель)
- `DELETE /api/rooms/:id/members/me` — покинуть группу
- `GET /api/rooms/:roomId/messages` — история сообщений

## Чат через Socket.IO

Создание сообщений — только через сокеты.

1. Подключиться с `auth: { token }`.
2. `join_room` → `{ roomId }`.
3. `send_message` → `{ roomId, text }`.
4. Слушать `new_message` для живого обновления.

## Frontend

- `/login`, `/register` — экраны авторизации.
- `/` — основной экран: слева список контактов, в центре граф (тащи узлы,
  колесом зумируй, клик по комнате открывает чат), справа окно чата.
- Создание диалогов и групп — через кнопки в нижней части сайдбара.
