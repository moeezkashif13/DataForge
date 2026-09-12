import { baseApi } from "./baseApi";
import { setCredentials, logOut, setSessionChecked } from "../slices/authSlice";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: "/api/auth/sign-in/email",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth", "User"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            setCredentials({
              user: data?.user,
              session: data?.session,
              token: data?.token || data?.session?.token,
            }),
          );
        } catch {
          // Component handles errors
        }
      },
    }),

    registerOrganization: builder.mutation({
      query: (orgData) => ({
        url: "/organization/register",
        method: "POST",
        body: orgData,
      }),
      invalidatesTags: ["Auth", "User", "Organization"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            setCredentials({
              user: data?.user,
              session: data?.session,
              token: data?.token || data?.session?.token,
              organizationId: data?.organizationId,
            }),
          );
        } catch {
          // Component handles errors
        }
      },
    }),

    getSession: builder.query({
      query: () => "/api/auth/get-session",
      providesTags: ["Auth"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setSessionChecked(data));
        } catch {
          dispatch(setSessionChecked(null));
        }
      },
    }),

    logout: builder.mutation({
      query: () => ({
        url: "/api/auth/sign-out",
        method: "POST",
        body: {},
      }),
      invalidatesTags: ["Auth", "User"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(logOut());
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),

    getInvitation: builder.query({
      query: (token) => `/organization/invitation?token=${encodeURIComponent(token)}`,
      transformResponse: (response) => response?.invitation || null,
      providesTags: (result, error, token) => [
        { type: "Organization", id: `INVITATION_${token}` },
      ],
    }),

    acceptInvitation: builder.mutation({
      query: (payload) => ({
        url: "/organization/accept-invitation",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Auth", "User", "Organization"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            setCredentials({
              user: data?.user,
              session: data?.session,
              token: data?.token || data?.session?.token,
              organizationId: data?.organizationId,
            }),
          );
        } catch {
          // Component handles errors
        }
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterOrganizationMutation,
  useGetSessionQuery,
  useLogoutMutation,
  useGetInvitationQuery,
  useAcceptInvitationMutation,
} = authApi;

