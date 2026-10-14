import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/admin/AuthCard";
import { findValidToken } from "@/lib/password-reset";
import { ResetForm } from "./ResetForm";

// The token is in this page's URL; never send it to other sites as a referrer.
export const metadata: Metadata = { title: "Reset password", referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valid = await findValidToken(token);
  return (
    <AuthCard subtitle="Choose a new password">
      {valid ? (
        <ResetForm token={token} />
      ) : (
        <div role="alert" className="mt-8 border-2 border-blood-bright bg-[#1a0806] p-4 text-sm">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-blood-bright">+++ Link rejected +++</p>
          <p className="mt-2">This link is invalid, expired or already used.</p>
          <Link href="/admin/forgot-password" className="btn btn-ghost mt-4">Request a new link</Link>
        </div>
      )}
    </AuthCard>
  );
}
