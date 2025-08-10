import clsx from "clsx";
import React, { useState } from "react";
import {
  MdDelete,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdKeyboardDoubleArrowUp,
  MdOutlineRestore,
} from "react-icons/md";
import { toast } from "sonner";
import {
  AddUser,
  Button,
  ConfirmatioDialog,
  Loading,
  Title,
} from "../components";
import { TaskColor } from "../components/tasks";
import {
  useDeleteRestoreTastMutation,
  useGetAllTaskQuery,
} from "../redux/slices/api/taskApiSlice";
import { PRIOTITYSTYELS, TASK_TYPE } from "../utils/index";
import { useSearchParams } from "react-router-dom";

const ICONS = {
  high: <MdKeyboardDoubleArrowUp />,
  medium: <MdKeyboardArrowUp />,
  low: <MdKeyboardArrowDown />,
};

const Trash = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const [type, setType] = useState("delete");
  const [selected, setSelected] = useState("");
  const [searchParams] = useSearchParams();
  const [searchTerm] = useState(searchParams.get("search") || "");

  const { data, isLoading, refetch } = useGetAllTaskQuery({
    strQuery: "",
    isTrashed: "true",
    search: searchTerm,
  });
  const [deleteRestoreTask] = useDeleteRestoreTastMutation();

  const deleteAllClick = () => {
    setType("deleteAll");
    setMsg("Do you want to permanently delete all items?");
    setOpenDialog(true);
  };

  const restoreAllClick = () => {
    setType("restoreAll");
    setMsg("Do you want to restore all items in the trash?");
    setOpenDialog(true);
  };

  const deleteClick = (id) => {
    setType("delete");
    setSelected(id);
    setMsg("Do you want to permanently delete this item?");
    setOpenDialog(true);
  };

  const restoreClick = (id) => {
    setSelected(id);
    setType("restore");
    setMsg("Do you want to restore the selected item?");
    setOpenDialog(true);
  };

  const deleteRestoreHandler = async () => {
    try {
      let res = null;
      switch (type) {
        case "delete":
          res = await deleteRestoreTask({
            id: selected,
            actionType: "delete",
          }).unwrap();
          break;
        case "deleteAll":
          res = await deleteRestoreTask({
            id: "",
            actionType: "deleteAll",
          }).unwrap();
          break;
        case "restore":
          res = await deleteRestoreTask({
            id: selected,
            actionType: "restore",
          }).unwrap();
          break;
        case "restoreAll":
          res = await deleteRestoreTask({
            id: "",
            actionType: "restoreAll",
          }).unwrap();
          break;
      }
      toast.success(res?.message);
      setTimeout(() => {
        setOpenDialog(false);
        refetch();
      }, 500);
    } catch (err) {
      console.log(err);
      toast.error(err?.data?.message || err.error);
    }
  };

  const TableHeader = () => (
    <thead className="border-b border-indigo-200 dark:border-indigo-700">
      <tr className="text-indigo-900 dark:text-indigo-200 text-left">
        <th className="py-2">Task Title</th>
        <th className="py-2">Priority</th>
        <th className="py-2">Stage</th>
        <th className="py-2 line-clamp-1">Modified On</th>
        <th className="py-2">Actions</th>
      </tr>
    </thead>
  );

  const TableRow = ({ item }) => (
    <tr className="border-b border-indigo-100 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100/30 dark:hover:bg-indigo-900/30">
      <td className="py-2">
        <div className="flex items-center gap-2">
          <TaskColor className={TASK_TYPE[item.stage]} />
          <p className="w-full line-clamp-2 text-base font-semibold text-indigo-900 dark:text-indigo-200">
            {item?.title}
          </p>
        </div>
      </td>
      <td className="py-2 capitalize">
        <div className="flex gap-1 items-center">
          <span className={clsx("text-lg", PRIOTITYSTYELS[item?.priority])}>
            {ICONS[item?.priority]}
          </span>
          <span>{item?.priority}</span>
        </div>
      </td>
      <td className="py-2 capitalize text-center md:text-start">
        {item?.stage}
      </td>
      <td className="py-2 text-sm">{new Date(item?.date).toDateString()}</td>
      <td className="py-2 flex gap-1 justify-end">
        <Button
          icon={<MdOutlineRestore className="text-xl text-white" />}
          onClick={() => restoreClick(item._id)}
          className="bg-indigo-500 border border-indigo-600 hover:bg-indigo-600 focus:ring-2 focus:ring-indigo-400 rounded-full shadow transition-all duration-200 p-2 group"
          label=""
          aria-label="Restore"
          title="Restore"
        />
        <Button
          icon={<MdDelete className="text-xl text-red-600" />}
          onClick={() => deleteClick(item._id)}
          className="hover:bg-red-100 dark:hover:bg-red-900 rounded-full"
          label=""
        />
      </td>
    </tr>
  );

  return isLoading ? (
    <div className="py-10">
      <Loading />
    </div>
  ) : (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-[#18192b] dark:via-[#232136] dark:to-[#18192b] py-8 px-2 md:px-6">
      <div className="flex items-center justify-between mb-8">
        <Title title="Trashed Tasks" />
        {data?.tasks?.length > 0 && (
          <div className="flex gap-2 md:gap-4 items-center">
            <Button
              label="Restore All"
              icon={<MdOutlineRestore className="text-lg hidden md:flex" />}
              className="flex flex-row-reverse gap-1 items-center text-red-600 text-sm md:text-base rounded-xl py-2.5 px-4 font-semibold shadow hover:bg-red-100 dark:hover:bg-red-900"
              onClick={() => restoreAllClick()}
            />
            <Button
              label="Delete All"
              icon={<MdDelete className="text-lg hidden md:flex" />}
              className="flex flex-row-reverse gap-1 items-center text-red-600 text-sm md:text-base rounded-xl py-2.5 px-4 font-semibold shadow hover:bg-red-100 dark:hover:bg-red-900"
              onClick={() => deleteAllClick()}
            />
          </div>
        )}
      </div>
      {data?.tasks?.length > 0 ? (
        <div className="bg-white dark:bg-[#232136] px-2 md:px-6 py-6 shadow-xl rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full mb-5">
              <TableHeader />
              <tbody>
                {data?.tasks?.map((tk, id) => (
                  <TableRow key={id} item={tk} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="w-full flex justify-center py-10">
          <p className="text-lg text-gray-500">No trashed tasks found.</p>
        </div>
      )}
      <AddUser open={open} setOpen={setOpen} />
      <ConfirmatioDialog
        open={openDialog}
        setOpen={setOpenDialog}
        msg={msg}
        setMsg={setMsg}
        type={type}
        setType={setType}
        onClick={() => deleteRestoreHandler()}
      />
    </div>
  );
};

export default Trash;
