import { USERS_URL } from "../../../utils/contants";
import { apiSlice } from "../apiSlice";

export const userApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    updateUser: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/profile`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
    }),

    getTeamLists: builder.query({
      query: ({ search }) => ({
        url: `${USERS_URL}/get-team?search=${search}`,
        method: "GET",
        credentials: "include",
      }),
    }),

    getUserTaskStatus: builder.query({
      query: () => ({
        url: `${USERS_URL}/get-status`,
        method: "GET",
        credentials: "include",
      }),
    }),

    getNotifications: builder.query({
      query: () => ({
        url: `${USERS_URL}/notifications`,
        method: "GET",
        credentials: "include",
      }),
    }),

    deleteUser: builder.mutation({
      query: (id) => ({
        url: `${USERS_URL}/${id}`,
        method: "DELETE",
        credentials: "include",
      }),
    }),

    userAction: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/${data?.id}`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
    }),

    markNotiAsRead: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/read-noti?isReadType=${data.type}&id=${data?.id}`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
    }),

    changePassword: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/change-password`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
    }),

    // New notification endpoints
    getNewNotifications: builder.query({
      query: ({ page = 1, limit = 20, unreadOnly = false }) => ({
        url: `${USERS_URL}/notifications/new?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`,
        method: "GET",
        credentials: "include",
      }),
    }),

    getUnreadNotificationCount: builder.query({
      query: () => ({
        url: `${USERS_URL}/notifications/unread-count`,
        method: "GET",
        credentials: "include",
      }),
    }),

    markNotificationAsRead: builder.mutation({
      query: (notificationId) => ({
        url: `${USERS_URL}/notifications/${notificationId}/read`,
        method: "PUT",
        credentials: "include",
      }),
    }),

    markAllNotificationsAsRead: builder.mutation({
      query: () => ({
        url: `${USERS_URL}/notifications/read-all`,
        method: "PUT",
        credentials: "include",
      }),
    }),

    deleteNotification: builder.mutation({
      query: (notificationId) => ({
        url: `${USERS_URL}/notifications/${notificationId}`,
        method: "DELETE",
        credentials: "include",
      }),
    }),

    deleteAllNotifications: builder.mutation({
      query: () => ({
        url: `${USERS_URL}/notifications`,
        method: "DELETE",
        credentials: "include",
      }),
    }),

    addUserByAdmin: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/add-user`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
    }),

    addUserToTeam: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/team/add`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
    }),

    removeUserFromTeam: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/team/remove`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
    }),

    getPMTeamLists: builder.query({
      query: () => ({
        url: `${USERS_URL}/pm-team`,
        method: "GET",
        credentials: "include",
      }),
    }),

    // Search users by name or email (for Add by Email)
    searchUsers: builder.query({
      query: (q) => ({
        url: `${USERS_URL}/search?q=${encodeURIComponent(q)}`,
        method: "GET",
        credentials: "include",
      }),
    }),
  }),
});

export const {
  useUpdateUserMutation,
  useGetTeamListsQuery,
  useDeleteUserMutation,
  useUserActionMutation,
  useChangePasswordMutation,
  useGetNotificationsQuery,
  useMarkNotiAsReadMutation,
  useGetUserTaskStatusQuery,
  useGetNewNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  useDeleteAllNotificationsMutation,
  useAddUserByAdminMutation,
  useAddUserToTeamMutation,
  useRemoveUserFromTeamMutation,
  useGetPMTeamListsQuery,
  useSearchUsersQuery,
} = userApiSlice;
