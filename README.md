# sna_project

Requirements:

node.js
npm
mongodb
docker

## Chat transport contract

Message creation is intentionally socket-only.

- Use `GET /api/rooms/:roomId/messages` to load room history over HTTP.
- Use the `join_room` Socket.IO event before sending or receiving live room messages.
- Use the `send_message` Socket.IO event to create and broadcast a new message.
- Listen for the `new_message` Socket.IO event to receive live updates.

There is no HTTP endpoint for creating messages. This backend keeps the split explicit:

- HTTP is for room and message history reads.
- Socket.IO is for live message creation and broadcast.

## Frontend usage rules

For a room chat screen, the frontend should follow this order:

1. Fetch room history with `GET /api/rooms/:roomId/messages`.
2. Connect the socket with the authenticated token.
3. Join the room with `join_room`.
4. Send new chat messages with `send_message`.
5. Update the UI from `new_message` events.
