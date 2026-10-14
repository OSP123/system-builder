import { ChangePasswordForm } from "@/components/admin/UserForms";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { changePassword } from "../../actions";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-[0.15em]">Account</h1>
        <p className="mt-2 text-sm text-ash">
          {user.email} · {ROLE_LABELS[user.role]}
        </p>
      </div>
      <section>
        <h2 className="mb-4 font-display text-xl">Change password</h2>
        <ChangePasswordForm action={changePassword} />
      </section>
    </div>
  );
}
