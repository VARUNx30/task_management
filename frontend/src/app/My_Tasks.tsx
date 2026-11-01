"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase-browser";

type MyTasksProps = {
    onBack: () => void;
};

type Task = {
    id: number | string;
    task_title: string;
    task_description: string | null;
    created_by: string;
    assigned_to: string;
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

export default function My_Tasks({ onBack }: MyTasksProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [currentUserId, setCurrentUserId] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadTasks() {
            try {
                const {
                    data: { session },
                    error: sessionError,
                } = await supabase.auth.getSession();

                if (sessionError) {
                    throw sessionError;
                }
                if (!session) {
                    throw new Error("You must be signed in to view your tasks.");
                }

                const response = await fetch(`${BACKEND_URL}/api/my-tasks`, {
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
                    !Array.isArray(body.tasks) ||
                    !body.tasks.every(
                        (task): task is Task =>
                            isRecord(task) &&
                            (typeof task.id === "number" || typeof task.id === "string") &&
                            typeof task.task_title === "string" &&
                            (typeof task.task_description === "string" ||
                                task.task_description === null) &&
                            typeof task.created_by === "string" &&
                            typeof task.assigned_to === "string"
                    )
                ) {
                    throw new Error("The backend returned an invalid task list.");
                }

                if (active) {
                    setCurrentUserId(session.user.id);
                    setTasks(body.tasks);
                }
            } catch (loadError) {
                if (active) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : "Unable to load your tasks."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void loadTasks();

        return () => {
            active = false;
        };
    }, []);

    const myTasks = tasks.filter((task) => task.created_by !== currentUserId);

    return (
        <section className="mx-auto w-full max-w-5xl">
            <button
                type="button"
                onClick={onBack}
                className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 cursor-pointer"
            >
                Back to task assignment
            </button>
            <h2 className="mt-6 text-xl font-semibold">My Tasks</h2>
            {loading ? (
                <p className="mt-4">Loading tasks...</p>
            ) : error ? (
                <p role="alert" className="mt-4 text-red-600">
                    {error}
                </p>
            ) : myTasks.length === 0 ? (
                <p className="mt-4">You have no tasks yet.</p>
            ) : (
                <ul className="mt-4 space-y-3">
                    {myTasks.map((task) => (
                        <li
                            key={task.id}
                            className="rounded-lg border border-gray-200 p-4"
                        >
                            <h3 className="font-semibold">{task.task_title}</h3>
                            {task.task_description && (
                                <p className="mt-2 whitespace-pre-wrap text-gray-700">
                                    {task.task_description}
                                </p>
                            )}
                            <p className="mt-2 text-sm text-gray-500">
                                {"Assigned By:"} {task.created_by}
                            </p>
                        </li>
                    ))}
                </ul>
            )
            }
        </section>
    );
}