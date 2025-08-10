import clsx from "clsx";
import moment from "moment";
import React, { useState } from "react";
import { FaBug, FaSpinner, FaTasks, FaThumbsUp, FaUser } from "react-icons/fa";
import { GrInProgress } from "react-icons/gr";
import {
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdKeyboardDoubleArrowUp,
  MdOutlineDoneAll,
  MdOutlineMessage,
  MdTaskAlt,
  MdComment,
  MdNotifications,
} from "react-icons/md";
import { RxActivityLog } from "react-icons/rx";
import { useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button, Loading, Tabs } from "../components";
import { TaskColor } from "../components/tasks";
import TaskComments from "../components/tasks/TaskComments";
import TaskReminders from "../components/tasks/TaskReminders";
import {
  useChangeSubTaskStatusMutation,
  useGetSingleTaskQuery,
  usePostTaskActivityMutation,
} from "../redux/slices/api/taskApiSlice";
import {
  PRIOTITYSTYELS,
  TASK_TYPE,
  getCompletedSubTasks,
  getInitials,
} from "../utils";
import socketManager from '../utils/socket';

const ICONS = {
  high: <MdKeyboardDoubleArrowUp />,
  medium: <MdKeyboardArrowUp />,
  low: <MdKeyboardArrowDown />,
};

const bgColor = {
  high: "bg-red-200",
  medium: "bg-yellow-200",
  low: "bg-blue-200",
};

const TABS = [
  { title: "Task Detail", icon: <FaTasks /> },
  { title: "Activities / Timeline", icon: <RxActivityLog /> },
  { title: "Comments", icon: <MdComment /> },
  { title: "Reminders", icon: <MdNotifications /> },
];

const TASKTYPEICON = {
  commented: (
    <div className='w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white'>
      <MdOutlineMessage />,
    </div>
  ),
  started: (
    <div className='w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white'>
      <FaThumbsUp size={20} />
    </div>
  ),
  assigned: (
    <div className='w-6 h-6 flex items-center justify-center rounded-full bg-gray-500 text-white'>
      <FaUser size={14} />
    </div>
  ),
  bug: (
    <div className='text-red-600'>
      <FaBug size={24} />
    </div>
  ),
  completed: (
    <div className='w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white'>
      <MdOutlineDoneAll size={24} />
    </div>
  ),
  "in progress": (
    <div className='w-8 h-8 flex items-center justify-center rounded-full bg-violet-600 text-white'>
      <GrInProgress size={16} />
    </div>
  ),
};

const act_types = [
  "Started",
  "Completed",
  "In Progress",
  "Commented",
  "Bug",
  "Assigned",
];

const Activities = ({ activity, id, refetch }) => {
  const [selected, setSelected] = useState("Started");
  const [text, setText] = useState("");
  const [postActivity, { isLoading }] = usePostTaskActivityMutation();
  const handleSubmit = async () => {
    try {
      const data = {
        type: selected?.toLowerCase(),
        activity: text,
      };
      const res = await postActivity({
        data,
        id,
      }).unwrap();
      setText("");
      toast.success(res?.message || "Activity added successfully.");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };
  const Card = ({ item }) => {
    return (
      <div className={`flex space-x-4`}>
        <div className='flex flex-col items-center flex-shrink-0'>
          <div className='w-10 h-10 flex items-center justify-center'>
            {TASKTYPEICON[item?.type]}
          </div>
          <div className='h-full flex items-center'>
            <div className='w-0.5 bg-gray-300 h-full'></div>
          </div>
        </div>
        <div className='flex flex-col gap-y-1 mb-8'>
          <p className='font-semibold'>{item?.by?.name}</p>
          <div className='text-gray-500 space-x-2'>
            <span className='capitalize'>{item?.type}</span>
            <span className='text-sm'>{moment(item?.date).fromNow()}</span>
          </div>
          <div className='text-gray-700'>{item?.activity}</div>
        </div>
      </div>
    );
  };
  return (
    <div className='w-full flex gap-10 2xl:gap-20 min-h-screen px-10 py-8 bg-white dark:bg-[#232136] shadow-xl rounded-2xl justify-between overflow-y-auto'>
      <div className='w-full md:w-1/2'>
        <h4 className='text-indigo-700 dark:text-indigo-300 font-bold text-lg mb-5'>Activities</h4>
        <div className='w-full space-y-0'>
          {activity?.map((item, index) => (
            <Card
              key={item.id}
              item={item}
              isConnected={index < activity?.length - 1}
            />
          ))}
        </div>
      </div>
      <div className='w-full md:w-1/3'>
        <h4 className='text-indigo-700 dark:text-indigo-300 font-bold text-lg mb-5'>Add Activity</h4>
        <div className='w-full flex flex-wrap gap-5'>
          {act_types.map((item, index) => (
            <div key={item} className='flex gap-2 items-center'>
              <input
                type='checkbox'
                className='w-4 h-4 accent-indigo-500'
                checked={selected === item ? true : false}
                onChange={(e) => setSelected(item)}
              />
              <p>{item}</p>
            </div>
          ))}
          <textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Type your activity here...'
            className='bg-white dark:bg-[#18192b] w-full mt-6 border border-indigo-300 dark:border-indigo-700 outline-none p-4 rounded-xl focus:ring-2 ring-indigo-500 text-indigo-900 dark:text-white'
          ></textarea>
          {isLoading ? (
            <Loading />
          ) : (
            <Button
              type='button'
              label='Submit'
              onClick={handleSubmit}
              className='bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-xl px-6 py-2 font-semibold shadow hover:from-indigo-500 hover:to-blue-600 transition-all duration-200 mt-2'
            />
          )}
        </div>
      </div>
    </div>
  );
};

const TaskDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const { data, isLoading, refetch } = useGetSingleTaskQuery(id);
  const [subTaskAction, { isLoading: isSubmitting }] =
    useChangeSubTaskStatusMutation();

  const [selected, setSelected] = useState(0);
  // Tự động chuyển tab theo hash
  React.useEffect(() => {
    if (location.hash === "#comments") setSelected(2);
    else if (location.hash === "#reminders") setSelected(3);
  }, [location.hash]);

  React.useEffect(() => {
    // Lắng nghe các event realtime liên quan đến task này
    socketManager.joinTask(id);
    const handleRealtime = (data) => {
      if (data.taskId === id) {
        refetch();
      }
    };
    socketManager.onTaskUpdated(handleRealtime);
    socketManager.onTaskStageChanged(handleRealtime);
    socketManager.onTaskDeleted(handleRealtime);
    socketManager.onSubtaskAdded(handleRealtime);
    socketManager.onSubtaskUpdated(handleRealtime);
    socketManager.onReminderAdded(handleRealtime);
    socketManager.onReminderDeleted(handleRealtime);
    socketManager.onActivityAdded(handleRealtime);
    // Cleanup
    return () => {
      socketManager.leaveTask(id);
      socketManager.offTaskUpdated();
      socketManager.offTaskStageChanged();
      socketManager.offTaskDeleted();
      socketManager.offSubtaskAdded();
      socketManager.offSubtaskUpdated();
      socketManager.offReminderAdded();
      socketManager.offReminderDeleted();
      socketManager.offActivityAdded();
    };
  }, [id]);

  const task = data?.task || [];

  const handleSubmitAction = async (el) => {
    try {
      const data = {
        id: el.id,
        subId: el.subId,
        status: !el.status,
      };
      const res = await subTaskAction({
        ...data,
      }).unwrap();

      toast.success(res?.message);
      refetch();
    } catch (err) {
      console.log(err);
      toast.error(err?.data?.message || err.error);
    }
  };

  if (isLoading)
    <div className='py-10'>
      <Loading />
    </div>;

  const percentageCompleted =
    task?.subTasks?.length === 0
      ? 0
      : (getCompletedSubTasks(task?.subTasks) / task?.subTasks?.length) * 100;

  const renderSelectedTab = () => {
    switch (selected) {
      case 0:
        return (
          <>
            <div className='w-full flex flex-col md:flex-row gap-5 2xl:gap-8 bg-white shadow rounded-md px-8 py-8 overflow-y-auto'>
              <div className='w-full md:w-1/2 space-y-8'>
                <div className='flex items-center gap-5'>
                  <div
                    className={clsx(
                      "flex gap-1 items-center text-base font-semibold px-3 py-1 rounded-full",
                      PRIOTITYSTYELS[task?.priority],
                      bgColor[task?.priority]
                    )}
                  >
                    <span className='text-lg'>{ICONS[task?.priority]}</span>
                    <span className='uppercase'>{task?.priority} Priority</span>
                  </div>

                  <div className={clsx("flex items-center gap-2")}>
                    <TaskColor className={TASK_TYPE[task?.stage]} />
                    <span className='text-black uppercase'>{task?.stage}</span>
                  </div>
                </div>

                <p className='text-gray-500'>
                  Created At: {new Date(task?.date).toDateString()}
                </p>

                {/* Due Date Information */}
                {task?.dueDate && (
                  <div className='flex items-center gap-2'>
                    <span className='text-gray-500'>Due Date:</span>
                    <span className={`font-medium ${
                      (() => {
                        const now = moment().utcOffset(7);
                        const due = moment(task.dueDate).utcOffset(7);
                        if (task.stage !== 'completed' && now.isAfter(due)) return 'text-red-600';
                        if (task.stage === 'completed' && task.completedAt && moment(task.completedAt).utcOffset(7).isAfter(due)) return 'text-orange-600';
                        return 'text-gray-700';
                      })()
                    }`}>
                      {moment(task.dueDate).utcOffset(7).format('MMM D, YYYY')}
                      {task.stage !== 'completed' && moment().utcOffset(7).isAfter(moment(task.dueDate).utcOffset(7)) && ' (Overdue)'}
                      {task.stage === 'completed' && task.completedAt && moment(task.completedAt).utcOffset(7).isAfter(moment(task.dueDate).utcOffset(7)) && ' (Completed Late)'}
                    </span>
                  </div>
                )}

                {/* Estimated Hours */}
                {task?.estimatedHours && (
                  <div className='flex items-center gap-2'>
                    <span className='text-gray-500'>Estimated Hours:</span>
                    <span className='font-medium text-gray-700'>{task.estimatedHours}h</span>
                  </div>
                )}

                {/* Dependencies */}
                {task?.dependencies && task.dependencies.length > 0 && (
                  <div className='space-y-2'>
                    <p className='text-gray-500 font-semibold text-sm'>DEPENDENCIES</p>
                    <div className='space-y-2'>
                      {task.dependencies.map((dep) => (
                        <div key={dep._id} className='flex items-center gap-2 p-2 bg-gray-50 rounded'>
                          <div className={`w-3 h-3 rounded-full ${TASK_TYPE[dep.stage]}`} />
                          <span className='text-sm'>{dep.title}</span>
                          <span className='text-xs text-gray-500'>({dep.stage})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className='flex items-center gap-8 p-4 border-y border-gray-200'>
                  <div className='space-x-2'>
                    <span className='font-semibold'>Assets :</span>
                    <span>{task?.assets?.length}</span>
                  </div>
                  <span className='text-gray-400'>|</span>
                  <div className='space-x-2'>
                    <span className='font-semibold'>Sub-Task :</span>
                    <span>{task?.subTasks?.length}</span>
                  </div>
                </div>

                {/* Project Manager */}
                {task?.projectManager && (
                  <div className='space-y-4 py-6'>
                    <p className='text-gray-500 font-semibold text-sm'>
                      PROJECT MANAGER
                    </p>
                    <div className='space-y-3'>
                      <div className='flex gap-4 py-2 items-center border-t border-gray-200'>
                        <div className='w-10 h-10 rounded-full text-white flex items-center justify-center text-sm -mr-1 bg-green-600'>
                          <span className='text-center'>
                            {getInitials(task.projectManager?.name)}
                          </span>
                        </div>
                        <div>
                          <p className='text-lg font-semibold'>{task.projectManager?.name}</p>
                          <span className='text-gray-500'>{task.projectManager?.title || 'No title specified'} (Project Manager)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Team Members */}
                <div className='space-y-4 py-6'>
                  <p className='text-gray-500 font-semibold text-sm'>
                    TASK TEAM
                  </p>
                  <div className='space-y-3'>
                    {task?.team?.map((m, index) => (
                      <div
                        key={index + m?._id}
                        className='flex gap-4 py-2 items-center border-t border-gray-200'
                      >
                        <div
                          className={
                            "w-10 h-10 rounded-full text-white flex items-center justify-center text-sm -mr-1 bg-blue-600"
                          }
                        >
                          <span className='text-center'>
                            {getInitials(m?.name)}
                          </span>
                        </div>
                        <div>
                          <p className='text-lg font-semibold'>{m?.name}</p>
                          <span className='text-gray-500'>{m?.title || 'No title specified'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {task?.subTasks?.length > 0 && (
                  <div className='space-y-4 py-6'>
                    <div className='flex items-center gap-5'>
                      <p className='text-gray-500 font-semibold text-sm'>
                        SUB-TASKS
                      </p>
                      <div
                        className={`w-fit h-8 px-2 rounded-full flex items-center justify-center text-white ${
                          percentageCompleted < 50
                            ? "bg-rose-600"
                            : percentageCompleted < 80
                            ? "bg-amber-600"
                            : "bg-emerald-600"
                        }`}
                      >
                        <p>{percentageCompleted.toFixed(2)}%</p>
                      </div>
                    </div>
                    <div className='space-y-8'>
                      {task?.subTasks?.map((el, index) => (
                        <div key={index + el?._id} className='flex gap-3'>
                          <div className='w-10 h-10 flex items-center justify-center rounded-full bg-violet-200'>
                            <MdTaskAlt className='text-violet-600' size={26} />
                          </div>

                          <div className='space-y-1'>
                            <div className='flex gap-2 items-center'>
                              <span className='text-sm text-gray-500'>
                                {new Date(el?.dueDate).toDateString()}
                              </span>

                              <span className='px-2 py-0.5 text-center text-sm rounded-full bg-violet-100 text-violet-700 font-semibold lowercase'>
                                {el?.tag}
                              </span>

                              <span
                                className={`px-2 py-0.5 text-center text-sm rounded-full font-semibold ${
                                  el?.isCompleted
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-50 text-amber-600"
                                }`}
                              >
                                {el?.isCompleted ? "done" : "in progress"}
                              </span>
                            </div>
                            <p className='text-gray-700 pb-2'>{el?.title}</p>

                            <>
                              <button
                                disabled={isSubmitting}
                                className={`text-sm outline-none bg-gray-100 text-gray-800 p-1 rounded ${
                                  el?.isCompleted
                                    ? "hover:bg-rose-100 hover:text-rose-800"
                                    : "hover:bg-emerald-100 hover:text-emerald-800"
                                } disabled:cursor-not-allowed`}
                                onClick={() =>
                                  handleSubmitAction({
                                    status: el?.isCompleted,
                                    id: task?._id,
                                    subId: el?._id,
                                  })
                                }
                              >
                                {isSubmitting ? (
                                  <FaSpinner className='animate-spin' />
                                ) : el?.isCompleted ? (
                                  " Mark as Undone"
                                ) : (
                                  " Mark as Done"
                                )}
                              </button>
                            </>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className='w-full md:w-1/2 space-y-3'>
                {task?.description && (
                  <div className='mb-10'>
                    <p className='text-lg font-semibold'>TASK DESCRIPTION</p>
                    <div className='w-full'>{task?.description}</div>
                  </div>
                )}

                {task?.assets?.length > 0 && (
                  <div className='pb-10'>
                    <p className='text-lg font-semibold'>ASSETS</p>
                    <div className='w-full grid grid-cols-1 md:grid-cols-2 gap-4'>
                      {task?.assets?.map((el, index) => (
                        <img
                          key={index}
                          src={el}
                          alt={index}
                          className='w-full rounded h-auto md:h-44 2xl:h-52 cursor-pointer transition-all duration-700 md:hover:scale-125 hover:z-50'
                        />
                      ))}
                    </div>
                  </div>
                )}

                {task?.links?.length > 0 && (
                  <div className=''>
                    <p className='text-lg font-semibold'>SUPPORT LINKS</p>
                    <div className='w-full flex flex-col gap-4'>
                      {task?.links?.map((el, index) => (
                        <a
                          key={index}
                          href={el}
                          target='_blank'
                          className='text-blue-600 hover:underline'
                        >
                          {el}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        );
      case 1:
        return <Activities activity={task?.activities} refetch={refetch} id={id} />;
      case 2:
        return (
          <div className='w-full bg-white shadow rounded-md p-8'>
            <TaskComments task={task} onCommentAdded={refetch} />
          </div>
        );
      case 3:
        return (
          <div className='w-full bg-white shadow rounded-md p-8'>
            <TaskReminders task={task} onReminderAdded={refetch} />
          </div>
        );
      default:
        return null;
    }
  };

  // Thay setSelected bằng hàm custom để refetch khi chuyển tab
  const handleTabChange = (tabIndex) => {
    setSelected(tabIndex);
    refetch();
  };

  return (
    <div className='w-full flex flex-col gap-3 mb-4 overflow-y-hidden'>
      {/* task detail */}
      <h1 className='text-2xl text-gray-600 font-bold'>{task?.title}</h1>
      <Tabs tabs={TABS} setSelected={handleTabChange} selected={selected}>
        {renderSelectedTab()}
      </Tabs>
    </div>
  );
};

export default TaskDetail;
