import { auth } from "@/lib/auth";
import Providers from "@/components/Providers";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * (auth) group layout — wrapper for login, signup, and set-password pages.
 * Provides Theme and NextAuth Session context to all authentication screens.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <Providers session={session}>
      <div className="min-h-screen relative flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4 transition-colors duration-150">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle
            variant="icon"
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs"
          />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </Providers>
  );
}
