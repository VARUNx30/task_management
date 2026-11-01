"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase-browser";

export default function AuthPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleGoogleLogin() {
        setLoading(true);
        setError("");

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                setError(error.message);
                setLoading(false);
            }
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Unable to start Google sign-in."
            );
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg sm:p-10">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white ">
                        T
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-black-900">
                        Welcome to TaskFlow
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        Sign in or Create an account to manage your tasks and stay organized
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 48 48"
                        className="h-5 w-5"
                    >
                        <path
                            fill="#EA4335"
                            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 3.03 13.22l7.98 6.19C12.9 13.72 18.01 9.5 24 9.5Z"
                            transform="translate(0 4)"
                        />
                        <path
                            fill="#4285F4"
                            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.72 5.99c4.51-4.17 7.06-10.32 7.06-17.64Z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M10.99 28.59A14.4 14.4 0 0 1 10.2 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 .02 24c0 3.86.92 7.5 2.55 10.78l8.42-6.19Z"
                            transform="translate(0 4)"
                        />
                        <path
                            fill="#34A853"
                            d="M24 48c6.48 0 11.93-2.13 15.91-5.81l-7.72-5.99c-2.14 1.43-4.89 2.27-8.19 2.27-5.99 0-11.1-4.22-12.99-9.91l-8.42 6.19C6.51 43.62 14.62 48 24 48Z"
                        />
                    </svg>
                    {loading ? "Connecting to Google..." : "Continue with Google"}
                </button>
                {error && (
                    <p role="alert" className="mt-4 text-center text-sm text-red-600">
                        {error}
                    </p>
                )}

                <div className="my-6 flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-200"/>
                    <span className="text-xs text-slate-400">SECURE AUTHENTICATION</span>
                    <div className="h-px flex-1 bg-slate-200"/>
                </div>
            </section>
        </main>
    )
} 