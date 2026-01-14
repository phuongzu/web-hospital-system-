// src/context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';

import io from 'socket.io-client';
type SocketType = ReturnType<typeof io>;

interface SocketContextType {
  socket: SocketType | null;
  isConnected: boolean;
  reconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
}


export const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<SocketType | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Lấy base URL từ environment hoặc config
  const getSocketUrl = (): string => {
    // Nếu bạn đang dùng API_BASE_URL từ file api.ts
    const apiUrl = process.env.REACT_APP_API_URL || window.location.origin;
    // Loại bỏ http:// hoặc https:// nếu cần
    const url = new URL(apiUrl);
    // Nếu API server và client cùng origin, dùng origin
    // Nếu khác, bạn có thể cần proxy hoặc CORS
    return apiUrl.replace(/^http/, 'ws');
  };

  // Khởi tạo socket connection
  const initializeSocket = () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      
      if (!token) {
        console.warn('⚠️ No authentication token found, delaying socket connection');
        return null;
      }

      const socketUrl = getSocketUrl();
      console.log(`🔌 Connecting to WebSocket at: ${socketUrl}`);

      const newSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        query: {
          token: token,
          role: 'doctor',
          doctorId: localStorage.getItem('doctorId')
        },
        auth: {
          token: token
        }
      });

      // Socket event handlers
      newSocket.on('connect', () => {
        console.log('✅ WebSocket connected successfully');
        setIsConnected(true);
        setReconnectAttempts(0);
        
        // Emit authentication event
        newSocket.emit('authenticate', {
          token: token,
          userType: 'doctor',
          doctorId: localStorage.getItem('doctorId')
        });
      });

      newSocket.on('connect_error', (error: any) => {
        console.error('❌ WebSocket connection error:', error.message);
        setIsConnected(false);
        
        // Auto-reconnect với exponential backoff
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
          console.log(`⏳ Reconnecting in ${delay}ms...`);
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            newSocket.connect();
          }, delay);
        }
      });

      newSocket.on('disconnect', (reason: any) => {
        console.log(`🔌 WebSocket disconnected: ${reason}`);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          // Server forced disconnect, try to reconnect
          newSocket.connect();
        }
      });

      newSocket.on('reconnect', (attemptNumber: any) => {
        console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
        setIsConnected(true);
        setReconnectAttempts(0);
      });

      newSocket.on('reconnect_attempt', (attemptNumber: any) => {
        console.log(`🔄 Reconnection attempt ${attemptNumber}`);
      });

      newSocket.on('reconnect_error', (error: any) => {
        console.error('❌ Reconnection error:', error);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('❌ Failed to reconnect after maximum attempts');
      });

      // Authentication success
      newSocket.on('authenticated', (data: any) => {
        console.log('🔐 Socket authenticated:', data);
      });

      // Authentication failed
      newSocket.on('unauthorized', (error: any) => {
        console.error('❌ Socket authentication failed:', error);
        // Optionally disconnect or show login prompt
        if (error.message.includes('invalid token')) {
          // Token expired, redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      });

      // Ping/Pong để kiểm tra connection
      newSocket.on('ping', () => {
        newSocket.emit('pong');
      });

      setSocket(newSocket);
      return newSocket;
    } catch (error) {
      console.error('❌ Failed to initialize socket:', error);
      return null;
    }
  };

  // Kết nối socket
  const connect = () => {
    if (socket && socket.connected) {
      console.log('Socket already connected');
      return;
    }

    const newSocket = initializeSocket();
    if (newSocket) {
      newSocket.connect();
    }
  };

  // Ngắt kết nối socket
  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setIsConnected(false);
      console.log('Socket disconnected manually');
    }
  };

  // Cleanup function
  const cleanup = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socket) {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('reconnect');
      socket.off('authenticated');
      socket.off('unauthorized');
      socket.disconnect();
    }
  };

  // Effect để quản lý socket lifecycle
  useEffect(() => {
    // Chỉ kết nối khi có token
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    
    if (token) {
      connect();
    } else {
      console.log('No token available, skipping socket connection');
    }

    // Reconnect khi token thay đổi
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'accessToken') {
        if (e.newValue) {
          console.log('Token updated, reconnecting socket...');
          cleanup();
          connect();
        } else {
          console.log('Token removed, disconnecting socket...');
          disconnect();
        }
      }
    };

    // Reconnect khi tab trở lại visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected) {
        console.log('Tab became visible, attempting to reconnect...');
        connect();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cleanup();
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Effect để xử lý online/offline
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network online, reconnecting socket...');
      if (!isConnected) {
        connect();
      }
    };

    const handleOffline = () => {
      console.log('Network offline');
      setIsConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isConnected]);

  // Utility function để emit events
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const emitEvent = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: Socket not connected`);
    }
  };

  // Utility function để listen events
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const listenEvent = (event: string, callback: (data: any) => void) => {
    if (socket) {
      socket.on(event, callback);
      
      // Return cleanup function
      return () => {
        socket.off(event, callback);
      };
    }
  };

  const contextValue: SocketContextType = {
    socket,
    isConnected,
    reconnectAttempts,
    connect,
    disconnect,
  };


  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};


// Custom hook để sử dụng socket context
export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};


// Hook đơn giản để lấy socket instance
export const useSocketInstance = (): SocketType | null => {
  const { socket } = useSocket();
  return socket;
};


// Hook để kiểm tra connection status
export const useSocketStatus = (): { isConnected: boolean; reconnectAttempts: number } => {
  const { isConnected, reconnectAttempts } = useSocket();
  return { isConnected, reconnectAttempts };
};

// No default export, use named export only