// src/context/RealTimeDataContext.tsx
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useSocket } from './SocketProvider';

export type RealTimeData = {
  notifications: any[];
  messages: any[];
  updateNotifications: (notifications: any[]) => void;
  addNotification: (notification: any) => void;
  updateNotification: (id: string, updates: any) => void;
  markAllNotificationsRead: () => void;
};

const RealTimeDataContext = createContext<RealTimeData | undefined>(undefined);

export const RealTimeDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  // Cập nhật toàn bộ notifications
  const updateNotifications = useCallback((newNotifications: any[]) => {
    setNotifications(newNotifications);
  }, []);

  // Thêm notification mới
  const addNotification = useCallback((notification: any) => {
    setNotifications(prev => {
      // Kiểm tra xem notification đã tồn tại chưa (tránh duplicate)
      const exists = prev.some(n => n._id === notification._id);
      if (exists) return prev;
      
      // Thêm mới vào đầu mảng
      return [{
        ...notification,
        createdAt: notification.createdAt || new Date(),
        isRead: false
      }, ...prev];
    });
  }, []);

  // Cập nhật một notification cụ thể
  const updateNotification = useCallback((id: string, updates: any) => {
    setNotifications(prev => 
      prev.map(n => 
        n._id === id ? { ...n, ...updates } : n
      )
    );
  }, []);

  // Đánh dấu tất cả đã đọc
  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, isRead: true }))
    );
  }, []);

  // Lắng nghe socket events
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('Socket not connected, skipping real-time setup');
      return;
    }

    console.log('🔌 Setting up real-time listeners...');

    // Notification events
    const handleNotification = (data: any) => {
      console.log('🔔 Real-time notification received:', data);
      addNotification(data);
    };

    // Chat events
    const handleChatMessage = (data: any) => {
      console.log('💬 Real-time chat message:', data);
      setMessages(prev => [data, ...prev]);
    };

    // Appointment events
    const handleAppointmentUpdate = (data: any) => {
      console.log('📅 Real-time appointment update:', data);
      // Có thể dispatch action để cập nhật appointments trong state
      // Hoặc refresh appointments từ API
    };

    // Đăng ký event listeners
    socket.on('notification:receive', handleNotification);
    socket.on('chat:receive', handleChatMessage);
    socket.on('appointment:update', handleAppointmentUpdate);
    socket.on('appointment:new', handleAppointmentUpdate);

    // Cleanup
    return () => {
      socket.off('notification:receive', handleNotification);
      socket.off('chat:receive', handleChatMessage);
      socket.off('appointment:update', handleAppointmentUpdate);
      socket.off('appointment:new', handleAppointmentUpdate);
    };
  }, [socket, isConnected, addNotification]);

  const contextValue: RealTimeData = {
    notifications,
    messages,
    updateNotifications,
    addNotification,
    updateNotification,
    markAllNotificationsRead
  };

  return (
    <RealTimeDataContext.Provider value={contextValue}>
      {children}
    </RealTimeDataContext.Provider>
  );
};

export const useRealTimeData = () => {
  const context = useContext(RealTimeDataContext);
  if (!context) {
    throw new Error('useRealTimeData must be used within RealTimeDataProvider');
  }
  return context;
};