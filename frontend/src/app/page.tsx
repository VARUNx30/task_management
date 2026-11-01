import { Suspense } from "react";
import { createSupabaseServerClient } from "@/app/lib/supabase-server";
import SignUp from "./SignUp";
import HomeContent from "./Home";

async function AuthenticatedHome() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") {
    throw error;
  }

  if (!user) {
    return <SignUp />;
  }

  return <HomeContent />;
}

export default function HomePage() {
  return (
    <main>
      <Suspense fallback={<p className="p-6 text-center">Loading...</p>}>
        <AuthenticatedHome />
      </Suspense>
    </main>
  );
}