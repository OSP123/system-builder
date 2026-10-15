import type { User } from "@prisma/client";
import type { ActionState } from "@/app/admin/actions";
import { ROLE_LABELS } from "@/lib/permissions";
import { ActionForm, Field, SubmitButton } from "./ActionForm";

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

const ROLE_HINT = "Contributors can add records to open worlds and change only their own. Admins can change anything and manage users.";

function RoleSelect({ value }: { value?: User["role"] }) {
  return (
    <Field name="role" label="Role" hint={ROLE_HINT}>
      <select id="role" name="role" className="field" defaultValue={value ?? "EDITOR"}>
        <option value="EDITOR">{ROLE_LABELS.EDITOR}</option>
        <option value="ADMIN">{ROLE_LABELS.ADMIN}</option>
      </select>
    </Field>
  );
}

export function NewUserForm({ action }: { action: Action }) {
  return (
    <ActionForm action={action}>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="email" label="Email">
          <input id="email" name="email" type="email" autoComplete="off" className="field" required />
        </Field>
        <Field name="name" label="Display name">
          <input id="name" name="name" className="field" placeholder="Shown as the author of their records" />
        </Field>
      </div>
      <Field name="password" label="Temporary password" hint="At least 10 characters. Share it privately; they can change it under Account.">
        <input id="password" name="password" type="text" autoComplete="new-password" className="field font-mono" required />
      </Field>
      <RoleSelect />
      <SubmitButton>Create user</SubmitButton>
    </ActionForm>
  );
}

export function EditUserForm({ action, user, isSelf }: { action: Action; user: User; isSelf: boolean }) {
  return (
    <ActionForm action={action}>
      <Field name="name" label="Display name">
        <input id="name" name="name" className="field" defaultValue={user.name ?? ""} />
      </Field>
      <RoleSelect value={user.role} />
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="disabled" defaultChecked={user.disabled} disabled={isSelf} className="h-4 w-4 accent-blood-bright" />
        Disabled (cannot sign in; their records stay)
      </label>
      {isSelf && <p className="text-xs text-ash">You can&apos;t disable or demote yourself.</p>}
      <SubmitButton>Save user</SubmitButton>
    </ActionForm>
  );
}

export function ResetPasswordForm({ action }: { action: Action }) {
  return (
    <ActionForm action={action} className="space-y-4">
      <Field name="password" label="New temporary password" hint="At least 10 characters.">
        <input id="password" name="password" type="text" autoComplete="new-password" className="field font-mono" required />
      </Field>
      <SubmitButton>Reset password</SubmitButton>
    </ActionForm>
  );
}

export function ChangePasswordForm({ action }: { action: Action }) {
  return (
    <ActionForm action={action} className="space-y-4">
      <Field name="currentPassword" label="Current password">
        <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" className="field" required />
      </Field>
      <Field name="newPassword" label="New password" hint="At least 10 characters.">
        <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" className="field" required />
      </Field>
      <Field name="confirmPassword" label="Confirm new password">
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" className="field" required />
      </Field>
      <SubmitButton>Change password</SubmitButton>
    </ActionForm>
  );
}
