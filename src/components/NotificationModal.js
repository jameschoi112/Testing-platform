import React from 'react';
import { X } from 'lucide-react';
import { markAllNotificationsAsRead, markNotificationAsRead } from '../firebase';
import { useNavigate } from 'react-router-dom';

const NotificationModal = ({ isOpen, onClose, notifications, userId }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead(userId);
  };

  const handleNotificationClick = (notification) => {
    markNotificationAsRead(notification.id, userId);
    if (notification.testId) {
      navigate(`/test/${notification.testId}`);
    }
    onClose();
  };

  const unreadNotifications = notifications.filter(n => !n.readBy.includes(userId));

  return (
    <div
      className="fixed top-16 right-6 w-80 max-w-sm bg-white dark:bg-cool-gray-800 rounded-lg shadow-xl border dark:border-cool-gray-700 z-[100]"
      onClick={(e) => e.stopPropagation()}
    >
        <div className="flex justify-between items-center p-4 border-b dark:border-cool-gray-700">
          <h3 className="font-bold text-lg text-gray-800 dark:text-white">알림</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-cool-gray-600">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-10">알림이 없습니다.</p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b dark:border-cool-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-cool-gray-700 ${
                  !notification.readBy.includes(userId) ? 'bg-sky-50 dark:bg-sky-900/20' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <p className={`font-semibold text-sm ${!notification.readBy.includes(userId) ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>{notification.title}</p>
                <p className={`text-xs ${!notification.readBy.includes(userId) ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>{notification.message}</p>
                <p className="text-right text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {new Date(notification.createdAt.seconds * 1000).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>

        {unreadNotifications.length > 0 && (
          <div className="p-2 border-t dark:border-cool-gray-700">
            <button
              onClick={handleMarkAllAsRead}
              className="w-full text-center text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              모든 알림 읽기
            </button>
          </div>
        )}
    </div>
  );
};

export default NotificationModal;