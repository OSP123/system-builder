import type { Article, Character, Narrative, Planet, Region, StarSystem, Unit, World } from "@prisma/client";
import type { ActionState } from "@/app/admin/actions";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import { ActionForm, Field, PublishedToggle, SubmitButton } from "./ActionForm";
import { ImagePicker } from "./ImagePicker";
import { MarkdownEditor } from "./MarkdownEditor";
import { ThemeEditor } from "./ThemeEditor";
import { CoordinateFields } from "./CoordinateFields";
import { normalizeTheme } from "@/lib/theme";
import { CHARACTER_STATUSES, FORCE_SLOTS, readProfile, readProfiles, readRules, SLOT_LABELS, STATUS_LABELS } from "@/lib/codex";
import { CharacterPicker } from "./CharacterPicker";
import { SectorsEditor } from "./SectorsEditor";
import { readSectors } from "@/lib/regions";
import { ProfilesEditor } from "./ProfilesEditor";
import { RulesEditor } from "./RulesEditor";

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
        <Field name="segmentum" label="Sector / region" hint="Free text; the Segmentum is worked out from the position below.">
          <input id="segmentum" name="segmentum" className="field" defaultValue={system?.segmentum ?? ""} placeholder="e.g. Orpheus Sector" />
        </Field>
      </div>
      <CoordinateFields initial={{ x: system?.x ?? 0, y: system?.y ?? 0, z: system?.z ?? 0 }} systemId={system?.published ? system.id : undefined} />
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
      <Field name="textureImageId" label="Globe texture (optional)" hint="A world map wrapped around the planet on the galaxy map. Longitude runs left to right (180°W to 180°E), north at the top. Leave empty for a generated surface.">
        <ImagePicker name="textureImageId" defaultValue={planet?.textureImageId} />
      </Field>
      <Field name="description" label="Description (Markdown)">
        <MarkdownEditor name="description" defaultValue={planet?.description} rows={12} />
      </Field>
      <Field name="genParams" label="Generator parameters (JSON, optional)" hint="Shapes the planet on the galaxy map, e.g. {&quot;water&quot;: 0.9, &quot;clouds&quot;: 0.3}. Leave empty to use the look for its classification.">
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

type PlanetGroups = (Pick<StarSystem, "id" | "name"> & { planets: Pick<Planet, "id" | "name">[] })[];

function PlanetSelect({ name, label, groups, value }: { name: string; label: string; groups: PlanetGroups; value?: string | null }) {
  return (
    <Field name={name} label={label}>
      <select id={name} name={name} className="field" defaultValue={value ?? ""}>
        <option value="">—</option>
        {groups.map((s) => (
          <optgroup key={s.id} label={s.name}>
            {s.planets.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </Field>
  );
}

const ORDER_HINT = "Lower numbers are listed first.";

export function CharacterForm({ action, character, planets }: { action: Action; character?: Character; planets: PlanetGroups }) {
  const profile = readProfile(character?.profile);
  return (
    <ActionForm action={action}>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="name" label="Name">
          <input id="name" name="name" className="field" defaultValue={character?.name} required />
        </Field>
        <Field name="title" label="Rank or title">
          <input id="title" name="title" className="field" defaultValue={character?.title ?? ""} placeholder="Custodian Captain" />
        </Field>
        <Field name="faction" label="Faction / allegiance">
          <input id="faction" name="faction" className="field" defaultValue={character?.faction ?? ""} placeholder="Adeptus Custodes" />
        </Field>
        <Field name="status" label="Status">
          <select id="status" name="status" className="field" defaultValue={character?.status ?? "ACTIVE"}>
            {CHARACTER_STATUSES.map((st) => (
              <option key={st} value={st}>{STATUS_LABELS[st]}</option>
            ))}
          </select>
        </Field>
        <Field name="slug" label="Slug" hint={SLUG_HINT}>
          <input id="slug" name="slug" className="field" defaultValue={character?.slug} />
        </Field>
        <Field name="sortOrder" label="Importance order" hint={ORDER_HINT}>
          <input id="sortOrder" name="sortOrder" type="number" className="field" defaultValue={character?.sortOrder ?? 0} />
        </Field>
      </div>
      <Field name="summary" label="Summary" hint="One line shown in the Dramatis Personae.">
        <input id="summary" name="summary" className="field" defaultValue={character?.summary ?? ""} />
      </Field>
      <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
        <Field name="quote" label="Quote">
          <textarea id="quote" name="quote" rows={2} className="field" defaultValue={character?.quote ?? ""} />
        </Field>
        <Field name="quoteSource" label="Quote attribution">
          <input id="quoteSource" name="quoteSource" className="field" defaultValue={character?.quoteSource ?? ""} />
        </Field>
      </div>
      <Field name="portraitImageId" label="Portrait">
        <ImagePicker name="portraitImageId" defaultValue={character?.portraitImageId} />
      </Field>
      <Field name="body" label="Biography (Markdown)">
        <MarkdownEditor name="body" defaultValue={character?.body} rows={14} />
      </Field>
      <PlanetSelect name="homeworldId" label="Homeworld (optional)" groups={planets} value={character?.homeworldId} />
      <Field name="profile" label="Statline (optional)">
        <ProfilesEditor name="profile" initial={profile ? [profile] : []} single />
      </Field>
      <Field name="wargear" label="Wargear" hint="One item per line.">
        <textarea id="wargear" name="wargear" rows={4} className="field" defaultValue={character?.wargear.join("\n")} />
      </Field>
      <Field name="specialRules" label="Special rules">
        <RulesEditor name="specialRules" initial={readRules(character?.specialRules)} />
      </Field>
      <PublishedToggle defaultChecked={character?.published} />
      <SubmitButton>{character ? "Save character" : "Create character"}</SubmitButton>
    </ActionForm>
  );
}

export function UnitForm({ action, unit }: { action: Action; unit?: Unit }) {
  return (
    <ActionForm action={action}>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="name" label="Unit name">
          <input id="name" name="name" className="field" defaultValue={unit?.name} required />
        </Field>
        <Field name="slot" label="Force Organisation slot">
          <select id="slot" name="slot" className="field" defaultValue={unit?.slot ?? "TROOPS"}>
            {FORCE_SLOTS.map((sl) => (
              <option key={sl} value={sl}>{SLOT_LABELS[sl]}</option>
            ))}
          </select>
        </Field>
        <Field name="points" label="Points" hint="Free text, e.g. 15 pts/model or 120 pts.">
          <input id="points" name="points" className="field" defaultValue={unit?.points ?? ""} />
        </Field>
        <Field name="faction" label="Faction">
          <input id="faction" name="faction" className="field" defaultValue={unit?.faction ?? ""} placeholder="Sons of Cerulean" />
        </Field>
        <Field name="slug" label="Slug" hint={SLUG_HINT}>
          <input id="slug" name="slug" className="field" defaultValue={unit?.slug} />
        </Field>
        <Field name="sortOrder" label="Order within slot" hint={ORDER_HINT}>
          <input id="sortOrder" name="sortOrder" type="number" className="field" defaultValue={unit?.sortOrder ?? 0} />
        </Field>
      </div>
      <Field name="squad" label="Squad composition">
        <textarea id="squad" name="squad" rows={2} className="field" defaultValue={unit?.squad ?? ""} placeholder="The squad consists of a Sergeant and between 4 and 9 Battle-Brothers." />
      </Field>
      <Field name="profiles" label="Profiles">
        <ProfilesEditor name="profiles" initial={readProfiles(unit?.profiles)} />
      </Field>
      <Field name="wargear" label="Wargear" hint="One item per line.">
        <textarea id="wargear" name="wargear" rows={4} className="field" defaultValue={unit?.wargear.join("\n")} />
      </Field>
      <Field name="options" label="Options (Markdown)" hint="Upgrades and their costs, e.g. a bulleted list.">
        <textarea id="options" name="options" rows={5} className="field font-mono text-sm" defaultValue={unit?.options ?? ""} />
      </Field>
      <Field name="specialRules" label="Special rules">
        <RulesEditor name="specialRules" initial={readRules(unit?.specialRules)} />
      </Field>
      <Field name="imageId" label="Art">
        <ImagePicker name="imageId" defaultValue={unit?.imageId} />
      </Field>
      <Field name="description" label="Background (Markdown)">
        <MarkdownEditor name="description" defaultValue={unit?.description} rows={12} />
      </Field>
      <PublishedToggle defaultChecked={unit?.published} />
      <SubmitButton>{unit ? "Save unit" : "Create unit"}</SubmitButton>
    </ActionForm>
  );
}

export function NarrativeForm({
  action,
  narrative,
  planets,
  characters,
}: {
  action: Action;
  narrative?: Narrative & { characters: { id: string }[] };
  planets: PlanetGroups;
  characters: { id: string; name: string; title: string | null }[];
}) {
  return (
    <ActionForm action={action}>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="title" label="Title">
          <input id="title" name="title" className="field" defaultValue={narrative?.title} required />
        </Field>
        <Field name="subtitle" label="Subtitle">
          <input id="subtitle" name="subtitle" className="field" defaultValue={narrative?.subtitle ?? ""} />
        </Field>
      </div>
      <Field name="slug" label="Slug" hint={SLUG_HINT}>
        <input id="slug" name="slug" className="field" defaultValue={narrative?.slug} />
      </Field>
      <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
        <Field name="epigraph" label="Epigraph" hint="An opening quote, rulebook style.">
          <textarea id="epigraph" name="epigraph" rows={2} className="field" defaultValue={narrative?.epigraph ?? ""} />
        </Field>
        <Field name="epigraphSource" label="Epigraph attribution">
          <input id="epigraphSource" name="epigraphSource" className="field" defaultValue={narrative?.epigraphSource ?? ""} />
        </Field>
      </div>
      <Field name="summary" label="Summary" hint="Shown in the list of narratives.">
        <input id="summary" name="summary" className="field" defaultValue={narrative?.summary ?? ""} />
      </Field>
      <Field name="coverImageId" label="Cover art">
        <ImagePicker name="coverImageId" defaultValue={narrative?.coverImageId} />
      </Field>
      <Field name="body" label="Story (Markdown)" hint="Use ## for chapter headings; they become the table of contents.">
        <MarkdownEditor name="body" defaultValue={narrative?.body} rows={24} />
      </Field>
      <Field name="characterIds" label="Featured characters">
        <CharacterPicker name="characterIds" options={characters} initial={narrative?.characters.map((c) => c.id) ?? []} />
      </Field>
      <PlanetSelect name="planetId" label="Setting (optional)" groups={planets} value={narrative?.planetId} />
      <PublishedToggle defaultChecked={narrative?.published} />
      <SubmitButton>{narrative ? "Save narrative" : "Create narrative"}</SubmitButton>
    </ActionForm>
  );
}

export function RegionForm({ action, region }: { action: Action; region?: Region }) {
  return (
    <ActionForm action={action}>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="name" label="Name">
          <input id="name" name="name" className="field" defaultValue={region?.name} required />
        </Field>
        <Field name="kind" label="Kind" hint="e.g. Theatre of war, Hive city, Wasteland.">
          <input id="kind" name="kind" className="field" defaultValue={region?.kind ?? ""} />
        </Field>
        <Field name="lat" label="Latitude" hint="-90 (south pole) to 90 (north pole)">
          <input id="lat" name="lat" type="number" step="any" min={-90} max={90} className="field" defaultValue={region?.lat ?? 0} />
        </Field>
        <Field name="lng" label="Longitude" hint="-180 to 180">
          <input id="lng" name="lng" type="number" step="any" min={-180} max={180} className="field" defaultValue={region?.lng ?? 0} />
        </Field>
        <Field name="slug" label="Slug" hint={SLUG_HINT}>
          <input id="slug" name="slug" className="field" defaultValue={region?.slug} />
        </Field>
        <Field name="sortOrder" label="Order" hint={ORDER_HINT}>
          <input id="sortOrder" name="sortOrder" type="number" className="field" defaultValue={region?.sortOrder ?? 0} />
        </Field>
      </div>
      <Field name="terrain" label="Terrain" hint="One line, e.g. Sprawling canyon island.">
        <input id="terrain" name="terrain" className="field" defaultValue={region?.terrain ?? ""} />
      </Field>
      <Field name="summary" label="Description (Markdown)">
        <MarkdownEditor name="summary" defaultValue={region?.summary} rows={8} />
      </Field>
      <Field name="sectors" label="Sectors">
        <SectorsEditor name="sectors" initial={readSectors(region?.sectors)} title={region?.name ?? ""} />
      </Field>
      <PublishedToggle defaultChecked={region?.published} />
      <SubmitButton>{region ? "Save region" : "Create region"}</SubmitButton>
    </ActionForm>
  );
}
