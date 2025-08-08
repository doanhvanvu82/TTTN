import React, { useState, useEffect, useRef } from 'react';
import { useGetNewNotificationsQuery, useMarkNotificationAsReadMutation, useMarkAllNotificationsAsReadMutation, useDeleteNotificationMutation, useDeleteAllNotificationsMutation } from '../redux/slices/api/userApiSlice';
import { useSelector } from 'react-redux';
import moment from 'moment';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ConfirmationDialog from './ConfirmationDialog';
import socketManager from '../utils/socket';

const NotificationPanel = ({ isOpen, onClose }) => {
  const { user } = useSelector((state) => state.auth);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const panelRef = useRef();
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useGetNewNotificationsQuery({
    page,
    limit: 20,
    unreadOnly,
  });

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [deleteAllNotifications] = useDeleteAllNotificationsMutation();

  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, page, unreadOnly]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event) {
      // Không đóng panel nếu click vào modal hoặc dialog
      if (event.target.closest('[role="dialog"]') || event.target.closest('.modal')) {
        return;
      }
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!user?._id) return;
    // Lắng nghe các event realtime notification
    const handleRealtime = (data) => {
      if (data.userId === user._id) {
        refetch();
      }
    };
    socketManager.onNotificationNew(handleRealtime);
    socketManager.onNotificationDeleted(handleRealtime);
    socketManager.onNotificationRead(handleRealtime);
    // Cleanup
    return () => {
      socketManager.offNotificationNew();
      socketManager.offNotificationDeleted();
      socketManager.offNotificationRead();
    };
  }, [user?._id, refetch]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId).unwrap();
      toast.success('Notification marked as read');
      refetch();
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead().unwrap();
      toast.success('All notifications marked as read successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    setNotificationToDelete(notificationId);
    setConfirmDeleteOpen(true);
  };

  const confirmDeleteNotification = async () => {
    if (!notificationToDelete) return;
    
    try {
      await deleteNotification(notificationToDelete).unwrap();
      toast.success('Notification deleted successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to delete notification');
    } finally {
      setConfirmDeleteOpen(false);
      setNotificationToDelete(null);
    }
  };

  const handleDeleteAllNotifications = async () => {
    setConfirmDeleteAllOpen(true);
  };

  const confirmDeleteAllNotifications = async () => {
    try {
      const result = await deleteAllNotifications().unwrap();
      toast.success(result.message);
      refetch();
    } catch (error) {
      toast.error('Failed to delete all notifications');
    } finally {
      setConfirmDeleteAllOpen(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await markAsRead(notification._id).unwrap();
      }
      onClose();
      const taskId = typeof notification.task === 'object' ? notification.task._id : notification.task;
      if (notification.type === 'mention') {
        navigate(`/task/${taskId}#comments`);
      } else if (notification.type === 'reminder') {
        navigate(`/task/${taskId}#reminders`);
      } else if (taskId) {
        navigate(`/task/${taskId}`);
      }
    } catch (error) {
      toast.error('Failed to open notification');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task_assigned':
        return '📋';
      case 'task_completed':
        return '✅';
      case 'task_due_soon':
        return '⏰';
      case 'task_overdue':
        return '⚠️';
      case 'mention':
        return '👤';
      case 'reminder':
        return '🔔';
      case 'dependency_completed':
        return '🔗';
      case 'comment_added':
        return '💬';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'task_assigned':
        return 'bg-blue-100 text-blue-800';
      case 'task_completed':
        return 'bg-green-100 text-green-800';
      case 'task_due_soon':
        return 'bg-yellow-100 text-yellow-800';
      case 'task_overdue':
        return 'bg-red-100 text-red-800';
      case 'mention':
        return 'bg-purple-100 text-purple-800';
      case 'reminder':
        return 'bg-orange-100 text-orange-800';
      case 'dependency_completed':
        return 'bg-indigo-100 text-indigo-800';
      case 'comment_added':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div ref={panelRef} className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Notifications</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Mark all read
              </button>
              <button
                onClick={handleDeleteAllNotifications}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Delete all
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Unread only</span>
              </label>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : data?.notifications && data.notifications.length > 0 ? (
              <div className="space-y-1">
                {data.notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getNotificationColor(notification.type)}`}>
                            {notification.type.replace('_', ' ')}
                          </span>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                        
                        <h4 className="font-medium text-gray-900 mb-1">
                          {notification.title}
                        </h4>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {moment(notification.createdAt).fromNow()}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {!notification.isRead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification._id);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Mark read
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotification(notification._id);
                              }}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {unreadOnly ? 'No unread notifications' : 'No notifications'}
              </div>
            )}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                
                <span className="text-sm text-gray-600">
                  Page {page} of {data.totalPages}
                </span>
                
                <button
                  onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                  disabled={page === data.totalPages}
                  className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmationDialog
        open={confirmDeleteOpen}
        setOpen={setConfirmDeleteOpen}
        msg="Are you sure you want to delete this notification?"
        onClick={confirmDeleteNotification}
        type="delete"
      />
      <ConfirmationDialog
        open={confirmDeleteAllOpen}
        setOpen={setConfirmDeleteAllOpen}
        msg="Are you sure you want to delete all notifications? This action cannot be undone."
        onClick={confirmDeleteAllNotifications}
        type="delete"
      />
    </>
  );
};

export default NotificationPanel;
