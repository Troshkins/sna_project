import { io } from 'socket.io-client';
import { API_BASE_URL } from './axios';

let socketInstance = null;

export const getSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
  }

  socketInstance = io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
