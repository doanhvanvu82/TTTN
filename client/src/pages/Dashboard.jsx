import clsx from "clsx";
import moment from "moment";
import React, { useEffect } from "react";
import { FaNewspaper } from "react-icons/fa";
import { FaArrowsToDot } from "react-icons/fa6";
import { LuClipboardEdit } from "react-icons/lu";
import {
  MdAdminPanelSettings,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdKeyboardDoubleArrowUp,
} from "react-icons/md";
import { Chart, Loading, UserInfo } from "../components";
import { useGetDasboardStatsQuery } from "../redux/slices/api/taskApiSlice";
import { BGS, PRIOTITYSTYELS, TASK_TYPE, getInitials } from "../utils";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const Card = ({ label, count, bg, icon }) => {
  return (
    <div className={clsx(
      'w-full h-36 bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-500 p-6 shadow-xl rounded-3xl flex items-center justify-between transition-transform hover:scale-105 duration-200',
      'dark:from-[#232136] dark:via-indigo-900 dark:to-purple-900'
    )}>
      <div className='h-full flex flex-1 flex-col justify-between'>
        <p className='text-base text-white/80 font-medium'>{label}</p>
        <span className='text-4xl font-extrabold text-white drop-shadow'>{count}</span>
      </div>
      <div className='w-16 h-16 rounded-full flex items-center justify-center bg-white/20 shadow-lg'>
        <span className='text-3xl text-white'>{icon}</span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { data, isLoading, error } = useGetDasboardStatsQuery();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, []);

  const totals = data?.tasks || [];

  if (isLoading)
    return (
      <div className='py-10'>
        <Loading />
      </div>
    );

  const stats = [
    {
      _id: "1",
      label: "TOTAL TASK",
      total: data?.totalTasks || 0,
      icon: <FaNewspaper />,
      bg: "bg-[#1d4ed8]",
    },
    {
      _id: "2",
      label: "COMPLETED TASK",
      total: totals["completed"] || 0,
      icon: <MdAdminPanelSettings />,
      bg: "bg-[#0f766e]",
    },
    {
      _id: "3",
      label: "TASK IN PROGRESS ",
      total: totals["in progress"] || 0,
      icon: <LuClipboardEdit />,
      bg: "bg-[#f59e0b]",
    },
    {
      _id: "4",
      label: "TODOS",
      total: totals["todo"] || 0,
      icon: <FaArrowsToDot />,
      bg: "bg-[#be185d]",
    },
  ];

  return (
    <div className='h-full py-6 px-2 md:px-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-[#18192b] dark:via-[#232136] dark:to-[#18192b] min-h-screen'>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10'>
        {stats?.map(({ icon, bg, label, total }, index) => (
          <Card key={index} icon={icon} bg={bg} label={label} count={total} />
        ))}
      </div>
      <div className='w-full bg-white dark:bg-[#232136] my-10 p-6 rounded-3xl shadow-xl'>
        <h4 className='text-2xl text-indigo-700 dark:text-indigo-300 font-bold mb-4'>
          Chart by Priority
        </h4>
        <Chart data={data?.graphData} />
      </div>
      <div className={`w-full flex flex-col md:flex-row gap-6 py-8`}>
        {data && (
          <>
            <div className={user?.isProjectManager ? "md:w-2/3 w-full" : "w-full"}>
              <TaskTable tasks={data?.last10Task} />
            </div>
            {user?.isProjectManager && (
              <div className="md:w-1/3 w-full">
                <UserTable users={data?.users} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const UserTable = ({ users }) => {
  const TableHeader = () => (
    <thead className='border-b border-indigo-200 dark:border-indigo-700'>
      <tr className='text-indigo-900 dark:text-indigo-200 text-left'>
        <th className='py-2'>Full Name</th>
        <th className='py-2'>Status</th>
        <th className='py-2'>Created At</th>
      </tr>
    </thead>
  );

  const TableRow = ({ user }) => (
    <tr className='border-b border-indigo-100 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100/30 dark:hover:bg-indigo-900/30'>
      <td className='py-2'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-full text-white flex items-center justify-center text-base bg-gradient-to-tr from-blue-600 to-indigo-500'>
            <span className='text-center'>{getInitials(user?.name)}</span>
          </div>
          <div>
            <p> {user.name}</p>
            <span className='text-xs text-indigo-400'>{user?.role}</span>
          </div>
        </div>
      </td>
      <td>
        <p
          className={clsx(
            "w-fit px-3 py-1 rounded-full text-sm font-semibold",
            user?.isActive ? "bg-blue-200 text-blue-800" : "bg-yellow-100 text-yellow-800"
          )}
        >
          {user?.isActive ? "Active" : "Disabled"}
        </p>
      </td>
      <td className='py-2 text-sm'>{moment(user?.createdAt).fromNow()}</td>
    </tr>
  );

  return (
    <div className='bg-white dark:bg-[#232136] h-fit px-2 md:px-6 py-4 shadow-xl rounded-2xl'>
      <table className='w-full mb-5'>
        <TableHeader />
        <tbody>
          {users?.map((user, index) => (
            <TableRow key={index + user?._id} user={user} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TaskTable = ({ tasks }) => {
  const { user } = useSelector((state) => state.auth);

  const ICONS = {
    high: <MdKeyboardDoubleArrowUp />,
    medium: <MdKeyboardArrowUp />,
    low: <MdKeyboardArrowDown />,
  };

  const TableHeader = () => (
    <thead className='border-b border-indigo-200 dark:border-indigo-700'>
      <tr className='text-indigo-900 dark:text-indigo-200 text-left'>
        <th className='py-2'>Task Title</th>
        <th className='py-2'>Priority</th>
        <th className='py-2'>Team</th>
        <th className='py-2 hidden md:block'>Created At</th>
      </tr>
    </thead>
  );

  const TableRow = ({ task }) => (
    <tr className='border-b border-indigo-100 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100/30 dark:hover:bg-indigo-900/30'>
      <td className='py-2'>
        <div className='flex items-center gap-2'>
          <div
            className={clsx("w-4 h-4 rounded-full", TASK_TYPE[task.stage])}
          />
          <p className='text-base font-semibold text-indigo-900 dark:text-indigo-200'>
            {task?.title}
          </p>
        </div>
      </td>
      <td className='py-2'>
        <div className={"flex gap-1 items-center"}>
          <span className={clsx("text-lg", PRIOTITYSTYELS[task?.priority])}>
            {ICONS[task?.priority]}
          </span>
          <span className='capitalize'>{task?.priority}</span>
        </div>
      </td>
      <td className='py-2'>
        <div className='flex'>
          {task?.team.map((m, index) => (
            <div
              key={index}
              className={clsx(
                "w-7 h-7 rounded-full text-white flex items-center justify-center text-sm -mr-1 bg-gradient-to-tr from-blue-600 to-indigo-500"
              )}
            >
              <UserInfo user={m} />
            </div>
          ))}
        </div>
      </td>
      <td className='py-2 hidden md:block'>
        <span className='text-base text-indigo-700 dark:text-indigo-300'>
          {moment(task?.date).fromNow()}
        </span>
      </td>
    </tr>
  );

  return (
    <div className={clsx(
      "bg-white dark:bg-[#232136] px-2 md:px-4 pt-4 pb-4 shadow-xl rounded-2xl"
    )}>
      <table className='w-full'>
        <TableHeader />
        <tbody>
          {tasks.map((task, id) => (
            <TableRow key={task?._id + id} task={task} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;
