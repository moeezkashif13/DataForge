import { baseApi } from './baseApi'

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query({
      query: (organizationId) => {
        const params = organizationId ? `?organizationId=${organizationId}` : ''
        return `/organization/projects${params}`
      },
      transformResponse: (response) => {
        return response?.projects || []
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Project', id })),
              { type: 'Project', id: 'LIST' },
            ]
          : [{ type: 'Project', id: 'LIST' }],
    }),

    createProject: builder.mutation({
      query: (projectData) => ({
        url: '/organization/projects/create',
        method: 'POST',
        body: projectData,
      }),
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    }),
  }),
})

export const { useGetProjectsQuery, useCreateProjectMutation } = projectsApi
