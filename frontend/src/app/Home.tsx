"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase-browser";
import My_Tasks from "./My_Tasks";

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function getApiError(response: Response) {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.error === "string") {
      return body.error;
    }
  } catch {
    // Keep the HTTP status as a useful fallback when the response isn't JSON.
  }

  return `Request failed (${response.status})`;
}

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<"assign" | "my-tasks">("assign");
  const [loggingOut, setLoggingOut] = useState(false);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      setLoadingProfiles(true);
      setError("");

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }
        if (!session) {
          throw new Error("You must be signed in to view users.");
        }

        const response = await fetch(`${BACKEND_URL}/api/users`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error(await getApiError(response));
        }

        const body: unknown = await response.json();
        if (
          !isRecord(body) ||
          !Array.isArray(body.users) ||
          !body.users.every(
            (user): user is AuthUser =>
              isRecord(user) &&
              typeof user.id === "string" &&
              typeof user.email === "string" &&
              (typeof user.name === "string" || user.name === null)
          )
        ) {
          throw new Error("The backend returned an invalid user list.");
        }

        if (active) {
          setUsers(body.users);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load users."
          );
        }
      } finally {
        if (active) {
          setLoadingProfiles(false);
        }
      }
    }

    void loadUsers();

    return () => {
      active = false;
    };
  }, []);

  async function handleAssignTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const title = taskTitle.trim();
    if (!title) {
      setError("Enter a task title.");
      return;
    }
    if (!selectedAssignee) {
      setError("Choose a user to assign this task to.");
      return;
    }

    setSubmittingTask(true);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }
      if (!session) {
        throw new Error("You must be signed in to assign a task.");
      }

      const response = await fetch(`${BACKEND_URL}/api/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task_title: title,
          task_description: description.trim(),
          assigned_to: selectedAssignee,
        }),
      });

      if (!response.ok) {
        throw new Error(await getApiError(response));
      }

      const assignee = users.find(
        (user) => user.id === selectedAssignee
      );
      setSuccess(`Task assigned to ${assignee?.email ?? "user"}.`);
      setTaskTitle("");
      setDescription("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to assign the task."
      );
    } finally {
      setSubmittingTask(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setError(error.message);
        setLoggingOut(false);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to log out."
      );
      setLoggingOut(false);
    }
  }

  return (
    <div className="relative min-h-screen p-6">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="absolute right-6  top-6 cursor-pointer w-30 h-10 border border-gray-400 rounded-2xl hover:border-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loggingOut ? "Logging out..." : "Logout"}
      </button>
      <h1 className="mb-8 flex min-h-6 items-center justify-center text-2xl font-semibold">
        {view === "assign" ? "Assign Task" : "My Tasks"}
      </h1>

      {view === "my-tasks" ? (
        <My_Tasks onBack={() => setView("assign")} />
      ) : (
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
        <section aria-labelledby="users-heading">
          <h2 id="users-heading" className="mb-4 text-xl font-semibold">
            Other users
          </h2>
          {loadingProfiles ? (
            <p>Loading users...</p>
          ) : users.length === 0 ? (
            <p>No other users are registered yet.</p>
          ) : (
            <ul className="space-y-3">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4"
                >
                  <span className="break-all">
                    {user.name ? `${user.name} (${user.email})` : user.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedAssignee(user.id)}
                    className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 hover:bg-gray-50"
                  >
                    {selectedAssignee === user.id
                      ? "Selected"
                      : "Assign task"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="assign-heading">
          <h2 id="assign-heading" className="mb-4 text-xl font-semibold">
            Assign a task
          </h2>
          <form onSubmit={handleAssignTask} className="space-y-4">
            <label className="block">
              <span className="mb-1 block">Assign to</span>
              <select
                value={selectedAssignee}
                onChange={(event) => setSelectedAssignee(event.target.value)}
                required
                disabled={loadingProfiles || users.length === 0}
                className="w-full rounded-lg border border-gray-300 p-3"
              >
                <option value="">Select a user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name ? `${user.name} (${user.email})` : user.email}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block">Task title</span>
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                required
                maxLength={200}
                className="w-full rounded-lg border border-gray-300 p-3"
              />
            </label>

            <label className="block">
              <span className="mb-1 block">Description (optional)</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 p-3"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={
                  submittingTask ||
                  loadingProfiles ||
                  users.length === 0
                }
                className="rounded-lg bg-indigo-600 px-4 py-3 cursor-pointer font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingTask ? "Assigning..." : "Assign task"}
              </button>
              <button
                type="button"
                onClick={() => setView("my-tasks")}
                className="rounded-lg border border-gray-300 px-4 py-3 font-semibold hover:bg-gray-100 cursor-pointer"
              >
                My Tasks
              </button>
            </div>
          </form>
        </section>
      </div>
      )}

      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
    </div>
  );
}