import { baseApi } from "./baseApi";

export const organizationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrganizationMembers: builder.query({
      query: (organizationId) => {
        const params = organizationId ? `?organizationId=${organizationId}` : "";
        return `/organization/members${params}`;
      },
      transformResponse: (response) => {
        return response?.members || [];
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Organization", id })),
              { type: "Organization", id: "MEMBERS" },
            ]
          : [{ type: "Organization", id: "MEMBERS" }],
    }),

    inviteMember: builder.mutation({
      query: (inviteData) => ({
        url: "/organization/invite",
        method: "POST",
        body: inviteData,
      }),
      invalidatesTags: [{ type: "Organization", id: "MEMBERS" }],
    }),

    updateMemberPermissions: builder.mutation({
      query: ({ memberId, organizationId, permissionNames }) => ({
        url: `/organization/members/${memberId}/permissions`,
        method: "PUT",
        body: { organizationId, permissionNames },
      }),
      invalidatesTags: [{ type: "Organization", id: "MEMBERS" }],
    }),
  }),
});

export const {
  useGetOrganizationMembersQuery,
  useInviteMemberMutation,
  useUpdateMemberPermissionsMutation,
} = organizationApi;
