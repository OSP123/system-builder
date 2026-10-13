import { WorldForm } from "@/components/admin/forms";
import { createWorld } from "../../../actions";

export const metadata = { title: "New world" };

export default function NewWorldPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-display text-3xl">New world</h1>
      <WorldForm action={createWorld} />
    </div>
  );
}
