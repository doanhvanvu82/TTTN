import { TASKS_URL } from "../../../utils/contants";
import { apiSlice } from "../apiSlice";

export const postApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createTask: builder.mutation({
      query: (data) => ({
        url: `${TASKS_URL}/create`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
    }),

    duplicateTask: builder.mutation({
      query: (id) => ({
        url: `${TASKS_URL}/duplicate/${id}`,
        method: "POST",
        body: {},
        credentials: "include",
      }),
    }),

    updateTask: builder.mutation({
      query: (data) => ({
        url: `${TASKS_URL}/update/${data._id}`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
    }),

    getAllTask: builder.query({
      query: ({ strQuery, isTrashed, search }) => ({
        url: `${TASKS_URL}?stage=${strQuery}&isTrashed=${isTrashed}&search=${search}`,
        method: "GET",
        credentials: "include",
      }),
    }),

    getSingleTask: builder.query({
      query: (id) => ({
        url: `${TASKS_URL}/${id}`,
        method: "GET",
        credentials: "include",
      }),
    }),

    createSubTask: builder.mutation({
      query: ({ data, id }) => ({
        url: `${TASKS_URL}/create-subtask/${id}`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
    }),

    postTaskActivity: builder.mutation({
      query: ({ data, id }) => ({
        url: `${TASKS_URL}/activity/${id}`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
    }),

    trashTast: builder.mutation({
      query: ({ id }) => ({
        url: `${TASKS_URL}/${id}`,
        method: "PUT",
        credentials: "include",
      }),
    }),

    deleteRestoreTast: builder.mutation({
      query: ({ id, actionType }) => ({
        url: `${TASKS_URL}/delete-restore/${id}?actionType=${actionType}`,
        method: "DELETE",
        credentials: "include",
      }),
    }),

    getDasboardStats: builder.query({
      query: () => ({
        url: `${TASKS_URL}/dashboard`,
        method: "GET",
        credentials: "include",
      }),
    }),

    changeTaskStage: builder.mutation({
      query: (data) => ({
        url: `${TASKS_URL}/change-stage/${data?.id}`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
    }),

    changeSubTaskStatus: builder.mutation({
      query: (data) => ({
        url: `${TASKS_URL}/change-status/${data?.id}/${data?.subId}`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
    }),

    // Comments endpoints
    addComment: builder.mutation({
      query: ({ taskId, content, mentions }) => ({
        url: `${TASKS_URL}/${taskId}/comments`,
        method: "POST",
        body: { content, mentions },
        credentials: "include",
      }),
    }),

    updateComment: builder.mutation({
      query: ({ taskId, commentId, content }) => ({
        url: `${TASKS_URL}/${taskId}/comments/${commentId}`,
        method: "PUT",
        body: { content },
        credentials: "include",
      }),
    }),

    deleteComment: builder.mutation({
      query: ({ taskId, commentId }) => ({
        url: `${TASKS_URL}/${taskId}/comments/${commentId}`,
        method: "DELETE",
        credentials: "include",
      }),
    }),

    // Reminders endpoints
    addReminder: builder.mutation({
      query: ({ taskId, type, time, message }) => ({
        url: `${TASKS_URL}/${taskId}/reminders`,
        method: "POST",
        body: { type, time, message },
        credentials: "include",
      }),
    }),

    deleteReminder: builder.mutation({
      query: ({ taskId, reminderId }) => ({
        url: `${TASKS_URL}/${taskId}/reminders/${reminderId}`,
        method: "DELETE",
        credentials: "include",
      }),
    }),

    // Calendar view
    getTasksForCalendar: builder.query({
      query: ({ startDate, endDate }) => ({
        url: `${TASKS_URL}/calendar?startDate=${startDate}&endDate=${endDate}`,
        method: "GET",
        credentials: "include",
      }),
    }),

    // Performance reports
    getPerformanceReport: builder.query({
      query: ({ startDate, endDate, memberId }) => ({
        url: `${TASKS_URL}/performance?startDate=${startDate}&endDate=${endDate}&memberId=${memberId || ""}`,
        method: "GET",
        credentials: "include",
      }),
    }),

    getTaskTeam: builder.query({
      query: (taskId) => ({
        url: `${TASKS_URL}/${taskId}/team`,
        method: "GET",
        credentials: "include",
      }),
    }),
  }),
});

export const {
  usePostTaskActivityMutation,
  useCreateTaskMutation,
  useGetAllTaskQuery,
  useCreateSubTaskMutation,
  useTrashTastMutation,
  useDeleteRestoreTastMutation,
  useDuplicateTaskMutation,
  useUpdateTaskMutation,
  useGetSingleTaskQuery,
  useGetDasboardStatsQuery,
  useChangeTaskStageMutation,
  useChangeSubTaskStatusMutation,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useAddReminderMutation,
  useDeleteReminderMutation,
  useGetTasksForCalendarQuery,
  useGetPerformanceReportQuery,
  useGetTaskTeamQuery,
} = postApiSlice;
