import { io, Socket } from 'socket.io-client';
import { Config } from '@/constants/config';
import { getAccessToken } from '@/stores/auth-store';

/**
 * Socket.IO client singleton for real-time messaging.
 *
 * Manages a single WebSocket connection with automatic token-based
 * authentication. The socket is created lazily on first use and
 * can be explicitly disconnected when the user logs out.
 */

let socket: Socket | null = null;

/**
 * Get (or create) the shared Socket.IO instance.
 * Connects with the current user's access token for authentication.
 */
export async function getSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await getAccessToken();

  socket = io(Config.wsUrl, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: Config.wsReconnectBaseMs,
    reconnectionDelayMax: Config.wsReconnectMaxMs,
  });

  socket.connect();
  return socket;
}

/**
 * Disconnect and dispose of the socket instance.
 * Should be called on logout or when the app is fully backgrounded.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/**
 * Check if the socket is currently connected.
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
