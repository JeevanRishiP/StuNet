/**
 * (auth) group layout — minimal wrapper for login/signup pages.
 * No nav, no sidebar. Just the page content centered.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
