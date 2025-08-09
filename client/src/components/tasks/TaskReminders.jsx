import React, { useState, useEffect } from 'react';
import { useAddReminderMutation, useDeleteReminderMutation } from '../../redux/slices/api/taskApiSlice';
import { useSelector } from 'react-redux';
import moment from 'moment';
import { toast } from 'sonner';
import ConfirmationDialog from '../ConfirmationDialog';
import socketManager from '../../utils/socket';

const TaskReminders = ({ task, onReminderAdded }) => {
  const { user } = useSelector((state) => state.auth);
  const [showAddForm, setShowAddForm] = useState(false);
  const [reminderType, setReminderType] = useState('in-app');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState(null);

  const [addReminder, { isLoading: addingReminder }] = useAddReminderMutation();
  const [deleteReminder, { isLoading: deletingReminder }] = useDeleteReminderMutation();

  useEffect(() => {
    if (!task?._id) return;
    // Join task room
    socketManager.joinTask(task._id);
    // Lắng nghe event reminder realtime
    const handleRealtime = (data) => {
      if (data.taskId === task._id && onReminderAdded) {
        onReminderAdded();
      }
    };
    socketManager.onReminderAdded(handleRealtime);
    socketManager.onReminderDeleted(handleRealtime);
    socketManager.onReminderSent(handleRealtime);
    // Cleanup
    return () => {
      socketManager.leaveTask(task._id);
      socketManager.offReminderAdded();
      socketManager.offReminderDeleted();
      socketManager.offReminderSent();
    };
  }, [task?._id, onReminderAdded]);

  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!reminderTime) {
      toast.error('Please select a reminder time');
      return;
    }

    try {
      await addReminder({
        taskId: task._id,
        type: reminderType,
        time: reminderTime,
        message: reminderMessage || `Reminder for task: ${task.title}`,
      }).unwrap();

      setShowAddForm(false);
      setReminderTime('');
      setReminderMessage('');
      toast.success('Reminder added successfully');
      if (onReminderAdded) onReminderAdded();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to add reminder');
    }
  };

  const handleDeleteReminder = async () => {
    if (!reminderToDelete) return;
    try {
      await deleteReminder({
        taskId: task._id,
        reminderId: reminderToDelete,
      }).unwrap();
      toast.success('Reminder deleted successfully');
      if (onReminderAdded) onReminderAdded();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to delete reminder');
    } finally {
      setConfirmOpen(false);
      setReminderToDelete(null);
    }
  };

  const getReminderStatus = (reminder) => {
    const now = moment();
    const reminderMoment = moment(reminder.time);
    
    if (reminder.sent) {
      return { status: 'sent', text: 'Sent', color: 'text-green-600 bg-green-100' };
    } else if (reminderMoment.isBefore(now)) {
      return { status: 'overdue', text: 'Overdue', color: 'text-red-600 bg-red-100' };
    } else {
      return { status: 'pending', text: 'Pending', color: 'text-yellow-600 bg-yellow-100' };
    }
  };

  const isProjectManager = user.isProjectManager;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Reminders</h3>
        {isProjectManager && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showAddForm ? 'Cancel' : 'Add Reminder'}
          </button>
        )}
      </div>

      {/* Add Reminder Form */}
      {showAddForm && isProjectManager && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <form onSubmit={handleAddReminder} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reminder Type
                </label>
                <select
                  value={reminderType}
                  onChange={(e) => setReminderType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="in-app">In-App Notification</option>
                  <option value="email">Email</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reminder Time
                </label>
                <input
                  type="datetime-local"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  min={moment().format('YYYY-MM-DDTHH:mm')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message (Optional)
              </label>
              <textarea
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                placeholder={`Reminder for task: ${task.title}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addingReminder}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {addingReminder ? 'Adding...' : 'Add Reminder'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reminders List */}
      <div className="space-y-3">
        {task.reminders && task.reminders.length > 0 ? (
          task.reminders.map((reminder) => {
            const status = getReminderStatus(reminder);
            return (
              <div key={reminder._id} className="bg-white p-4 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.text}
                      </span>
                      <span className="text-sm text-gray-500">
                        {reminder.type === 'email' ? '📧 Email' : '🔔 In-App'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-1">
                      {reminder.message}
                    </p>
                    
                    <p className="text-xs text-gray-500">
                      Scheduled for: {moment(reminder.time).format('MMM D, YYYY [at] h:mm A')}
                    </p>
                  </div>
                  
                  {isProjectManager && (
                    <>
                      <button
                        onClick={() => { setReminderToDelete(reminder._id); setConfirmOpen(true); }}
                        disabled={deletingReminder}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {deletingReminder ? 'Deleting...' : 'Delete'}
                      </button>
                      <ConfirmationDialog
                        open={confirmOpen}
                        setOpen={setConfirmOpen}
                        msg="Are you sure you want to delete this reminder?"
                        onClick={handleDeleteReminder}
                        type="delete"
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-6 text-gray-500">
            No reminders set for this task
          </div>
        )}
      </div>

      {/* Quick Reminder Suggestions */}
      {isProjectManager && !showAddForm && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Quick Reminders</h4>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '1 hour before', time: moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm') },
              { label: '1 day before', time: moment().add(1, 'day').format('YYYY-MM-DDTHH:mm') },
              { label: '1 week before', time: moment().add(1, 'week').format('YYYY-MM-DDTHH:mm') },
            ].map((suggestion) => (
              <button
                key={suggestion.label}
                onClick={() => {
                  setShowAddForm(true);
                  setReminderTime(suggestion.time);
                  setReminderMessage(`Reminder: ${task.title} is due soon`);
                }}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskReminders; 