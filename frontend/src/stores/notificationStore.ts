/**
 * Simple notification store for displaying inline messages.
 */
import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
  details?: string;
  timestamp: number;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (type: Notification['type'], message: string, details?: string) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  
  addNotification: (type, message, details) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notification: Notification = {
      id,
      type,
      message,
      details,
      timestamp: Date.now(),
    };
    
    set((state) => ({
      notifications: [...state.notifications, notification],
    }));
    
    // Auto-remove after 10 seconds for non-errors
    if (type !== 'error') {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, 10000);
    }
  },
  
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
    
  clearAll: () => set({ notifications: [] }),
}));

