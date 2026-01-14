import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from 'react';
import io from 'socket.io-client';

/* =======================
   TYPES
======================= */

type SocketType = ReturnType<typeof io>;

interface SocketContextType {
  socket: SocketType | null;
  isConnected: boolean;
  connectionError: string | null;
}

/* =======================
   CONTEXT
======================= */

const SocketContext = createContext<SocketContextType | undefined>(undefined);

/* =======================
   PROVIDER
======================= */

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<SocketType | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const socketRef = useRef<SocketType | null>(null);

  /* =======================
     INIT SOCKET
  ======================= */

  const initializeSocket = () => {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken');

    if (!token) {
      console.log('⚠️ No token found, skipping socket connection');
      return;
    }

    const SOCKET_SERVER_URL =
      process.env.REACT_APP_SOCKET_SERVER_URL ||
      'http://localhost:3000';

    console.log('🔌 Connecting to Socket.IO:', SOCKET_SERVER_URL);

    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],
      auth: {
        token,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;

    /* =======================
       EVENTS
    ======================= */

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on('connect_error', (err: Error) => {
      console.error('❌ Socket connect error:', err.message);
      setIsConnected(false);
      setConnectionError(err.message);
    });

    newSocket.on('disconnect', (reason: string) => {
      console.warn('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    // === Real-time events ===
    newSocket.on('notification:new', (data: any) => {
      console.log('🔔 Notification:', data);
    });

    newSocket.on('chat:receive', (data: any) => {
      console.log('💬 Chat message:', data);
    });

    newSocket.on('appointment:update', (data: any) => {
      console.log('📅 Appointment update:', data);
    });

    setSocket(newSocket);
  };

  /* =======================
     EFFECTS
  ======================= */

  useEffect(() => {
    initializeSocket();

    // Token change (login / logout in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'accessToken') {
        console.log('🔄 Token changed, reconnecting socket...');
        socketRef.current?.disconnect();
        initializeSocket();
      }
    };

    const handleOnline = () => {
      console.log('🌐 Network online');
      socketRef.current?.connect();
    };

    const handleOffline = () => {
      console.log('🌐 Network offline');
      setIsConnected(false);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      console.log('🧹 Cleaning up socket');
      socketRef.current?.disconnect();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        connectionError,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

/* =======================
   HOOK
======================= */

export const useSocket = (): SocketContextType => {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return ctx;
};

export default SocketContext;
