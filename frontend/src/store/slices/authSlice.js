import { createSlice } from "@reduxjs/toolkit";

const loadInitialState = () => {
  try {
    const storedUser = localStorage.getItem("dataforge_user");
    const storedOrg = localStorage.getItem("dataforge_org_id");
    const storedToken = localStorage.getItem("dataforge_token");
    return {
      user: storedUser ? JSON.parse(storedUser) : null,
      token: storedToken || null,
      session: null,
      organizationId: storedOrg || null,
      isAuthenticated: Boolean(storedUser),
      isInitialized: false,
    };
  } catch {
    return {
      user: null,
      token: null,
      session: null,
      organizationId: null,
      isAuthenticated: false,
      isInitialized: false,
    };
  }
};

const authSlice = createSlice({
  name: "auth",
  initialState: loadInitialState(),
  reducers: {
    setCredentials: (state, action) => {
      const { user, organizationId, token, session } = action.payload || {};
      if (user !== undefined) state.user = user;

      if (organizationId !== undefined) {
        state.organizationId = organizationId;
      }

      const activeToken = token || session?.token;
      if (activeToken) {
        state.token = activeToken;
      }

      if (session !== undefined) {
        state.session = session;
      }

      state.isAuthenticated = Boolean(state.user);
      state.isInitialized = true;

      try {
        if (state.user) {
          localStorage.setItem("dataforge_user", JSON.stringify(state.user));
        }

        if (state.organizationId) {
          localStorage.setItem("dataforge_org_id", state.organizationId);
        }

        if (state.token) {
          localStorage.setItem("dataforge_token", state.token);
        }
      } catch (e) {
        console.error("Failed to sync auth state to localStorage", e);
      }
    },
    setSessionChecked: (state, action) => {
      state.isInitialized = true;
      if (action.payload) {
        const { user, session } = action.payload;
        if (user) state.user = user;
        if (session) {
          state.session = session;
          if (session.token) {
            state.token = session.token;
            try {
              localStorage.setItem("dataforge_token", session.token);
            } catch (e) {
              console.error(e);
            }
          }
        }
        state.isAuthenticated = Boolean(user);
        try {
          if (user)
            localStorage.setItem("dataforge_user", JSON.stringify(user));
        } catch (e) {
          console.error(e);
        }
      }
    },
    logOut: (state) => {
      state.user = null;
      state.token = null;
      state.session = null;
      state.organizationId = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
      try {
        localStorage.removeItem("dataforge_user");
        localStorage.removeItem("dataforge_token");
        localStorage.removeItem("dataforge_org_id");
      } catch (e) {
        console.error("Failed to remove auth keys from localStorage", e);
      }
    },
  },
});

export const { setCredentials, setSessionChecked, logOut } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state) => state.auth.user;
export const selectCurrentSession = (state) => state.auth.session;
export const selectAuthToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectIsAuthInitialized = (state) => state.auth.isInitialized;
export const selectOrganizationId = (state) => state.auth.organizationId;

