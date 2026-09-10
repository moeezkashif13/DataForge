import { baseApi } from './baseApi'

export const migrationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMigrations: builder.query({
      query: (projectId) => {
        const params = projectId ? `?projectId=${projectId}` : ''
        return `/migrations${params}`
      },
      transformResponse: (response) => {
        return response?.migrations || []
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Migration', id })),
              { type: 'Migration', id: 'LIST' },
            ]
          : [{ type: 'Migration', id: 'LIST' }],
    }),

    createMigration: builder.mutation({
      query: (migrationData) => ({
        url: '/migrations/create',
        method: 'POST',
        body: migrationData,
      }),
      invalidatesTags: [
        { type: 'Migration', id: 'LIST' },
        { type: 'Project', id: 'LIST' },
      ],
    }),
  }),
})

export const { useGetMigrationsQuery, useCreateMigrationMutation } = migrationsApi
