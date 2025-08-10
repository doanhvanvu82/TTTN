import TaskCard from "./TaskCard";

export default function BoardView({ tasks, refetch }) {
  return (
    <div className='w-full py-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 2xl:gap-10'>
      {tasks?.map((task, index) => (
        <TaskCard task={task} refetch={refetch} key={index} />
      ))}
    </div>
  );
};
