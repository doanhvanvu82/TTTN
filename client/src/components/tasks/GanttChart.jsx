import React, { useState, useEffect, useMemo } from 'react';
import { useGetTasksForCalendarQuery } from '../../redux/slices/api/taskApiSlice';
import { useSelector } from 'react-redux';
import moment from 'moment';
import { TASK_TYPE } from '../../utils';
import socketManager from '../../utils/socket';

const GanttChart = () => {
  const { user } = useSelector((state) => state.auth);
  const [currentDate, setCurrentDate] = useState(moment());
  const [viewMode, setViewMode] = useState('month');
  const [selectedTask, setSelectedTask] = useState(null);

  const viewStartDate = currentDate.clone().startOf(viewMode);
  const viewEndDate = currentDate.clone().endOf(viewMode);

  const apiQueryRange = useMemo(() => {
    const start = currentDate.clone().subtract(1, 'month').startOf('month');
    const end = currentDate.clone().add(1, 'month').endOf('month');
    return {
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
    };
  }, [currentDate]);

  const { data, isLoading, refetch } = useGetTasksForCalendarQuery(apiQueryRange);

  // Refetch khi vào tab hoặc component mount
  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    const handleRealtime = () => {
      // In a real app, you might invalidate the RTK Query cache here
      // For example: dispatch(api.util.invalidateTags(['Tasks']));
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


  const visibleTasks = useMemo(() => {
    if (!data?.tasks) return [];
    return data.tasks.filter(task => {
      if (!task.startDate || !task.dueDate) return false;
      const taskStart = moment(task.startDate);
      const taskEnd = moment(task.dueDate);
      return taskStart.isSameOrBefore(viewEndDate) && taskEnd.isSameOrAfter(viewStartDate);
    });
  }, [data?.tasks, viewStartDate, viewEndDate]);


  const navigateDate = (direction) => {
    const newDate = currentDate.clone();
    if (direction === 'prev') {
      newDate.subtract(1, viewMode);
    } else {
      newDate.add(1, viewMode);
    }
    setCurrentDate(newDate);
  };

  const getDaysInView = () => {
    const days = [];
    let day = viewStartDate.clone();
    while (day.isSameOrBefore(viewEndDate, 'day')) {
      days.push(day.clone());
      day.add(1, 'day');
    }
    return days;
  };

  const getTaskPosition = (task) => {
    const taskStart = moment(task.startDate);
    const taskEnd = moment(task.dueDate);
    const continuesBefore = taskStart.isBefore(viewStartDate);
    const continuesAfter = taskEnd.isAfter(viewEndDate);
    const visibleStart = moment.max(taskStart, viewStartDate);
    const visibleEnd = moment.min(taskEnd, viewEndDate);
    const totalDaysInView = viewEndDate.diff(viewStartDate, 'days') + 1;
    const startOffset = visibleStart.diff(viewStartDate, 'days');
    let durationInView = visibleEnd.diff(visibleStart, 'days') + 1;
    if (durationInView <= 0) durationInView = 1;
    return {
      left: `${(startOffset / totalDaysInView) * 100}%`,
      width: `${(durationInView / totalDaysInView) * 100}%`,
      continuesBefore,
      continuesAfter,
    };
  };

  const getTaskColor = (task) => {
    const now = moment().utcOffset(7);
    const due = moment(task.dueDate).utcOffset(7);
    if (task.stage === 'completed' && task.completedAt && moment(task.completedAt).utcOffset(7).isAfter(due)) {
      return 'bg-orange-500'; // Completed late
    }
    if (task.stage !== 'completed' && now.isAfter(due)) {
      return 'bg-red-500'; // Overdue
    }
    if (task.stage === 'completed') return 'bg-green-500';
    if (task.stage === 'in progress') return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getTaskDependencies = (task) => {
    if (!task?.dependencies || task.dependencies.length === 0) return [];
    return task.dependencies.map(dep => ({
      id: dep._id,
      title: dep.title,
      stage: dep.stage,
    }));
  };

  const days = getDaysInView();

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigateDate('prev')} className="p-2 rounded-lg hover:bg-gray-100"> ← </button>
          <h2 className="text-xl font-semibold">
            Gantt Chart - {currentDate.format('MMMM YYYY')}
          </h2>
          <button onClick={() => navigateDate('next')} className="p-2 rounded-lg hover:bg-gray-100"> → </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('month')} className={`px-3 py-1 rounded ${viewMode === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
            Month
          </button>
          <button onClick={() => setViewMode('week')} className={`px-3 py-1 rounded ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
            Week
          </button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="overflow-x-auto gantt-scroll-container border border-gray-200 rounded-lg">
        <div style={{ minWidth: `${256 + days.length * 50}px` }}>
          {/* Timeline Header */}
          <div className="flex sticky top-0 z-20 bg-gray-50">
            <div className="w-64 flex-shrink-0 p-3 font-semibold border-r border-b border-gray-200 sticky left-0 z-30 bg-gray-50">
              Tasks
            </div>
            <div className="flex flex-1">
              {days.map((day) => (
                <div key={day.format('YYYY-MM-DD')} className={`flex-1 p-2 text-center text-sm border-r border-b border-gray-200 ${day.isSame(moment(), 'day') ? 'bg-blue-100' : ''}`}>
                  <div className="font-medium">{day.format('D')}</div>
                  <div className="text-gray-500">{day.format('ddd')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Task Rows */}
          <div>
            {visibleTasks.map((task) => {
              const position = getTaskPosition(task);
              return (
                <div key={task._id} className="flex border-b border-gray-100 min-h-[60px]">
                  {/* Task Info */}
                  <div className="w-64 flex-shrink-0 p-3 border-r border-gray-200 sticky left-0 z-10 bg-white">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded-full ${getTaskColor(task)}`} />
                      <span className="font-medium text-sm truncate">{task.title}</span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {task.team?.map(member => member.name).join(', ')}
                    </div>
                  </div>

                  {/* Timeline Bar */}
                  <div className="flex-1 relative">
                      {position && (
                          <div
                              className={`absolute top-2 bottom-2 rounded cursor-pointer transition-all hover:opacity-80 flex items-center ${getTaskColor(task)} ${position.continuesBefore ? 'rounded-l-none' : ''} ${position.continuesAfter ? 'rounded-r-none' : ''}`}
                              style={{ left: position.left, width: position.width }}
                              onClick={() => setSelectedTask(task._id)}
                          >
                              <div className="px-2 text-white text-xs truncate">
                                  {task.title}
                              </div>
                          </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task Details Modal and Legend */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            {(() => {
              const task = data?.tasks?.find(t => t._id === selectedTask);
              if (!task) return null;

              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Task Details</h3>
                    <button onClick={() => setSelectedTask(null)} className="text-gray-500 hover:text-gray-700"> ✕ </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium">Title:</span>
                      <p className="text-gray-700">{task.title}</p>
                    </div>
                    <div>
                      <span className="font-medium">Stage:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${getTaskColor(task)} text-white`}>
                        {task.stage}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Priority:</span>
                      <span className="ml-2 capitalize">{task.priority}</span>
                    </div>
                    {task.startDate && (
                      <div>
                        <span className="font-medium">Start Date:</span>
                        <span className="ml-2">{moment(task.startDate).format('MMM D, YYYY')}</span>
                      </div>
                    )}
                    {task.dueDate && (
                      <div>
                        <span className="font-medium">Due Date:</span>
                        <span className={`ml-2 ${(() => {
                          const now = moment().utcOffset(7);
                          const due = moment(task.dueDate).utcOffset(7);
                          if (task.stage !== 'completed' && now.isAfter(due)) return 'text-red-600';
                          if (task.stage === 'completed' && task.completedAt && moment(task.completedAt).utcOffset(7).isAfter(due)) return 'text-orange-600';
                          return '';
                        })()}`}>
                          {moment(task.dueDate).utcOffset(7).format('MMM D, YYYY')}
                          {task.stage !== 'completed' && moment().utcOffset(7).isAfter(moment(task.dueDate).utcOffset(7)) && ' (Overdue)'}
                          {task.stage === 'completed' && task.completedAt && moment(task.completedAt).utcOffset(7).isAfter(moment(task.dueDate).utcOffset(7)) && ' (Completed Late)'}
                        </span>
                      </div>
                    )}
                    {task.team && task.team.length > 0 && (
                      <div>
                        <span className="font-medium">Team:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {task.team.map((member) => (
                            <span key={member._id} className="inline-block bg-gray-100 px-2 py-1 rounded text-sm">
                              {member.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {getTaskDependencies(task).length > 0 && (
                      <div>
                        <span className="font-medium">Dependencies:</span>
                        <div className="mt-1 space-y-1">
                          {getTaskDependencies(task).map((dep) => (
                            <div key={dep._id} className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${TASK_TYPE[dep.stage] || 'bg-gray-400'}`} />
                              <span className="text-sm">{dep.title}</span>
                              <span className="text-xs text-gray-500">({dep.stage})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold mb-2">Legend</h4>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm">Todo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm">Overdue</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;