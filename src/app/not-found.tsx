import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-[#FFF5ED] px-6 text-center text-[#3B1C0A]">
      <h1 className="text-2xl font-semibold tracking-wide">Page Not Found</h1>
      <p className="max-w-md text-sm text-[#714026]">
        The page you’re looking for doesn’t exist or has been moved. Please check the URL or return to the homepage.
      </p>
      <Link
        className="mt-4 inline-flex items-center rounded-full bg-[#F26B1A] px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#FFF5ED] transition hover:bg-[#ff7d30]"
        href="/"
      >
        Go Home
      </Link>
    </div>
  );
}
