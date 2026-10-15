import Link from "next/link";
import { AuthCard } from "@/components/admin/AuthCard";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Admin sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const { next, reset } = await searchParams;
  return (
    <AuthCard subtitle="Identify yourself">
      {reset === "1" && (
        <p role="status" className="cogitator mt-6 p-3 text-xs uppercase tracking-widest">
          Password changed. Sign in with your new password.
        </p>
      )}
      <LoginForm next={next ?? ""} />
      <p className="mt-6 text-center text-sm">
        <Link href="/admin/forgot-password" className="tap text-ash underline-offset-4 hover:text-parchment hover:underline">
          Forgot password?
        </Link>
      </p>
    </AuthCard>
  );
}
