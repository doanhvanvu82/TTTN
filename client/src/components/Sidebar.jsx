import clsx from "clsx";
import React from "react";
import { FaTasks, FaTrashAlt, FaUsers } from "react-icons/fa";
import {
  MdDashboard,
  MdOutlineAddTask,
  MdOutlinePendingActions,
  MdSettings,
  MdTaskAlt,
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { setOpenSidebar } from "../redux/slices/authSlice";
import { IoCheckmarkDoneOutline } from "react-icons/io5";

const linkData = [
  {
    label: "Dashboard",
    link: "dashboard",
    icon: <MdDashboard />,
  },
  {
    label: "Tasks",
    link: "tasks",
    icon: <FaTasks />,
  },
  {
    label: "Completed",
    link: "completed/completed",
    icon: <MdTaskAlt />,
  },
  {
    label: "In Progress",
    link: "in-progress/in progress",
    icon: <MdOutlinePendingActions />,
  },
  {
    label: "To Do",
    link: "todo/todo",
    icon: <MdOutlinePendingActions />,
  },
  {
    label: "Team",
    link: "team-users",
    icon: <FaUsers />,
  },
  {
    label: "Status",
    link: "status",
    icon: <IoCheckmarkDoneOutline />,
  },
  {
    label: "Trash",
    link: "trashed",
    icon: <FaTrashAlt />,
  },
];

const Sidebar = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const path = location.pathname.split("/")[1];
  let sidebarLinks = [];
  if (user?.isAdmin) {
    sidebarLinks = [];
  } else if (user?.isProjectManager) {
    sidebarLinks = linkData;
  } else {
    sidebarLinks = linkData.filter(link => ["Tasks", "Completed", "In Progress", "To Do"].includes(link.label));
  }

  const closeSidebar = () => {
    dispatch(setOpenSidebar(false));
  };

  const NavLink = ({ el }) => {
    const isActive = path === el.link.split("/")[0];
    return (
      <Link
        onClick={closeSidebar}
        to={el.link}
        className={clsx(
          "flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-lg transition-all duration-150",
          isActive
            ? "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg scale-105"
            : "text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-700 dark:hover:text-white"
        )}
      >
        <span className="text-2xl">{el.icon}</span>
        <span>{el.label}</span>
      </Link>
    );
  };

  return (
    <aside className="h-full w-full flex flex-col gap-8 p-6 bg-white dark:bg-[#18192b] shadow-xl rounded-r-3xl md:rounded-3xl transition-all duration-300 fixed-sidebar">
      {/* Menu */}
      <nav className="flex-1 flex flex-col gap-3">
        {sidebarLinks.map((link) => (
          <NavLink el={link} key={link.label} />
        ))}
      </nav>
      {/* Đóng sidebar trên mobile */}
      <button
        onClick={closeSidebar}
        className="block md:hidden mt-4 text-indigo-500 hover:text-indigo-700 font-semibold text-base"
      >
        Đóng menu
      </button>
    </aside>
  );
};

export default Sidebar;
