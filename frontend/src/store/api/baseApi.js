import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_BACKEND_URL,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const state = getState();
    const token = state?.auth?.token || localStorage.getItem("dataforge_token");
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: rawBaseQuery,
  tagTypes: [
    "Auth",
    "User",
    "Organization",
    "Project",
    "Agent",
    "Migration",
    "Activity",
  ],
  endpoints: () => ({}),
});
