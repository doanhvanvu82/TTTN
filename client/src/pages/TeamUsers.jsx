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
  useGetPMTeamListsQuery,
  useAddUserToTeamMutation,
  useRemoveUserFromTeamMutation,
} from "../redux/slices/api/userApiSlice";
import { getInitials } from "../utils/index";
import { useSelector } from "react-redux";

const TeamUsers = () => {
  const { user } = useSelector((state) => state.auth);
  const [emailInput, setEmailInput] = useState("");
  const [suggestedUser, setSuggestedUser] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [debounceTimeout, setDebounceTimeout] = useState(null);
  const { data, isLoading, refetch } = useGetPMTeamListsQuery();
  const [addUserToTeam, { isLoading: isAdding }] = useAddUserToTeamMutation();
  const [removeUserFromTeam, { isLoading: isRemoving }] = useRemoveUserFromTeamMutation();
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState(null);

  // Debounce user search by email
  const handleEmailInput = (e) => {
    const value = e.target.value;
    setEmailInput(value);
    setSuggestions([]);
    setSuggestedUser(null);
    if (debounceTimeout) clearTimeout(debounceTimeout);
    setDebounceTimeout(setTimeout(async () => {
      if (value) {
        try {
          const res = await fetch(`/api/user/search?q=${value}`);
          const users = await res.json();
          if (Array.isArray(users) && users.length > 0) {
            setSuggestions(users);
          } else {
            setSuggestions([]);
          }
        } catch {
          setSuggestions([]);
        }
      }
    }, 500));
  };

  const handleSuggestionClick = (user) => {
    setEmailInput(user.email);
    setSuggestions([]);
    setSuggestedUser(user);
  };

  // Add user to team
  const handleAddUser = async () => {
    if (!emailInput) return;
    try {
      const res = await addUserToTeam({ email: emailInput }).unwrap();
      toast.success(res.message || "User added to team.");
      setEmailInput("");
      setSuggestedUser(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  // Remove user from team
  const handleRemoveUser = async (userIdToRemove) => {
    setUserToRemove(userIdToRemove);
    setConfirmRemoveOpen(true);
  };

  const confirmRemoveUser = async () => {
    if (!userToRemove) return;
    try {
      const res = await removeUserFromTeam({ userIdToRemove: userToRemove }).unwrap();
      toast.success(res.message || "User removed from team.");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    } finally {
      setConfirmRemoveOpen(false);
      setUserToRemove(null);
    }
  };

  const TableHeader = () => (
    <thead className="border-b border-indigo-200 dark:border-indigo-700">
      <tr className="text-indigo-900 dark:text-indigo-200 text-left">
        <th className="py-2 px-3">Full Name</th>
        <th className="py-2 px-3">Title</th>
        <th className="py-2 px-3">Email</th>
        <th className="py-2 px-3">Role</th>
        <th className="py-2 px-3">Actions</th>
      </tr>
    </thead>
  );

  const TableRow = ({ user }) => (
    <tr className="border-b border-indigo-100 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100/30 dark:hover:bg-indigo-900/30">
      <td className="p-2 px-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full text-white flex items-center justify-center text-sm bg-gradient-to-tr from-blue-600 to-indigo-500">
            <span className="text-xs md:text-sm text-center">
              {getInitials(user.name)}
            </span>
          </div>
          {user.name}
        </div>
      </td>
      <td className="p-2 px-3">{user.title}</td>
      <td className="p-2 px-3">{user.email}</td>
      <td className="p-2 px-3 capitalize">{user.role}</td>
      <td className="p-2 px-3 flex gap-4">
        <Button
          className="text-amber-600 hover:text-amber-500 font-semibold px-3 py-1 rounded-md"
          label="Remove"
          type="button"
          onClick={() => handleRemoveUser(user._id)}
          disabled={isRemoving}
        />
      </td>
    </tr>
  );

  return isLoading ? (
    <div className="py-10"><Loading /></div>
  ) : (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-[#18192b] dark:via-[#232136] dark:to-[#18192b] py-8 px-2 md:px-6">
      <div className="w-full md:w-[90%] mx-auto mb-6">
        <div className="flex items-center justify-between mb-8">
          <Title title={'Team Members'} />
        </div>
        <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          <div className="relative w-full md:w-80">
            <input
              type="email"
              placeholder="Enter user email to add to team..."
              value={emailInput}
              onChange={handleEmailInput}
              className="w-full px-4 py-2 rounded-xl border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-[#232136] dark:text-white"
            />
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 bg-white dark:bg-[#232136] shadow-lg rounded-xl mt-1 z-10">
                {suggestions.map((user) => (
                  <div
                    key={user._id}
                    className="px-4 py-2 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900"
                    onClick={() => handleSuggestionClick(user)}
                  >
                    {user.name} ({user.email})
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button
            label={isAdding ? "Adding..." : "Add User"}
            icon={<IoMdAdd className="text-xl" />}
            iconPosition="left"
            className="flex gap-2 items-center bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-xl py-2.5 px-6 font-semibold shadow-lg hover:from-indigo-500 hover:to-blue-600 transition-all duration-200"
            onClick={handleAddUser}
            disabled={isAdding}
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
      <ConfirmatioDialog
        open={confirmRemoveOpen}
        setOpen={setConfirmRemoveOpen}
        msg={"Are you sure you want to remove this user from the team?"}
        setMsg={() => {}}
        type={"delete"}
        setType={() => {}}
        onClick={confirmRemoveUser}
      />
    </div>
  );
};

export default TeamUsers; 