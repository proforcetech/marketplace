import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from './auth';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

/**
 * Get or create a singleton Socket.IO connection.
 * Authenticates using the current access token.
 */
export function getSocket(): Socket {
  if (socket?.connected) return socket;

  const token = getAccessToken();

  socket = io(SOCKET_URL, {
    path: '/ws',
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  socket.on('connect_error', (err) => {
    console.error('[socket] connection error:', err.message);
  });

  return socket;
}

/**
 * Disconnect and clean up the socket instance.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
