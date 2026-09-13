import { baseApi } from "./baseApi";

export const migrationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMigrations: builder.query({
      query: (id) => `/migrations`,

      transformResponse: (response) => {
        return response?.migrations || [];
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Migration", id })),
              { type: "Migration", id: "LIST" },
            ]
          : [{ type: "Migration", id: "LIST" }],
    }),

    getMigrationById: builder.query({
      query: (id) => `/migrations/${id}`,
      transformResponse: (response) => {
        return response?.migration || null;
      },
      providesTags: (result, error, id) => [{ type: "Migration", id }],
    }),

    createMigration: builder.mutation({
      query: (migrationData) => ({
        url: "/migrations/create",
        method: "POST",
        body: migrationData,
      }),
      invalidatesTags: [
        { type: "Migration", id: "LIST" },
        { type: "Project", id: "LIST" },
      ],
    }),

    deleteMigration: builder.mutation({
      query: (migrationId) => ({
        url: `/migrations/${migrationId}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Migration", id: "LIST" },
        { type: "Project", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetMigrationsQuery,
  useGetMigrationByIdQuery,
  useCreateMigrationMutation,
  useDeleteMigrationMutation,
} = migrationsApi;
