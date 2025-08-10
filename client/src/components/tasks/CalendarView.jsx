import React, { useState, useEffect } from 'react';
import { useGetTasksForCalendarQuery } from '../../redux/slices/api/taskApiSlice';
import { TASK_TYPE, PRIOTITYSTYELS } from '../../utils';
import { useSelector } from 'react-redux';
import moment from 'moment';
import socketManager from '../../utils/socket';

const CalendarView = () => {
  const { user } = useSelector((state) => state.auth);
  const [currentDate, setCurrentDate] = useState(moment());
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // month, week, day

  const startDate = currentDate.clone().startOf(viewMode);
  const endDate = currentDate.clone().endOf(viewMode);

  const { data, isLoading, refetch } = useGetTasksForCalendarQuery({
    startDate: startDate.format('YYYY-MM-DD'),
    endDate: endDate.format('YYYY-MM-DD'),
  });

  // Refetch khi vào tab hoặc component mount
  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    const handleRealtime = () => {
      refetch();
    };
    socketManager.onTaskUpdatedGlobal(handleRealtime);
    socketManager.onTaskStageChangedGlobal(handleRealtime);
    socketManager.onTaskDeleted(handleRealtime);
    socketManager.onTaskUpdated(handleRealtime);
    socketManager.onTaskStageChanged(handleRealtime);
    socketManager.onSubtaskAddedGlobal(handleRealtime);
    socketManager.onSubtaskUpdatedGlobal(handleRealtime);
    socketManager.onSubtaskDeletedGlobal(handleRealtime);
    return () => {
      socketManager.offTaskUpdatedGlobal();
      socketManager.offTaskStageChangedGlobal();
      socketManager.offTaskDeleted();
      socketManager.offTaskUpdated();
      socketManager.offTaskStageChanged();
      socketManager.offSubtaskAddedGlobal();
      socketManager.offSubtaskUpdatedGlobal();
      socketManager.offSubtaskDeletedGlobal();
    };
  }, [refetch]);

  const navigateDate = (direction) => {
    if (direction === 'prev') {
      setCurrentDate(currentDate.clone().subtract(1, viewMode));
    } else {
      setCurrentDate(currentDate.clone().add(1, viewMode));
    }
  };

  const getDaysInMonth = () => {
    const start = currentDate.clone().startOf('month').startOf('week');
    const end = currentDate.clone().endOf('month').endOf('week');
    const days = [];
    let day = start.clone();

    while (day.isBefore(end) || day.isSame(end, 'day')) {
      days.push(day.clone());
      day.add(1, 'day');
    }

    return days;
  };

  const getTasksForDate = (date) => {
    if (!data?.tasks) return [];
    return data.tasks.filter(task => {
      const taskDate = moment(task.dueDate);
      return taskDate.isSame(date, 'day');
    });
  };

  const isToday = (date) => {
    return moment().isSame(date, 'day');
  };

  const isSelected = (date) => {
    return selectedDate && selectedDate.isSame(date, 'day');
  };

  const getTaskPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'low':
        return 'bg-green-100 border-green-300 text-green-800';
      default:
        return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  const getTaskStageColor = (stage) => {
    switch (stage) {
      case 'completed':
        return 'bg-green-500';
      case 'in progress':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            ←
          </button>
          <h2 className="text-xl font-semibold">
            {currentDate.format('MMMM YYYY')}
          </h2>
          <button
            onClick={() => navigateDate('next')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center font-semibold text-gray-600">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {getDaysInMonth().map((date, index) => {
          const tasks = getTasksForDate(date);
          const isCurrentMonth = date.month() === currentDate.month();
          
          return (
            <div
              key={index}
              onClick={() => setSelectedDate(date)}
              className={`
                min-h-32 p-2 border border-gray-200 cursor-pointer
                ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                ${isToday(date) ? 'bg-blue-50 border-blue-300' : ''}
                ${isSelected(date) ? 'ring-2 ring-blue-500' : ''}
                hover:bg-gray-50
              `}
            >
              <div className="text-sm font-medium mb-1">
                {date.format('D')}
              </div>
              
              {/* Tasks for this day */}
              <div className="space-y-1">
                {tasks.slice(0, 3).map((task) => (
                  <div
                    key={task._id}
                    className={`
                      text-xs p-1 rounded border truncate
                      ${getTaskPriorityColor(task.priority)}
                    `}
                    title={`${task.title} - ${task.stage}`}
                  >
                    <div className="flex items-center gap-1">
                      <div
                        className={`w-2 h-2 rounded-full ${getTaskStageColor(task.stage)}`}
                      />
                      {task.title}
                    </div>
                  </div>
                ))}
                {tasks.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{tasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Date Tasks */}
      {selectedDate && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-3">
            Tasks for {selectedDate.format('MMMM D, YYYY')}
          </h3>
          <div className="space-y-2">
            {getTasksForDate(selectedDate).map((task) => (
              <div
                key={task._id}
                className="bg-white p-3 rounded-lg border shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${getTaskStageColor(task.stage)}`}
                    />
                    <span className="font-medium">{task.title}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${getTaskPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                {task.team && task.team.length > 0 && (
                  <div className="text-sm text-gray-600 mt-1">
                    Assigned to: {task.team.map(member => member.name).join(', ')}
                  </div>
                )}
              </div>
            ))}
            {getTasksForDate(selectedDate).length === 0 && (
              <div className="text-gray-500 text-center py-4">
                No tasks scheduled for this date
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView; 