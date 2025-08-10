import { Transition } from "@headlessui/react";
import { Fragment, useRef, useEffect } from "react";
import { IoMdClose } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { Navbar, Sidebar } from "./components";
import {
  Dashboard,
  Login,
  Register,
  TaskDetail,
  Tasks,
  Trash,
  StatusPage,
  AdminUsers,
  TeamUsers,
} from "./pages";
import { setOpenSidebar } from "./redux/slices/authSlice";
import socketManager from "./utils/socket";

function Layout() {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  const isAdmin = user?.isAdmin;
  const isPM = user?.isProjectManager;

  // Khởi tạo Socket.IO connection khi user đăng nhập
  useEffect(() => {
    if (user) {
      // Force reconnect để đảm bảo connection sạch khi user đăng nhập
      const setupSocket = async () => {
        try {
          await socketManager.forceReconnect();
          console.log('Socket connection established for user:', user._id);
        } catch (error) {
          console.error('Failed to connect socket:', error);
        }
      };
      setupSocket();
    } else {
      socketManager.disconnect();
    }

    return () => {
      // Chỉ disconnect khi component unmount và không có user
      if (!user) {
        socketManager.disconnect();
      }
    };
  }, [user]);

  // Cleanup socket khi user đóng tab hoặc refresh trang
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) {
        socketManager.disconnect();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  // Chỉ redirect một lần duy nhất khi vào '/'
  if (user && location.pathname === '/') {
    if (isAdmin) return <Navigate to='/admin-users' replace />;
    if (isPM) return <Navigate to='/dashboard' replace />;
    return <Navigate to='/tasks' replace />;
  }

  return user ? (
    <div className='w-full h-screen flex flex-col'>
      <Navbar />
      <div className='flex flex-row flex-1'>
        {!user?.isAdmin && (
          <div className='fixed-sidebar-container hidden md:block'>
            <Sidebar />
          </div>
        )}
        <div className={`flex-1 overflow-y-auto ${!user?.isAdmin ? 'main-content' : 'admin-content'}`}>
          <div className='p-4 2xl:px-10'>
            <Outlet />
          </div>
        </div>
      </div>
      <MobileSidebar />
    </div>
  ) : (
    <Navigate to='/log-in' state={{ from: location }} replace />
  );
}

const MobileSidebar = () => {
  const { isSidebarOpen } = useSelector((state) => state.auth);
  const mobileMenuRef = useRef(null);
  const dispatch = useDispatch();

  const closeSidebar = () => {
    dispatch(setOpenSidebar(false));
  };

  return (
    <>
      <Transition
        show={isSidebarOpen}
        as={Fragment}
        enter='transition-opacity duration-700'
        enterFrom='opacity-x-10'
        enterTo='opacity-x-100'
        leave='transition-opacity duration-700'
        leaveFrom='opacity-x-100'
        leaveTo='opacity-x-0'
      >
        {(ref) => (
          <div
            ref={(node) => (mobileMenuRef.current = node)}
            className={`md:hidden w-full h-full bg-black/40 transition-transform duration-700 transform
             ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
            onClick={() => closeSidebar()}
          >
            <div className='bg-white w-3/4 h-full'>
              <div className='w-full flex justify-end px-5 pt-5'>
                <button
                  onClick={() => closeSidebar()}
                  className='flex justify-end items-end'
                >
                  <IoMdClose size={25} />
                </button>
              </div>

              <div className='-mt-10'>
                <Sidebar />
              </div>
            </div>
          </div>
        )}
      </Transition>
    </>
  );
};

const App = () => {
  const theme = "light";

  return (
    <main className={theme}>
      <div className='w-full min-h-screen bg-[#f3f4f6] dark:bg-[#0d0d0df4]'>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={null} />
            <Route path='/dashboard' element={<Dashboard />} />
            <Route path='/tasks' element={<Tasks />} />
            <Route path='/completed/:status?' element={<Tasks />} />
            <Route path='/in-progress/:status?' element={<Tasks />} />
            <Route path='/todo/:status?' element={<Tasks />} />
            <Route path='/trashed' element={<Trash />} />
            <Route path='/task/:id' element={<TaskDetail />} />
            <Route path='/status' element={<StatusPage />} />
            <Route path='/admin-users' element={<AdminUsers />} />
            <Route path='/team-users' element={<TeamUsers />} />
          </Route>

          <Route path='/log-in' element={<Login />} />
          <Route path='/register' element={<Register />} />
        </Routes>
      </div>

      <Toaster richColors position='top-center' />
    </main>
  );
};

export default App;
