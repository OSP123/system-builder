import { Emblem } from "@/components/ornament/Emblem";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Admin sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="gothic-frame w-full max-w-sm p-8">
        <Emblem className="mx-auto h-16 w-auto" />
        <p className="gothic-title mt-4 text-center text-5xl">Cerulean</p>
        <p className="mt-2 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-phosphor/80">+++ Identify yourself +++</p>
        <LoginForm next={next ?? ""} />
      </div>
    </div>
  );
}
