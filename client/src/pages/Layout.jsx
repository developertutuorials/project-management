import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loadTheme } from "../features/themeSlice";
import { Loader2Icon } from "lucide-react";
import { useAuth, useUser, useOrganization, useOrganizationList, CreateOrganization } from "@clerk/react";
import { fetchWorkspaces, addWorkspace } from "../features/workspaceSlice";
import api from "../configs/api";
import toast from "react-hot-toast";

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [workspaceNameInput, setWorkspaceNameInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { workspaces } = useSelector((state) => state.workspace);
  const dispatch = useDispatch();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const { userMemberships, setActive } = useOrganizationList({ userMemberships: true });
  const location = useLocation();

  useEffect(() => {
    dispatch(loadTheme());
  }, [dispatch]);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const syncWorkspace = async () => {
      setIsFetching(true);

      const result = await dispatch(fetchWorkspaces({ getToken, userId: user.id }));
      const fetched = result.payload;

      // Find organization from active org or user memberships
      const targetOrg = organization || userMemberships?.data?.[0]?.organization;

      if (Array.isArray(fetched) && fetched.length === 0 && targetOrg?.id) {
        try {
          if (setActive && !organization) {
            setActive({ organization: targetOrg.id });
          }
          const token = await getToken();
          const headers = { "x-user-id": user.id };
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const res = await api.post(
            "/api/workspaces",
            { name: targetOrg.name, id: targetOrg.id },
            { headers },
          );
          if (res.data?.workspace) {
            dispatch(addWorkspace(res.data.workspace));
          }
          await dispatch(fetchWorkspaces({ getToken, userId: user.id }));
        } catch (error) {
          console.error("createWorkspace sync error:", error);
        }
      }

      setIsFetching(false);
    };

    syncWorkspace();
  }, [dispatch, user?.id, isLoaded, organization?.id, userMemberships?.data]);

  const handleDirectWorkspaceCreate = async (e) => {
    e.preventDefault();
    if (!workspaceNameInput.trim()) return;

    try {
      setIsCreating(true);
      const token = await getToken();
      const headers = { "x-user-id": user.id };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await api.post(
        "/api/workspaces",
        { name: workspaceNameInput.trim() },
        { headers },
      );

      if (res.data?.workspace) {
        dispatch(addWorkspace(res.data.workspace));
      }
      await dispatch(fetchWorkspaces({ getToken, userId: user.id }));
      toast.success("Workspace created successfully!");
    } catch (error) {
      console.error("Failed to create workspace:", error);
      toast.error(error?.response?.data?.message || "Failed to create workspace");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-950">
        <Loader2Icon className="size-7 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-950">
        <Loader2Icon className="size-7 animate-spin" />
      </div>
    );
  }

  if (!isFetching && workspaces.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl mb-6">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Workspace</h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">
              Enter your workspace name to start managing tasks and projects.
            </p>
          </div>

          <form onSubmit={handleDirectWorkspaceCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                Workspace Name
              </label>
              <input
                type="text"
                value={workspaceNameInput}
                onChange={(e) => setWorkspaceNameInput(e.target.value)}
                placeholder="e.g. Acme Engineering or Marketing"
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2Icon className="size-5 animate-spin" />
                  Creating Workspace...
                </>
              ) : (
                "Create Workspace →"
              )}
            </button>
          </form>
        </div>

        <div className="w-full max-w-md text-center text-xs text-gray-400 uppercase tracking-wider mb-4">
          — Or Sync Clerk Organization —
        </div>

        <div className="w-full max-w-md">
          <CreateOrganization skipInvitationScreen={true} />
        </div>
      </div>
    );
  }

  if (workspaces.length > 0 && location.pathname === "/create-organization") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <div className="flex-1 flex flex-col h-screen">
        <Navbar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
        <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
