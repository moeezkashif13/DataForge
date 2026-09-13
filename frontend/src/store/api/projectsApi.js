import { setCredentials } from "../slices/authSlice";
import { baseApi } from "./baseApi";

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query({
      query: (organizationId) => {
        const params = organizationId
          ? `?organizationId=${organizationId}`
          : "";
        return `/organization/projects${params}`;
      },
      transformResponse: (response) => {
        return response?.projects || [];
      },
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          dispatch(
            setCredentials({
              organizationId: data[0]?.organizationId,
            }),
          );
        } catch {
          // Component handles errors
        }
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Project", id })),
              { type: "Project", id: "LIST" },
            ]
          : [{ type: "Project", id: "LIST" }],
    }),

    getProjectById: builder.query({
      query: (id) => `/organization/projects/${id}`,
      transformResponse: (response) => {
        return response?.project || null;
      },
      providesTags: (result, error, id) => [{ type: "Project", id }],
    }),

    createProject: builder.mutation({
      query: (projectData) => ({
        url: "/organization/projects/create",
        method: "POST",
        body: projectData,
      }),
      invalidatesTags: [{ type: "Project", id: "LIST" }],
    }),

    deleteProject: builder.mutation({
      query: (projectId) => ({
        url: `/organization/projects/${projectId}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Project", id: "LIST" }],
    }),

    addProjectMember: builder.mutation({
      query: ({ projectId, userId, userIds, role }) => ({
        url: `/organization/projects/${projectId}/users`,
        method: "POST",
        body: { userId, userIds, role },
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "Project", id: projectId },
        { type: "Project", id: "LIST" },
      ],
    }),

    removeProjectMember: builder.mutation({
      query: ({ projectId, userId }) => ({
        url: `/organization/projects/${projectId}/users/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "Project", id: projectId },
        { type: "Project", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useAddProjectMemberMutation,
  useRemoveProjectMemberMutation,
} = projectsApi;
