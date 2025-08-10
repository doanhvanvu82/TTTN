import React, { useEffect, useState } from "react";
import { IoIosNotificationsOutline } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import { setOpenSidebar } from "../redux/slices/authSlice";
import NotificationPanel from "./NotificationPanel";
import UserAvatar from "./UserAvatar";
import { useLocation } from "react-router-dom";
import { useGetUnreadNotificationCountQuery } from "../redux/slices/api/userApiSlice";
import socketManager from "../utils/socket";
import {
  MdOutlineAddTask
} from "react-icons/md";

const Navbar = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const { user } = useSelector((state) => state.auth);
  const { data: unreadCountData } = useGetUnreadNotificationCountQuery();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?._id) {
      // Sử dụng async/await để đảm bảo connection được thiết lập
      const setupSocket = async () => {
        try {
          await socketManager.connect();
          // joinUser sẽ tự động xử lý - nếu chưa connected sẽ thêm vào pending list
          // nếu đã connected sẽ join ngay lập tức
          socketManager.joinUser(user._id);
        } catch (error) {
          console.error('Failed to connect socket:', error);
        }
      };
      setupSocket();
    }
  }, [user?._id]);

  useEffect(() => {
    if (unreadCountData?.count !== undefined) {
      setUnreadCount(unreadCountData.count);
    }
  }, [unreadCountData]);

  useEffect(() => {
    if (!user?._id) return;
    const handleRealtime = (data) => {
      if (data.userId === user._id && typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
    };
    socketManager.onNotificationNew(handleRealtime);
    socketManager.onNotificationRead(handleRealtime);
    socketManager.onNotificationDeleted(handleRealtime);
    return () => {
      socketManager.offNotificationNew();
      socketManager.offNotificationRead();
      socketManager.offNotificationDeleted();
    };
  }, [user?._id]);

  return (
    <nav className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg fixed top-0 left-0 right-0 z-[9999] navbar-top">
      <div className="w-full flex items-center justify-between h-20 px-4">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-2 select-none">
          <span className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-3 rounded-full shadow-md">
            <MdOutlineAddTask className="text-white text-3xl font-black" />
          </span>
          <span className="text-2xl md:text-3xl font-extrabold text-white tracking-wide drop-shadow select-none">ZenTask</span>
        </div>
        {/* Sidebar toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => dispatch(setOpenSidebar(true))}
            className="text-3xl text-white block md:hidden focus:outline-none hover:scale-110 transition-transform"
            aria-label="Open sidebar"
          >
            &#9776;
          </button>
        </div>
        {/* Right section */}
        <div className="flex items-center gap-4">
          {/* Only show notifications for non-admin users */}
          {user && !user.isAdmin && (
            <>
              <button
                onClick={() => setIsNotificationOpen(true)}
                className="relative p-2 text-white hover:bg-indigo-500 rounded-full transition-colors focus:outline-none"
                aria-label="Notifications"
              >
                <IoIosNotificationsOutline className="text-2xl" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center border-2 border-white animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <NotificationPanel
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
              />
            </>
          )}
          <UserAvatar />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
