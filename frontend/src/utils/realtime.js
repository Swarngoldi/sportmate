import { io } from 'socket.io-client';

let socket;

export function connectRealtime(token) {
  if (!token) return null;

  if (socket?.connected) return socket;

  socket = io({
    auth: { token },
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });

  socket.on('notification:new', (payload) => {
    window.dispatchEvent(
      new CustomEvent('sportmate:notification-new', {
        detail: payload,
      })
    );
  });

  socket.on('notifications:unread-count', (payload) => {
    window.dispatchEvent(
      new CustomEvent('sportmate:notifications-count', {
        detail: payload,
      })
    );
  });

  socket.on('notification-job:update', (payload) => {
    window.dispatchEvent(
      new CustomEvent('sportmate:notification-job-update', {
        detail: payload,
      })
    );
  });

  socket.on('connect_error', () => {
    window.dispatchEvent(new Event('sportmate:realtime-offline'));
  });

  return socket;
}

export function disconnectRealtime() {
  if (!socket) return;

  socket.disconnect();
  socket = null;
}