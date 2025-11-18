'use client';

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="px-4 py-2 text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => router.push("/auth/signin")}
        className="px-4 py-2 text-sm font-light text-gray-600 hover:text-[var(--foreground)] transition-colors border border-gray-200 hover:border-gray-300"
      >
        Sign In
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {session.user?.name || session.user?.email}
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
        className="px-4 py-2 text-sm font-light text-gray-600 hover:text-[var(--foreground)] transition-colors border border-gray-200 hover:border-gray-300"
      >
        Sign Out
      </button>
    </div>
  );
}

