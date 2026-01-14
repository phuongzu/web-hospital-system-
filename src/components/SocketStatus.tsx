// src/components/SocketStatus.tsx
import React from 'react';
import { useSocketStatus } from '../context/SocketContext';

const SocketStatus: React.FC = () => {
  const { isConnected, reconnectAttempts } = useSocketStatus();
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm ${
        isConnected 
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      }`}>
        <div className={`w-2 h-2 rounded-full animate-pulse ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <span>
          {isConnected ? 'Real-time Connected' : 'Disconnected'}
        </span>
        {!isConnected && reconnectAttempts > 0 && (
          <span className="text-xs opacity-75">
            (Retry {reconnectAttempts}/5)
          </span>
        )}
      </div>
    </div>
  );
};