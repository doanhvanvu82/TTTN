import { Dialog } from "@headlessui/react";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { useRegisterMutation } from "../redux/slices/api/authApiSlice";
import { useUpdateUserMutation, useAddUserByAdminMutation, useSearchUsersQuery } from "../redux/slices/api/userApiSlice";
import { setCredentials } from "../redux/slices/authSlice";
import { Button, Loading, ModalWrapper, Textbox } from "./";

const AddUser = ({ open, setOpen, userData, onSuccess }) => {
  let defaultValues = userData ?? {};
  const { user } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
  } = useForm({ defaultValues });

  const [emailInput, setEmailInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedEmail, setDebouncedEmail] = useState("");
  const debounceTimeout = useRef();

  // Debounce email input
  useEffect(() => {
    if (emailInput) {
      setShowSuggestions(true);
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      debounceTimeout.current = setTimeout(() => {
        setDebouncedEmail(emailInput);
      }, 500);
    } else {
      setShowSuggestions(false);
      setDebouncedEmail("");
    }
    return () => debounceTimeout.current && clearTimeout(debounceTimeout.current);
  }, [emailInput]);

  // Gọi API searchUsers
  const { data: suggestions = [], isLoading: isSuggesting } = useSearchUsersQuery(debouncedEmail, { skip: !debouncedEmail });

  // Khi chọn suggestion, fill vào ô email
  const handleSuggestionClick = (user) => {
    setEmailInput(user.email);
    setShowSuggestions(false);
    reset({ ...getValues(), email: user.email });
  };

  useEffect(() => {
    if (userData && typeof userData === "object") {
      reset(userData);
    } else {
      reset({ name: "", title: "", email: "", company: "", role: "member" });
    }
  }, [userData, reset]);

  const dispatch = useDispatch();

  const [addNewUser, { isLoading }] = useRegisterMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [addUserByAdmin, { isLoading: isAdding }] = useAddUserByAdminMutation();

  const handleOnSubmit = async (data) => {
    try {
      if (userData) {
        const res = await updateUser(data).unwrap();
        toast.success(res?.message);
        if (userData?._id === user?._id) {
          dispatch(setCredentials({ ...res?.user }));
        }
      } else {
        await addUserByAdmin({
          ...data,
          password: data?.email,
        }).unwrap();
        toast.success("New User added successfully");
      }

      if (onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => {
          setOpen(false);
        }, 1500);
      }
    } catch (err) {
      console.log(err);
      toast.error(err?.data?.message || err.error);
    }
  };

  return (
    <>
      <ModalWrapper open={open} setOpen={setOpen}>
        <form onSubmit={handleSubmit(handleOnSubmit)} className=''>
          <Dialog.Title
            as='h2'
            className='text-base font-bold leading-6 text-gray-900 mb-4'
          >
            {userData ? "UPDATE PROFILE" : "ADD NEW USER"}
          </Dialog.Title>
          <div className='mt-2 flex flex-col gap-6'>
            <Textbox
              placeholder='Full name'
              type='text'
              name='name'
              label='Full Name'
              className='w-full rounded'
              register={register("name", {
                required: "Full name is required!",
              })}
              error={errors.name ? errors.name.message : ""}
            />
            <Textbox
              placeholder='Software Developer'
              type='text'
              name='title'
              label='Job Title (Optional)'
              className='w-full rounded-full'
              register={register("title")}
              error={errors.title ? errors.title.message : ""}
            />
            <Textbox
              placeholder='Email Address'
              type='email'
              name='email'
              label='Email Address'
              className='w-full rounded'
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              register={register("email", {
                required: "Email Address is required!",
              })}
              error={errors.email ? errors.email.message : ""}
            />
            {/* Gợi ý email */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="border rounded bg-white shadow max-h-48 overflow-y-auto absolute z-10 w-full mt-1">
                {suggestions.map((user) => (
                  <div
                    key={user.email}
                    className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                    onClick={() => handleSuggestionClick(user)}
                  >
                    <span className="font-medium">{user.name}</span> <span className="text-gray-500">({user.email})</span>
                  </div>
                ))}
              </div>
            )}
            <Textbox
              placeholder='Your Company Name'
              type='text'
              name='company'
              label='Company (Optional)'
              className='w-full rounded-full'
              register={register("company")}
              error={errors.company ? errors.company.message : ""}
            />

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Role
              </label>
              <select
                {...register("role", { required: "Please select a role" })}
                className='w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
                defaultValue={userData?.role || "member"}
              >
                <option value="member">Team Member</option>
                <option value="project_manager">Project Manager</option>
              </select>
              {errors.role && (
                <p className='text-red-500 text-sm mt-1'>{errors.role.message}</p>
              )}
            </div>
          </div>

          {isLoading || isUpdating || isAdding || isSuggesting ? (
            <div className='py-5'>
              <Loading />
            </div>
          ) : (
            <div className='py-3 mt-4 sm:flex sm:flex-row-reverse gap-3'>
              <Button
                type='submit'
                className='bg-blue-600 px-8 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto'
                label='Submit'
              />

              <Button
                type='button'
                className='bg-white px-6 py-2 text-sm font-semibold text-gray-900 sm:w-auto'
                onClick={() => setOpen(false)}
                label='Cancel'
              />
            </div>
          )}
        </form>
      </ModalWrapper>
    </>
  );
};

export default AddUser;
