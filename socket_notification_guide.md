# Socket.io Notification Documentation

This document describes the WebSocket events and connection steps for the notification system.

## 1. Connection Details
- **Base URL**: `http://localhost:3000` (or your backend production URL)
- **Protocol**: Socket.io (not raw WebSockets)
- **CORS**: Origin `*` is currently allowed.

## 2. Setup Steps (Client Side)

### Step 1: Connect & Join Room
Every user must join a "Private Room" named after their `userId` to receive targeted notifications.

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connected:", socket.id);
  
  // CRITICAL: Join your own user room
  // Replace 'USER_ID' with the actual ID from your JWT/Profile
  socket.emit("joinRoom", "USER_ID");
});
```

## 3. Real-time Events (Listening)

### Event: `notification`
Received when a new notification is created for the user.
- **Payload**: `Notification` object (id, title, message, type, metadata, etc.)

```javascript
socket.on("notification", (data) => {
  console.log("New notification:", data);
  // Show toast or alert here
});
```

### Event: `unread-count`
Received whenever the user's unread count changes (new notification or marking as read).
- **Payload**: `{ count: number }`

```javascript
socket.on("unread-count", (data) => {
  console.log("Updated unread count:", data.count);
  // Update the red dot on the bell icon
});
```

## 4. Postman Connection Guide

1.  **Open Postman** (v10+).
2.  Click **New** -> **WebSocket**.
3.  Choose **Socket.io** (IMPORTANT: Do not select raw WebSocket).
4.  URL: `http://localhost:3000`.
5.  Click **Connect**.
6.  Go to the **Events** tab:
    *   Add a listener for `notification`.
    *   Add a listener for `unread-count`.
7.  Go to the **Message** tab:
    *   Select **Emit**.
    *   Event name: `joinRoom`.
    *   Message (JSON/String): `YOUR_USER_ID_HERE`.
    *   Click **Send**.
8.  Now, try creating an event or triggering a notification via Swagger/API. You will see the events arrive in Postman.

## 5. API Reference (HTTP)

While real-time events handle the "Push", these REST APIs manage the state:

- `GET /notifications/my`: Get all my notifications (includes `unreadCount` in meta).
- `PATCH /notifications/my/:id/read`: Mark a specific notification as read.
- `PATCH /notifications/my/read-all`: Mark all notifications as read.

---
*Last updated: 2026-05-09*
