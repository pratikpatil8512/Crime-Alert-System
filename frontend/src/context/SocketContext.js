import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_BASE_URL } from '../utils/api';
import { getToken, getUserId, getUserRole } from '../utils/auth';

const SocketContext = createContext({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = getToken();
    const userId = getUserId();
    const role = getUserRole();

    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return undefined;
    }

    const nextAuth = { userId, role };

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_BASE_URL, {
        transports: ['websocket', 'polling'],
        autoConnect: false,
        reconnection: true,
        auth: nextAuth,
      });
      setSocket(socketRef.current);
    } else {
      socketRef.current.auth = nextAuth;
    }

    const activeSocket = socketRef.current;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    activeSocket.on('connect', handleConnect);
    activeSocket.on('disconnect', handleDisconnect);

    if (!activeSocket.connected) {
      activeSocket.connect();
    } else {
      setIsConnected(true);
    }

    return () => {
      activeSocket.off('connect', handleConnect);
      activeSocket.off('disconnect', handleDisconnect);
    };
  }, []);

  const value = useMemo(() => ({ socket, isConnected }), [socket, isConnected]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}

export function useSocketEvent(eventName, handler) {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket || !eventName || !handlerRef.current) return undefined;

    const listener = (...args) => handlerRef.current?.(...args);
    socket.on(eventName, listener);

    return () => {
      socket.off(eventName, listener);
    };
  }, [socket, eventName]);
}
