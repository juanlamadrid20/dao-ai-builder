/**
 * Inline notification bar component for displaying messages.
 */
import { X, AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';

const iconMap = {
  error: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

const colorMap = {
  error: 'bg-red-500/10 border-red-500/30 text-red-400',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

export default function NotificationBar() {
  const { notifications, removeNotification } = useNotificationStore();
  
  if (notifications.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {notifications.map((notification) => {
        const Icon = iconMap[notification.type];
        const colorClass = colorMap[notification.type];
        
        return (
          <div
            key={notification.id}
            className={`${colorClass} border rounded-lg p-4 shadow-lg backdrop-blur-sm animate-in slide-in-from-right duration-300`}
          >
            <div className="flex items-start gap-3">
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{notification.message}</p>
                {notification.details && (
                  <p className="text-sm opacity-80 mt-1 whitespace-pre-wrap">
                    {notification.details}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 p-1 hover:opacity-70 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

