import { useAuth } from "../hooks/useAuth";

export default function AccessDenied() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-lg font-semibold tracking-tight text-zinc-50">Access denied</p>
        <p className="mt-2 text-sm text-zinc-400">
          {user?.email ?? "This account"} is signed in but isn't a platform admin. Ask an existing admin to grant access, or sign in with a
          different account.
        </p>
        <button type="button" onClick={() => void signOut()} className="mt-6 text-sm text-zinc-400 underline hover:text-zinc-200">
          Sign out
        </button>
      </div>
    </div>
  );
}
