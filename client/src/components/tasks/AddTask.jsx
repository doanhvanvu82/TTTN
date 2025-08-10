import { Dialog } from "@headlessui/react";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { BiImages } from "react-icons/bi";
import { toast } from "sonner";
import { useSelector } from "react-redux";

import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useGetAllTaskQuery,
} from "../../redux/slices/api/taskApiSlice";
import { dateFormatter } from "../../utils";
import { app } from "../../utils/firebase";
import Button from "../Button";
import Loading from "../Loading";
import ModalWrapper from "../ModalWrapper";
import SelectList from "../SelectList";
import Textbox from "../Textbox";
import UserList from "./UsersSelect";

const LISTS = ["TODO", "IN PROGRESS", "COMPLETED"];
const PRIORIRY = ["HIGH", "MEDIUM", "NORMAL", "LOW"];

const uploadedFileURLs = [];

const uploadFile = async (file) => {
  const storage = getStorage(app);

  const name = new Date().getTime() + file.name;
  const storageRef = ref(storage, name);

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        console.log("Uploading");
      },
      (error) => {
        reject(error);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref)
          .then((downloadURL) => {
            uploadedFileURLs.push(downloadURL);
            resolve();
          })
          .catch((error) => {
            reject(error);
          });
      }
    );
  });
};

function toLocalISOString(date, defaultHour = 0, defaultMinute = 0) {
  const pad = (n) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours() || defaultHour)}:${pad(date.getMinutes() || defaultMinute)}`;
}

const AddTask = ({ open, setOpen, task }) => {
  const { user } = useSelector((state) => state.auth);
  
  // Check if user can create/edit tasks
  const canCreateTasks = user?.isProjectManager;
  const canEditTasks = user?.isProjectManager || 
                      (task && task.projectManager === user?._id) ||
                      (task && task.team?.some(member => member._id === user?._id));
  
  const defaultValues = {
    title: task?.title || "",
    date: task?.date
      ? toLocalISOString(new Date(task.date))
      : toLocalISOString(new Date()),
    startDate: task?.startDate
      ? toLocalISOString(new Date(task.startDate))
      : "",
    dueDate: task?.dueDate
      ? toLocalISOString(new Date(task.dueDate))
      : "",
    team: [],
    stage: "",
    priority: "",
    assets: [],
    description: "",
    links: "",
    estimatedHours: task?.estimatedHours || "",
  };
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({ defaultValues });

  const [stage, setStage] = useState(task?.stage?.toUpperCase() || LISTS[0]);
  const [team, setTeam] = useState(task?.team || []);
  const [priority, setPriority] = useState(
    task?.priority?.toUpperCase() || PRIORIRY[2]
  );
  const [assets, setAssets] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dependencies, setDependencies] = useState(task?.dependencies || []);

  const [createTask, { isLoading }] = useCreateTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const { data: allTasks } = useGetAllTaskQuery({ strQuery: "", isTrashed: "", search: "" });
  const URLS = task?.assets ? [...task.assets] : [];

  const handleOnSubmit = async (data) => {
    // Check permissions
    if (task && !canEditTasks) {
      toast.error("You don't have permission to edit this task. Only the Project Manager can edit tasks.");
      return;
    }
    
    if (!task && !canCreateTasks) {
      toast.error("You don't have permission to create tasks. Only Project Managers and Admins can create new tasks.");
      return;
    }

    if (assets && assets.length > 0) {
      setUploading(true);
      try {
        for (const file of assets) {
          await uploadFile(file);
        }
      } catch (error) {
        console.error("Error uploading file:", error.message);
        toast.error("Error uploading files. Please try again.");
        return;
      } finally {
        setUploading(false);
      }
    }

    try {
      // Lấy dateTime từ input datetime-local
      let dateTimeISO = data.date;
      if (dateTimeISO) {
        dateTimeISO = new Date(dateTimeISO).toISOString();
      }
      let startDateISO = data.startDate;
      if (startDateISO) {
        startDateISO = new Date(startDateISO).toISOString();
      }
      let dueDateISO = data.dueDate;
      if (dueDateISO) {
        dueDateISO = new Date(dueDateISO).toISOString();
      }
      // Server sẽ tự động xử lý PM, client chỉ gửi team được chọn
      let teamToSend = Array.isArray(team) ? [...team] : [];
      const newData = {
        ...data,
        date: dateTimeISO,
        startDate: startDateISO,
        dueDate: dueDateISO,
        assets: [...URLS, ...uploadedFileURLs],
        team: teamToSend,
        stage,
        priority,
        dependencies,
        estimatedHours: data.estimatedHours ? parseFloat(data.estimatedHours) : null,
      };
      console.log(data, newData);
      const res = task?._id
        ? await updateTask({ ...newData, _id: task._id }).unwrap()
        : await createTask(newData).unwrap();

      toast.success(res.message);

      // Reset form nếu là tạo mới
      if (!task?._id) {
        reset();
        setStage(LISTS[0]);
        setTeam([]);
        setPriority(PRIORIRY[2]);
        setAssets([]);
        setDependencies([]);
      }

      setTimeout(() => {
        setOpen(false);
        if (refetch) {
          console.log('🔄 Calling refetch after task operation...');
          refetch();
        }
      }, 500);
    } catch (err) {
      console.log(err);
      toast.error(err?.data?.message || err.error);
    }
  };

  const handleSelect = (e) => {
    const files = Array.from(e.target.files);
    setAssets(files);
  };

  const removeAsset = (index) => {
    const newAssets = Array.from(assets).filter((_, i) => i !== index);
    setAssets(newAssets);
  };

  const handleDependencyChange = (taskId) => {
    if (dependencies.includes(taskId)) {
      setDependencies(dependencies.filter(id => id !== taskId));
    } else {
      setDependencies([...dependencies, taskId]);
    }
  };

  return (
    <>
      <ModalWrapper open={open} setOpen={setOpen}>
        <form onSubmit={handleSubmit(handleOnSubmit)}>
          <Dialog.Title
            as='h2'
            className='text-base font-bold leading-6 text-gray-900 mb-4'
          >
            {task ? "UPDATE TASK" : "ADD TASK"}
          </Dialog.Title>

          <div className='mt-2 flex flex-col gap-6'>
            <Textbox
              placeholder='Task title'
              type='text'
              name='title'
              label='Task Title'
              className='w-full rounded'
              register={register("title", {
                required: "Title is required!",
              })}
              error={errors.title ? errors.title.message : ""}
            />
            <UserList setTeam={setTeam} team={team} />
            <div className='flex gap-4'>
              <SelectList
                label='Task Stage'
                lists={LISTS}
                selected={stage}
                setSelected={setStage}
              />
              <SelectList
                label='Priority Level'
                lists={PRIORIRY}
                selected={priority}
                setSelected={setPriority}
              />
            </div>
            <div className='flex gap-4'>
              <div className='w-full'>
                <Textbox
                  placeholder='Date & Time'
                  type='datetime-local'
                  name='date'
                  label='Task Date & Time'
                  className='w-full rounded'
                  register={register("date", {
                    required: "Date & Time is required!",
                  })}
                  error={errors.date ? errors.date.message : ""}
                />
              </div>
              <div className='w-full'>
                <Textbox
                  placeholder='Start Date & Time'
                  type='datetime-local'
                  name='startDate'
                  label='Start Date & Time (Optional)'
                  className='w-full rounded'
                  register={register("startDate")}
                  onChange={e => {
                    if (e.target.value && e.target.value.length === 10) {
                      // Nếu chỉ chọn ngày, tự động set giờ 23:59
                      e.target.value = e.target.value + 'T23:59';
                    }
                  }}
                />
              </div>
            </div>
            <div className='flex gap-4'>
              <div className='w-full'>
                <Textbox
                  placeholder='Due Date & Time'
                  type='datetime-local'
                  name='dueDate'
                  label='Due Date & Time (Optional)'
                  className='w-full rounded'
                  register={register("dueDate")}
                  onChange={e => {
                    if (e.target.value && e.target.value.length === 10) {
                      e.target.value = e.target.value + 'T23:59';
                    }
                  }}
                />
              </div>
              <div className='w-full'>
                <Textbox
                  placeholder='Estimated Hours'
                  type='number'
                  name='estimatedHours'
                  label='Estimated Hours (Optional)'
                  className='w-full rounded'
                  register={register("estimatedHours")}
                />
              </div>
            </div>
            
            {/* Dependencies Section */}
            {allTasks?.tasks && allTasks.tasks.length > 0 && (
              <div className='w-full'>
                <p className='text-sm font-medium text-gray-700 mb-2'>Dependencies (Optional)</p>
                <div className='max-h-32 overflow-y-auto border border-gray-300 rounded p-2'>
                  {allTasks.tasks
                    .filter(t => t._id !== task?._id) // Exclude current task
                    .map((t) => (
                      <label key={t._id} className='flex items-center gap-2 mb-1'>
                        <input
                          type='checkbox'
                          checked={dependencies.includes(t._id)}
                          onChange={() => handleDependencyChange(t._id)}
                          className='rounded'
                        />
                        <span className='text-sm'>{t.title}</span>
                      </label>
                    ))}
                </div>
              </div>
            )}

            <div className='w-full'>
              <div className='flex items-center justify-center mb-4'>
                <label
                  className='flex items-center gap-1 text-base text-ascent-2 hover:text-ascent-1 cursor-pointer my-4'
                  htmlFor='imgUpload'
                >
                  <input
                    type='file'
                    className='hidden'
                    id='imgUpload'
                    onChange={(e) => handleSelect(e)}
                    accept='.jpg, .png, .jpeg'
                    multiple={true}
                  />
                  <BiImages />
                  <span>Add Assets</span>
                </label>
              </div>
              
              {/* Display selected assets */}
              <div className='w-full'>
                {assets && assets.length > 0 ? (
                  <>
                    <p className='text-sm font-medium text-gray-700 mb-2'>
                      Selected Assets ({assets.length} file{assets.length > 1 ? 's' : ''})
                    </p>
                    <div className='max-h-32 overflow-y-auto border border-gray-300 rounded p-2 space-y-2'>
                      {Array.from(assets).map((file, index) => (
                        <div key={index} className='flex items-center justify-between bg-gray-50 p-2 rounded'>
                          <div className='flex items-center gap-2 flex-1 min-w-0'>
                            {file.type.startsWith('image/') ? (
                              <img 
                                src={URL.createObjectURL(file)} 
                                alt={file.name}
                                className='w-8 h-8 object-cover rounded flex-shrink-0'
                              />
                            ) : (
                              <BiImages className='text-blue-500 flex-shrink-0' />
                            )}
                            <div className='flex-1 min-w-0'>
                              <p className='text-sm font-medium text-gray-900 truncate'>{file.name}</p>
                              <p className='text-xs text-gray-500'>
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            type='button'
                            onClick={() => removeAsset(index)}
                            className='text-red-500 hover:text-red-700 text-sm font-medium ml-2'
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className='text-center text-gray-500 text-sm py-2'>
                    No assets selected. Click "Add Assets" to select files.
                  </div>
                )}
              </div>
            </div>

            <div className='w-full'>
              <p>Task Description</p>
              <textarea
                name='description'
                {...register("description")}
                className='w-full bg-transparent px-3 py-1.5 2xl:py-3 border border-gray-300
            dark:border-gray-600 placeholder-gray-300 dark:placeholder-gray-700
            text-gray-900 dark:text-white outline-none text-base focus:ring-2
            ring-blue-300'
              ></textarea>
            </div>

            <div className='w-full'>
              <p>
                Add Links{" "}
                <span className='text- text-gray-600'>
                  seperated by comma (,)
                </span>
              </p>
              <textarea
                name='links'
                {...register("links")}
                className='w-full bg-transparent px-3 py-1.5 2xl:py-3 border border-gray-300
            dark:border-gray-600 placeholder-gray-300 dark:placeholder-gray-700
            text-gray-900 dark:text-white outline-none text-base focus:ring-2
            ring-blue-300'
              ></textarea>
            </div>
          </div>

          {isLoading || isUpdating || uploading ? (
            <div className='py-4'>
              <Loading />
            </div>
          ) : (
            <div className='bg-gray-50 mt-6 mb-4 sm:flex sm:flex-row-reverse gap-4'>
              <Button
                label='Submit'
                type='submit'
                className='bg-blue-600 px-8 text-sm font-semibold text-white hover:bg-blue-700  sm:w-auto'
              />

              <Button
                type='button'
                className='bg-white px-5 text-sm font-semibold text-gray-900 sm:w-auto'
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

export default AddTask;
