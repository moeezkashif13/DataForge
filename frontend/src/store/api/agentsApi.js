import { baseApi } from './baseApi'

export const agentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAgents: builder.query({
      query: (organizationId) => {
        const params = organizationId ? `?organizationId=${organizationId}` : ''
        return `/execution-agent${params}`
      },
      transformResponse: (response) => {
        return response?.agents || []
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Agent', id })),
              { type: 'Agent', id: 'LIST' },
            ]
          : [{ type: 'Agent', id: 'LIST' }],
    }),

    getAgentById: builder.query({
      query: (agentId) => `/execution-agent/${agentId}`,
      transformResponse: (response) => {
        return response?.agent || null
      },
      providesTags: (result, error, id) => [{ type: 'Agent', id }],
    }),

    createAgent: builder.mutation({
      query: (agentData) => ({
        url: '/execution-agent/create',
        method: 'POST',
        body: agentData,
      }),
      invalidatesTags: [{ type: 'Agent', id: 'LIST' }],
    }),

    generateAgentToken: builder.mutation({
      query: ({ agentId, ...body }) => ({
        url: `/execution-agent/${agentId}/token`,
        method: 'POST',
        body,
      }),
    }),
  }),
})

export const {
  useGetAgentsQuery,
  useGetAgentByIdQuery,
  useCreateAgentMutation,
  useGenerateAgentTokenMutation,
} = agentsApi
