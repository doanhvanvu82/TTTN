import React, { useEffect, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { toast } from "sonner";
import {
  AddUser,
  Button,
  ConfirmatioDialog,
  Loading,
  Title,
  UserAction,
} from "../components";
import {
  useDeleteUserMutation,
  useGetTeamListsQuery,
  useUserActionMutation,
} from "../redux/slices/api/userApiSlice";
import { getInitials } from "../utils/index";
import { useSelector } from "react-redux";

const AdminUsers = () => {
  const { user } = useSelector((state) => state.auth);
  const [searchTerm] = useState("");
  const { data, isLoading, refetch } = useGetTeamListsQuery({ search: searchTerm });
  const [deleteUser] = useDeleteUserMutation();
  const [userAction] = useUserActionMutation();
  const [openDialog, setOpenDialog] = useState(false);
  const [open, setOpen] = useState(false);
  const [openAction, setOpenAction] = useState(false);
  const [selected, setSelected] = useState(null);

  const deleteClick = (id) => {
    setSelected(id);
    setOpenDialog(true);
  };

  const editClick = (userObj) => {
    setSelected(userObj);
    setOpen(true);
  };

  const userStatusClick = (el) => {
    setSelected(el);
    setOpenAction(true);
  };

  const deleteHandler = async () => {
    try {
      const res = await deleteUser(selected);
      refetch();
      toast.success(res?.data?.message || "User deleted successfully.");
      setSelected(null);
      setTimeout(() => {
        setOpenDialog(false);
      }, 500);
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  const userActionHandler = async () => {
    try {
      const res = await userAction({
        isActive: !selected?.isActive,
        id: selected?._id,
      });
      refetch();
      toast.success(res?.data?.message || "User status updated.");
      setSelected(null);
      setTimeout(() => {
        setOpenAction(false);
      }, 500);
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  const handleAddUserSuccess = () => {
    setOpen(false);
    setSelected(null);
    refetch();
  };

  const TableHeader = () => (
    <thead className="border-b border-indigo-200 dark:border-indigo-700">
      <tr className="text-indigo-900 dark:text-indigo-200 text-left">
        <th className="py-2">Full Name</th>
        <th className="py-2">Title</th>
        <th className="py-2">Email</th>
        <th className="py-2">Role</th>
        <th className="py-2">Active</th>
        <th className="py-2">Actions</th>
      </tr>
    </thead>
  );

  const TableRow = ({ user }) => (
    <tr className="border-b border-indigo-100 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100/30 dark:hover:bg-indigo-900/30">
      <td className="p-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full text-white flex items-center justify-center text-sm bg-gradient-to-tr from-blue-600 to-indigo-500">
            <span className="text-xs md:text-sm text-center">
              {getInitials(user.name)}
            </span>
          </div>
          {user.name}
        </div>
      </td>
      <td className="p-2">{user.title}</td>
      <td className="p-2">{user.email}</td>
      <td className="p-2 capitalize">{user.role}</td>
      <td>
        {user.role !== "admin" && (
          <button
            onClick={() => userStatusClick(user)}
            className={
              user?.isActive
                ? "w-fit px-4 py-1 rounded-full font-semibold bg-blue-200 text-blue-800"
                : "w-fit px-4 py-1 rounded-full font-semibold bg-yellow-100 text-yellow-800"
            }
          >
            {user?.isActive ? "Active" : "Disabled"}
          </button>
        )}
      </td>
      <td className="p-2 flex gap-2">
        {user.role !== "admin" && (
          <>
            <Button
              className="text-blue-600 hover:text-blue-500 font-semibold px-4 py-1.5 rounded-md"
              label="Edit"
              type="button"
              onClick={() => editClick(user)}
            />
            <Button
              className="text-red-700 hover:text-red-500 font-semibold px-4 py-1.5 rounded-md"
              label="Delete"
              type="button"
              onClick={() => deleteClick(user._id)}
            />
          </>
        )}
      </td>
    </tr>
  );

  return isLoading ? (
    <div className="py-10"><Loading /></div>
  ) : (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-[#18192b] dark:via-[#232136] dark:to-[#18192b] py-8 px-2 md:px-6">
      <div className="w-full md:w-[90%] mx-auto mb-6">
        <div className="flex items-center justify-between mb-8">
          <Title title={'User Management'} />
          <Button
            label="Add User"
            icon={<IoMdAdd className="text-xl" />}
            iconPosition="left"
            className="flex gap-2 items-center bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-xl py-2.5 px-6 font-semibold shadow-lg hover:from-indigo-500 hover:to-blue-600 transition-all duration-200"
            onClick={() => setOpen(true)}
          />
        </div>
        <div className="bg-white dark:bg-[#232136] px-2 md:px-6 py-6 shadow-xl rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full mb-5">
              <TableHeader />
              <tbody>
                {data?.map((user, index) => (
                  <TableRow key={index} user={user} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <AddUser open={open} setOpen={setOpen} onSuccess={handleAddUserSuccess} />
      <ConfirmatioDialog
        open={openDialog}
        setOpen={setOpenDialog}
        msg={"Are you sure you want to delete this user?"}
        setMsg={() => {}}
        type={"delete"}
        setType={() => {}}
        onClick={deleteHandler}
      />
      <UserAction
        open={openAction}
        setOpen={setOpenAction}
        user={selected}
        onClick={userActionHandler}
      />
    </div>
  );
};

export default AdminUsers; 