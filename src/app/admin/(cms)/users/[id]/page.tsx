import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { EditUserForm, ResetPasswordForm } from "@/components/admin/UserForms";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteUser, resetUserPassword, updateUser } from "../../../actions";

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const user = await db.user.findUnique({ where: { id } });
  if (!user) notFound();
  const isSelf = user.id === me.id;

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <Link href="/admin/users" className="tap text-sm text-ash hover:text-parchment">← Users</Link>
        <h1 className="mt-2 font-display text-3xl">{user.name || user.email}</h1>
        <p className="text-sm text-ash">{user.email}</p>
      </div>
      {error && <p className="border border-blood bg-blood/15 px-4 py-2 text-sm text-red-300">{error}</p>}

      <section>
        <EditUserForm action={updateUser.bind(null, user.id)} user={user} isSelf={isSelf} />
      </section>

      <section className="border-t border-line pt-8">
        <h2 className="mb-4 font-display text-xl">Reset password</h2>
        <ResetPasswordForm action={resetUserPassword.bind(null, user.id)} />
      </section>

      {!isSelf && (
        <section className="border border-blood/50 p-5">
          <h2 className="font-semibold text-red-300">Danger zone</h2>
          <p className="mb-4 mt-1 text-sm text-ash">
            Deleting this user hands all their worlds, records and images to you. Prefer “Disabled” if they may return.
          </p>
          <DeleteButton
            action={deleteUser.bind(null, user.id)}
            label="Delete user"
            confirmText={`Delete ${user.email}? Their content will be reassigned to you.`}
          />
        </section>
      )}
    </div>
  );
}
