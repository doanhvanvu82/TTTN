import { Listbox, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState, useRef } from "react";
import { BsChevronExpand } from "react-icons/bs";
import { MdCheck } from "react-icons/md";
import { useGetTeamListsQuery, useGetPMTeamListsQuery } from "../../redux/slices/api/userApiSlice.js";
import { getInitials } from "../../utils/index.js";

export default function UserList({ team, setTeam }) {
  const { data, isLoading } = useGetPMTeamListsQuery();
  const [selectedUsers, setSelectedUsers] = useState([]);
  const dropdownRef = useRef();
  const buttonRef = useRef();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleChange = (user) => {
    let newSelected;
    if (selectedUsers.some(u => u._id === user._id)) {
      // Bỏ chọn
      newSelected = selectedUsers.filter(u => u._id !== user._id);
    } else {
      // Thêm vào
      newSelected = [...selectedUsers, user];
    }
    setSelectedUsers(newSelected);
    setTeam(newSelected.map(u => u._id));
  };

  useEffect(() => {
    // Không tự động chọn user nào
    if (!team || team.length === 0) {
      setSelectedUsers([]);
    } else {
      // Nếu có team (ví dụ khi edit task), set lại selected
      if (data && data.length > 0) {
        const selected = data.filter(u => team.includes(u._id));
        setSelectedUsers(selected);
      }
    }
  }, [isLoading, data, team]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <div className=''>
      <p className='text-slate-900 dark:text-gray-500'>Assign Task To:</p>
      <div className='relative mt-1'>
        <button
          type="button"
          ref={buttonRef}
          className="relative w-full cursor-default rounded bg-white pl-3 pr-10 text-left px-3 py-2.5 2xl:py-3 border border-gray-300 dark:border-gray-600 sm:text-sm"
          onClick={() => setDropdownOpen((open) => !open)}
        >
          <span className='block truncate'>
            {selectedUsers.length > 0 ? selectedUsers.map((user) => user.name).join(", ") : <span className="text-gray-400">Select users...</span>}
          </span>
          <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
            <BsChevronExpand className='h-5 w-5 text-gray-400' aria-hidden='true' />
          </span>
        </button>
        {dropdownOpen && (
          <div ref={dropdownRef} className="z-50 absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
            {data?.map((user, userIdx) => {
              const isSelected = selectedUsers.some(u => u._id === user._id);
              return (
                <div
                  key={user._id}
                  className={`relative cursor-pointer select-none py-2 pl-10 pr-4 ${isSelected ? "bg-amber-100 text-amber-900" : "text-gray-900"}`}
                  onClick={() => handleChange(user)}
                >
                  <div className={`flex items-center gap-2 truncate ${isSelected ? "font-medium" : "font-normal"}`}>
                    <div className={"w-6 h-6 rounded-full text-white flex items-center justify-center bg-violet-600"}>
                      <span className='text-center text-[10px]'>
                        {getInitials(user.name)}
                      </span>
                    </div>
                    <span>{user.name}</span>
                  </div>
                  {isSelected ? (
                    <span className='absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600'>
                      <MdCheck className='h-5 w-5' aria-hidden='true' />
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
