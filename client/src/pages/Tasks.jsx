import React, { useEffect, useState } from "react";
import { FaList } from "react-icons/fa";
import { IoMdAdd } from "react-icons/io";
import { MdGridView, MdCalendarMonth, MdAssessment, MdTimeline } from "react-icons/md";
import { useParams, useSearchParams, Navigate, useLocation } from "react-router-dom";
import { Button, Loading, Table, Tabs, Title } from "../components";
import { AddTask, BoardView, TaskTitle } from "../components/tasks";
import CalendarView from "../components/tasks/CalendarView";
import GanttChart from "../components/tasks/GanttChart";
import PerformanceReports from "../components/PerformanceReports";
import { useGetAllTaskQuery } from "../redux/slices/api/taskApiSlice";
import { TASK_TYPE } from "../utils";
import { useSelector } from "react-redux";
import socketManager from '../utils/socket';

const MAIN_TABS = [
  { title: "Board View", icon: <MdGridView /> },
  { title: "List View", icon: <FaList /> },
  { title: "Calendar View", icon: <MdCalendarMonth /> },
  { title: "Gantt Chart", icon: <MdTimeline /> },
  { title: "Performance Reports", icon: <MdAssessment /> },
];
const SIMPLE_TABS = [
  { title: "Board View", icon: <MdGridView /> },
  { title: "List View", icon: <FaList /> },
];

const Tasks = () => {
  const params = useParams();
  const { user } = useSelector((state) => state.auth);
  const [searchParams] = useSearchParams();
  const [searchTerm] = useState(searchParams.get("search") || "");

  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);

  const status = params?.status || "";
  const tabs = status ? SIMPLE_TABS : MAIN_TABS;

  const { data, isLoading, refetch } = useGetAllTaskQuery({
    strQuery: status,
    isTrashed: "",
    search: searchTerm,
  });

  const location = useLocation();

  useEffect(() => {
    refetch();
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [open, location.pathname]);

  useEffect(() => {
    setSelected(0); // Always reset to Board View when status changes
  }, [status]);

  useEffect(() => {
    // Lắng nghe các event realtime task và subtask (bao gồm cả global)
    const handleRealtime = () => {
      console.log('🔄 Realtime event received, refetching tasks...');
      refetch();
    };
    
    const handleTaskAddedGlobal = () => {
      console.log('🆕 Task added global event received, refetching tasks...');
      refetch();
    };
    
    socketManager.onTaskAddedGlobal(handleTaskAddedGlobal);
    socketManager.onTaskUpdated(handleRealtime);
    socketManager.onTaskStageChanged(handleRealtime);
    socketManager.onTaskDeleted(handleRealtime);
    socketManager.onTaskUpdatedGlobal(handleRealtime);
    socketManager.onTaskStageChangedGlobal(handleRealtime);
    socketManager.onSubtaskAdded(handleRealtime);
    socketManager.onSubtaskUpdated(handleRealtime);
    socketManager.onSubtaskDeleted(handleRealtime);
    socketManager.onSubtaskAddedGlobal(handleRealtime);
    socketManager.onSubtaskUpdatedGlobal(handleRealtime);
    socketManager.onSubtaskDeletedGlobal(handleRealtime);
    
    console.log('🎧 Socket event listeners attached for Tasks component');
    
    return () => {
      socketManager.offTaskAddedGlobal();
      socketManager.offTaskUpdated();
      socketManager.offTaskStageChanged();
      socketManager.offTaskDeleted();
      socketManager.offTaskUpdatedGlobal();
      socketManager.offTaskStageChangedGlobal();
      socketManager.offSubtaskAdded();
      socketManager.offSubtaskUpdated();
      socketManager.offSubtaskDeleted();
      socketManager.offSubtaskAddedGlobal();
      socketManager.offSubtaskUpdatedGlobal();
      socketManager.offSubtaskDeletedGlobal();
      console.log('🎧 Socket event listeners removed for Tasks component');
    };
  }, [refetch]);

  const renderSelectedView = () => {
    // If on a status page, only allow Board/List view
    if (status) {
      if (selected === 0) return <BoardView tasks={data?.tasks} refetch={refetch} />;
      if (selected === 1) return <Table tasks={data?.tasks} refetch={refetch} />;
      return <BoardView tasks={data?.tasks} refetch={refetch} />;
    }
    // Main Tasks page: all views
    switch (selected) {
      case 0:
        return <BoardView tasks={data?.tasks} refetch={refetch} />;
      case 1:
        return <Table tasks={data?.tasks} refetch={refetch} />;
      case 2:
        return <CalendarView />;
      case 3:
        return <GanttChart />;
      case 4:
        return <PerformanceReports />;
      default:
        return <BoardView tasks={data?.tasks} refetch={refetch} />;
    }
  };

  // Khi chuyển tab, nếu là List View thì refetch dữ liệu
  const handleTabChange = (tabIndex) => {
    setSelected(tabIndex);
    if (tabIndex === 1) {
      refetch();
    }
  };

  return isLoading ? (
    <div className="py-10">
      <Loading />
    </div>
  ) : (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-[#18192b] dark:via-[#232136] dark:to-[#18192b] px-2 md:px-6 py-6">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <Title title={status ? `${status} Tasks` : "Tasks"} />
        {!status && user?.isProjectManager && selected !== 4 && (
          <Button
            label="Create Task"
            icon={<IoMdAdd className="text-xl" />}
            iconPosition="left"
            className="flex gap-2 items-center bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-xl py-2.5 px-6 font-semibold shadow-lg hover:from-indigo-500 hover:to-blue-600 transition-all duration-200"
            onClick={() => setOpen(true)}
          />
        )}
      </div>
      <div className="mt-2">
        <Tabs tabs={tabs} setSelected={handleTabChange} selected={selected}>
          {renderSelectedView()}
        </Tabs>
      </div>
      <AddTask open={open} setOpen={setOpen} refetch={refetch} />
    </div>
  );
};

export default Tasks;
