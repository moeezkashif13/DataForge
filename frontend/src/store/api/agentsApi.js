import { baseApi } from './baseApi'

export const agentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAgents: builder.query({
      query: (arg) => {
        const searchParams = new URLSearchParams()
        if (typeof arg === 'string') {
          if (arg) searchParams.append('organizationId', arg)
        } else if (arg && typeof arg === 'object') {
          if (arg.organizationId) searchParams.append('organizationId', arg.organizationId)
          if (arg.projectId) searchParams.append('projectId', arg.projectId)
        }
        const qs = searchParams.toString()
        return `/execution-agent${qs ? `?${qs}` : ''}`
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

    deleteAgent: builder.mutation({
      query: (agentId) => ({
        url: `/execution-agent/${agentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Agent', id },
        { type: 'Agent', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetAgentsQuery,
  useGetAgentByIdQuery,
  useCreateAgentMutation,
  useGenerateAgentTokenMutation,
  useDeleteAgentMutation,
} = agentsApi
