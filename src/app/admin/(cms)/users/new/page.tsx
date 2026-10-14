import Link from "next/link";
import { NewUserForm } from "@/components/admin/UserForms";
import { requireAdmin } from "@/lib/auth";
import { createUser } from "../../../actions";

export const metadata = { title: "New user" };

export default async function NewUserPage() {
  await requireAdmin();
  return (
    <div className="max-w-2xl">
      <Link href="/admin/users" className="text-sm text-ash hover:text-parchment">← Users</Link>
      <h1 className="mb-6 mt-2 font-display text-3xl">New user</h1>
      <NewUserForm action={createUser} />
    </div>
  );
}
