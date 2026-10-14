import Link from "next/link";
import { AuthCard } from "@/components/admin/AuthCard";
import { ForgotForm } from "./ForgotForm";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard subtitle="Recover access">
      <ForgotForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/admin/login" className="text-ash hover:text-parchment">← Back to sign in</Link>
      </p>
    </AuthCard>
  );
}
