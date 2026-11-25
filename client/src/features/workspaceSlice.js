import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../configs/api";

export const fetchWorkspaces = createAsyncThunk(
  "workspace/fetchWorkspaces",
  async ({ getToken, userId }, { rejectWithValue }) => {
    try {
      const token = await getToken();
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (userId) headers["x-user-id"] = userId;
      const { data } = await api.get("/api/workspaces", { headers });
      return data.workspaces || [];
    } catch (error) {
      console.log(error?.response?.data?.message || error.message);
      return rejectWithValue(error?.response?.data?.message || error.message);
    }
  },
);

const initialState = {
  workspaces: [],
  currentWorkspace: null,
  loading: false,
  error: null,
};

const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setWorkspaces: (state, action) => {
      state.workspaces = action.payload;
    },

    setCurrentWorkspace: (state, action) => {
      localStorage.setItem("currentWorkspaceId", action.payload);
      state.currentWorkspace = state.workspaces.find(
        (w) => w.id === action.payload,
      );
    },

    addWorkspace: (state, action) => {
      state.workspaces.push(action.payload);

      if (state.currentWorkspace?.id !== action.payload.id) {
        state.currentWorkspace = action.payload;
        localStorage.setItem("currentWorkspaceId", action.payload.id);
      }
    },

    updateWorkspace: (state, action) => {
      state.workspaces = state.workspaces.map((w) =>
        w.id === action.payload.id ? action.payload : w,
      );

      if (state.currentWorkspace?.id === action.payload.id) {
        state.currentWorkspace = action.payload;
        localStorage.setItem("currentWorkspaceId", action.payload.id);
      }
    },

    deleteWorkspace: (state, action) => {
      state.workspaces = state.workspaces.filter(
        (w) => w.id !== action.payload,
      );

      if (state.currentWorkspace?.id === action.payload) {
        state.currentWorkspace = state.workspaces[0] || null;

        if (state.currentWorkspace) {
          localStorage.setItem("currentWorkspaceId", state.currentWorkspace.id);
        } else {
          localStorage.removeItem("currentWorkspaceId");
        }
      }
    },

    addProject: (state, action) => {
      if (!state.currentWorkspace) return;

      state.currentWorkspace.projects.push(action.payload);

      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? { ...w, projects: w.projects.concat(action.payload) }
          : w,
      );
    },

    addTask: (state, action) => {
      if (!state.currentWorkspace) return;

      state.currentWorkspace.projects = state.currentWorkspace.projects.map(
        (p) => {
          if (p.id === action.payload.projectId) {
            return { ...p, tasks: p.tasks.concat(action.payload) };
          }
          return p;
        },
      );

      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? {
              ...w,
              projects: w.projects.map((p) =>
                p.id === action.payload.projectId
                  ? { ...p, tasks: p.tasks.concat(action.payload) }
                  : p,
              ),
            }
          : w,
      );
    },

    updateTask: (state, action) => {
      if (!state.currentWorkspace) return;

      state.currentWorkspace.projects = state.currentWorkspace.projects.map(
        (p) => {
          if (p.id === action.payload.projectId) {
            return {
              ...p,
              tasks: p.tasks.map((t) =>
                t.id === action.payload.id ? action.payload : t,
              ),
            };
          }
          return p;
        },
      );

      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? {
              ...w,
              projects: w.projects.map((p) =>
                p.id === action.payload.projectId
                  ? {
                      ...p,
                      tasks: p.tasks.map((t) =>
                        t.id === action.payload.id ? action.payload : t,
                      ),
                    }
                  : p,
              ),
            }
          : w,
      );
    },

    deleteTask: (state, action) => {
      if (!state.currentWorkspace) return;

      const { projectId, taskIds } = action.payload;

      state.currentWorkspace.projects = state.currentWorkspace.projects.map(
        (p) => {
          if (p.id === projectId) {
            return {
              ...p,
              tasks: p.tasks.filter((t) => !taskIds.includes(t.id)),
            };
          }
          return p;
        },
      );

      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? {
              ...w,
              projects: w.projects.map((p) =>
                p.id === projectId
                  ? {
                      ...p,
                      tasks: p.tasks.filter((t) => !taskIds.includes(t.id)),
                    }
                  : p,
              ),
            }
          : w,
      );
    },
  },

  extraReducers: (builder) => {
    builder.addCase(fetchWorkspaces.pending, (state) => {
      state.loading = true;
      state.error = null;
    });

    builder.addCase(fetchWorkspaces.fulfilled, (state, action) => {
      state.workspaces = action.payload;

      if (action.payload.length > 0) {
        const localStorageCurrentWorkspaceId =
          localStorage.getItem("currentWorkspaceId");

        if (localStorageCurrentWorkspaceId) {
          const findWorkspace = action.payload.find(
            (w) => w.id === localStorageCurrentWorkspaceId,
          );

          if (findWorkspace) {
            state.currentWorkspace = findWorkspace;
            localStorage.setItem("currentWorkspaceId", findWorkspace.id);
          } else {
            state.currentWorkspace = action.payload[0];
            localStorage.setItem("currentWorkspaceId", action.payload[0].id);
          }
        } else {
          state.currentWorkspace = action.payload[0];
          localStorage.setItem("currentWorkspaceId", action.payload[0].id);
        }
      } else {
        state.currentWorkspace = null;
        localStorage.removeItem("currentWorkspaceId");
      }

      state.loading = false;
    });

    builder.addCase(fetchWorkspaces.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || "Failed to fetch workspaces";
    });
  },
});

export const {
  setWorkspaces,
  setCurrentWorkspace,
  addWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addProject,
  addTask,
  updateTask,
  deleteTask,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
