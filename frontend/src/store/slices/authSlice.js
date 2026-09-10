import { createSlice } from '@reduxjs/toolkit'

const loadInitialState = () => {
  try {
    const storedUser = localStorage.getItem('dataforge_user')
    const storedToken = localStorage.getItem('dataforge_token')
    const storedOrg = localStorage.getItem('dataforge_org_id')
    return {
      user: storedUser ? JSON.parse(storedUser) : null,
      token: storedToken || null,
      organizationId: storedOrg || null,
      isAuthenticated: Boolean(storedToken || storedUser),
      isInitialized: false,
    }
  } catch {
    return {
      user: null,
      token: null,
      organizationId: null,
      isAuthenticated: false,
      isInitialized: false,
    }
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadInitialState(),
  reducers: {
    setCredentials: (state, action) => {
      const { user, token, session, organizationId } = action.payload || {}
      if (user !== undefined) state.user = user
      if (token !== undefined) state.token = token
      else if (session?.token) state.token = session.token

      if (organizationId !== undefined) {
        state.organizationId = organizationId
      }

      state.isAuthenticated = Boolean(state.user || state.token)
      state.isInitialized = true

      try {
        if (state.user) {
          localStorage.setItem('dataforge_user', JSON.stringify(state.user))
        }
        if (state.token) {
          localStorage.setItem('dataforge_token', state.token)
        }
        if (state.organizationId) {
          localStorage.setItem('dataforge_org_id', state.organizationId)
        }
      } catch (e) {
        console.error('Failed to sync auth state to localStorage', e)
      }
    },
    setSessionChecked: (state, action) => {
      state.isInitialized = true
      if (action.payload) {
        const { user, session } = action.payload
        if (user) state.user = user
        if (session?.token) state.token = session.token
        state.isAuthenticated = Boolean(user)
        try {
          if (user) localStorage.setItem('dataforge_user', JSON.stringify(user))
          if (session?.token) localStorage.setItem('dataforge_token', session.token)
        } catch (e) {
          console.error(e)
        }
      } else {
        if (!state.token) {
          state.user = null
          state.isAuthenticated = false
          try {
            localStorage.removeItem('dataforge_user')
            localStorage.removeItem('dataforge_token')
            localStorage.removeItem('dataforge_org_id')
          } catch (e) {
            console.error(e)
          }
        }
      }
    },
    logOut: (state) => {
      state.user = null
      state.token = null
      state.organizationId = null
      state.isAuthenticated = false
      state.isInitialized = true
      try {
        localStorage.removeItem('dataforge_user')
        localStorage.removeItem('dataforge_token')
        localStorage.removeItem('dataforge_org_id')
      } catch (e) {
        console.error('Failed to remove auth keys from localStorage', e)
      }
    },
  },
})

export const { setCredentials, setSessionChecked, logOut } = authSlice.actions
export default authSlice.reducer

export const selectCurrentUser = (state) => state.auth.user
export const selectCurrentToken = (state) => state.auth.token
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectIsAuthInitialized = (state) => state.auth.isInitialized
export const selectOrganizationId = (state) => state.auth.organizationId
