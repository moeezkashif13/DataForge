import { createSlice } from "@reduxjs/toolkit";

const loadInitialState = () => {
  try {
    const storedUser = localStorage.getItem("dataforge_user");
    const storedOrg = localStorage.getItem("dataforge_org_id");
    return {
      user: storedUser ? JSON.parse(storedUser) : null,
      organizationId: storedOrg || null,
      isAuthenticated: Boolean(storedUser),
      isInitialized: false,
    };
  } catch {
    return {
      user: null,
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
      const { user, organizationId } = action.payload || {};
      if (user !== undefined) state.user = user;

      if (organizationId !== undefined) {
        state.organizationId = organizationId;
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
      } catch (e) {
        console.error("Failed to sync auth state to localStorage", e);
      }
    },
    setSessionChecked: (state, action) => {
      state.isInitialized = true;
      if (action.payload) {
        const { user, session } = action.payload;
        if (user) state.user = user;
        state.isAuthenticated = Boolean(user);
        try {
          if (user)
            localStorage.setItem("dataforge_user", JSON.stringify(user));
        } catch (e) {
          console.error(e);
        }
      } else {
      }
    },
    logOut: (state) => {
      state.user = null;
      state.organizationId = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
      try {
        localStorage.removeItem("dataforge_user");
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
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectIsAuthInitialized = (state) => state.auth.isInitialized;
export const selectOrganizationId = (state) => state.auth.organizationId;
