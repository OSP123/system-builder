import type { Article, Planet, StarSystem, World } from "@prisma/client";
import type { ActionState } from "@/app/admin/actions";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import { ActionForm, Field, PublishedToggle, SubmitButton } from "./ActionForm";
import { ImagePicker } from "./ImagePicker";
import { MarkdownEditor } from "./MarkdownEditor";
import { ThemeEditor } from "./ThemeEditor";
import { normalizeTheme } from "@/lib/theme";

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

const SLUG_HINT = "Used in the URL. Leave blank to generate from the name.";

export function WorldForm({ action, world }: { action: Action; world?: World }) {
  return (
    <ActionForm action={action}>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="name" label="Name">
          <input id="name" name="name" className="field" defaultValue={world?.name} required />
        </Field>
        <Field name="slug" label="Slug" hint={SLUG_HINT}>
          <input id="slug" name="slug" className="field" defaultValue={world?.slug} />
        </Field>
      </div>
      <Field name="tagline" label="Tagline">
        <input id="tagline" name="tagline" className="field" defaultValue={world?.tagline ?? ""} placeholder="A sector besieged at the edge of the Imperium" />
      </Field>
      {world && (
        <>
          <Field name="coverImageId" label="Cover image">
            <ImagePicker name="coverImageId" defaultValue={world.coverImageId} />
          </Field>
          <Field name="summary" label="Overview (Markdown)">
            <MarkdownEditor name="summary" defaultValue={world.summary} rows={14} />
          </Field>
        </>
      )}
      <PublishedToggle defaultChecked={world?.published} />
      <SubmitButton>{world ? "Save world" : "Create world"}</SubmitButton>
    </ActionForm>
  );
}

export function ArticleForm({
  action,
  article,
  systems,
}: {
  action: Action;
  article?: Article;
  systems: (Pick<StarSystem, "id" | "name"> & { planets: Pick<Planet, "id" | "name">[] })[];
}) {
  return (
    <ActionForm action={action}>
      <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
        <Field name="title" label="Title">
          <input id="title" name="title" className="field" defaultValue={article?.title} required />
        </Field>
        <Field name="category" label="Category">
          <select id="category" name="category" className="field" defaultValue={article?.category ?? "HISTORY"}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="slug" label="Slug" hint={SLUG_HINT}>
          <input id="slug" name="slug" className="field" defaultValue={article?.slug} />
        </Field>
        <Field name="tags" label="Tags" hint="Comma separated">
          <input id="tags" name="tags" className="field" defaultValue={article?.tags.join(", ")} />
        </Field>
      </div>
      <Field name="summary" label="Summary" hint="One or two sentences shown in listings.">
        <input id="summary" name="summary" className="field" defaultValue={article?.summary ?? ""} />
      </Field>
      <Field name="coverImageId" label="Cover image">
        <ImagePicker name="coverImageId" defaultValue={article?.coverImageId} />
      </Field>
      <Field name="body" label="Body (Markdown)">
        <MarkdownEditor name="body" defaultValue={article?.body} />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="systemId" label="Star system (optional)">
          <select id="systemId" name="systemId" className="field" defaultValue={article?.systemId ?? ""}>
            <option value="">—</option>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field name="planetId" label="Planet (optional)">
          <select id="planetId" name="planetId" className="field" defaultValue={article?.planetId ?? ""}>
            <option value="">—</option>
            {systems.map((s) => (
              <optgroup key={s.id} label={s.name}>
                {s.planets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
      </div>
      <PublishedToggle defaultChecked={article?.published} />
      <SubmitButton>{article ? "Save record" : "Create record"}</SubmitButton>
    </ActionForm>
  );
}

export function SystemForm({ action, system }: { action: Action; system?: StarSystem }) {
  return (
    <ActionForm action={action}>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="name" label="Name">
          <input id="name" name="name" className="field" defaultValue={system?.name} required />
        </Field>
        <Field name="slug" label="Slug" hint={SLUG_HINT}>
          <input id="slug" name="slug" className="field" defaultValue={system?.slug} />
        </Field>
        <Field name="starType" label="Star type">
          <input id="starType" name="starType" className="field" defaultValue={system?.starType ?? ""} placeholder="Blue giant" />
        </Field>
        <Field name="segmentum" label="Segmentum / region">
          <input id="segmentum" name="segmentum" className="field" defaultValue={system?.segmentum ?? ""} placeholder="Segmentum Pacificus" />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Star map position</legend>
        <p className="mb-2 text-xs text-ash">Coordinates for the upcoming interactive star map.</p>
        <div className="grid grid-cols-3 gap-4">
          {(["x", "y", "z"] as const).map((axis) => (
            <Field key={axis} name={axis} label={axis.toUpperCase()}>
              <input id={axis} name={axis} type="number" step="any" className="field" defaultValue={system?.[axis] ?? 0} />
            </Field>
          ))}
        </div>
      </fieldset>
      <Field name="description" label="Description (Markdown)">
        <MarkdownEditor name="description" defaultValue={system?.description} rows={12} />
      </Field>
      <fieldset className="border border-line p-5">
        <legend className="px-2 font-display text-lg uppercase tracking-[0.2em] text-gold">Theme</legend>
        <p className="mb-5 text-xs text-ash">
          Colours and atmosphere for this system&apos;s public pages, including its planets.
        </p>
        <ThemeEditor initial={normalizeTheme(system?.theme)} systemName={system?.name} />
        <div className="mt-6">
          <Field name="backdropImageId" label="Backdrop image (optional)">
            <ImagePicker name="backdropImageId" defaultValue={system?.backdropImageId} />
          </Field>
        </div>
      </fieldset>
      <PublishedToggle defaultChecked={system?.published} />
      <SubmitButton>{system ? "Save system" : "Create system"}</SubmitButton>
    </ActionForm>
  );
}

export function PlanetForm({ action, planet }: { action: Action; planet?: Planet }) {
  return (
    <ActionForm action={action}>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="name" label="Name">
          <input id="name" name="name" className="field" defaultValue={planet?.name} required />
        </Field>
        <Field name="slug" label="Slug" hint={SLUG_HINT}>
          <input id="slug" name="slug" className="field" defaultValue={planet?.slug} />
        </Field>
        <Field name="classification" label="Classification">
          <input id="classification" name="classification" className="field" list="planet-classes" defaultValue={planet?.classification ?? ""} />
          <datalist id="planet-classes">
            {["Hive World", "Forge World", "Agri World", "Death World", "Shrine World", "Fortress World", "Feudal World", "Feral World", "Mining World", "Civilised World", "Dead World", "Daemon World", "Knight World", "Cardinal World", "Penal Colony"].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field name="orbitIndex" label="Orbital position" hint="1 = closest to the star">
          <input id="orbitIndex" name="orbitIndex" type="number" min={0} className="field" defaultValue={planet?.orbitIndex ?? 1} />
        </Field>
        <Field name="population" label="Population">
          <input id="population" name="population" className="field" defaultValue={planet?.population ?? ""} placeholder="~12 billion" />
        </Field>
        <Field name="titheGrade" label="Tithe grade">
          <input id="titheGrade" name="titheGrade" className="field" defaultValue={planet?.titheGrade ?? ""} placeholder="Exactis Extremis" />
        </Field>
      </div>
      <Field name="coverImageId" label="Image">
        <ImagePicker name="coverImageId" defaultValue={planet?.coverImageId} />
      </Field>
      <Field name="description" label="Description (Markdown)">
        <MarkdownEditor name="description" defaultValue={planet?.description} rows={12} />
      </Field>
      <Field name="genParams" label="Generator parameters (JSON, optional)" hint="Reserved for the upcoming 3D planet generator, e.g. {&quot;seed&quot;: 42, &quot;water&quot;: 0.3}">
        <textarea
          id="genParams"
          name="genParams"
          rows={4}
          className="field font-mono text-sm"
          defaultValue={planet?.genParams ? JSON.stringify(planet.genParams, null, 2) : ""}
        />
      </Field>
      <PublishedToggle defaultChecked={planet?.published} />
      <SubmitButton>{planet ? "Save planet" : "Create planet"}</SubmitButton>
    </ActionForm>
  );
}
