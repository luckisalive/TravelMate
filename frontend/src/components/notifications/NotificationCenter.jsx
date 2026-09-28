import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  CreditCard,
  Calendar,
  MapPin,
  CheckCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function NotificationCenter({ onNavigateTab }) {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.unread_count);
      }
    } catch (err) {
      // Ignore background notification fetch errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000); // Polling every 25s
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.patch(`/notifications/${id}/read`);
      if (res.data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount(res.data.unread_count);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await api.patch('/notifications/read-all');
      if (res.data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.delete(`/notifications/${id}`);
      if (res.data.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setUnreadCount(res.data.unread_count);
        toast.info('Notification dismissed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      handleMarkAsRead(notif.id);
    }

    setIsOpen(false);
    if (!onNavigateTab) return;

    if (notif.type === 'booking') {
      onNavigateTab('bookings');
    } else if (notif.type === 'settlement' || notif.type === 'budget' || notif.type === 'trip' || notif.type === 'itinerary') {
      onNavigateTab('trips');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'booking':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'settlement':
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      case 'budget':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'itinerary':
        return <MapPin className="w-4 h-4 text-blue-500" />;
      case 'trip':
      default:
        return <Calendar className="w-4 h-4 text-blue-500" />;
    }
  };

  const filteredNotifications = notifications.filter((n) =>
    filter === 'unread' ? !n.is_read : true
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors focus:outline-none cursor-pointer"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute -right-16 sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm sm:max-w-none bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden transform transition-all">
          {/* Header */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 dark:text-white text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 font-bold text-xs px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2">
            <button
              onClick={() => setFilter('all')}
              className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                filter === 'unread'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No {filter === 'unread' ? 'unread ' : ''}notifications.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors relative group ${
                    !notif.is_read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                  }`}
                >
                  {/* Icon */}
                  <div className="mt-0.5 p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-xs border border-slate-100 dark:border-slate-700">
                    {getTypeIcon(notif.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pr-6">
                    <p className={`text-xs ${!notif.is_read ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'} leading-relaxed`}>
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                      {new Date(notif.created_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Unread indicator & Quick Actions */}
                  <div className="absolute right-3 top-3 flex items-center gap-1">
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 block group-hover:hidden" />
                    )}
                    <button
                      onClick={(e) => handleDelete(notif.id, e)}
                      className="hidden group-hover:flex text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Live updates for bookings, settlements, trips & budget
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
