import { ELEVENTH_STATS, MODEL_STATS, STAT_HEADERS, VEHICLE_STATS, type StatProfile } from "@/lib/codex";

/**
 * Statline tables in the 3rd edition style. Model, 11th edition and vehicle
 * profiles have different columns, so they render as separate tables.
 */
export function Statlines({ profiles }: { profiles: StatProfile[] }) {
  const models = profiles.filter((p) => p.kind === "model");
  const eleventh = profiles.filter((p) => p.kind === "eleventh");
  const vehicles = profiles.filter((p) => p.kind === "vehicle");
  return (
    <div className="space-y-3">
      {models.length > 0 && <Table cols={MODEL_STATS} rows={models} />}
      {eleventh.length > 0 && <Table cols={ELEVENTH_STATS} rows={eleventh} />}
      {vehicles.length > 0 && (
        <div>
          <p className="rulebook-label mb-1 text-left">Armour</p>
          <Table cols={VEHICLE_STATS} rows={vehicles} />
        </div>
      )}
    </div>
  );
}

function Table({ cols, rows }: { cols: readonly string[]; rows: StatProfile[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="statline">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Name</span>
            </th>
            {cols.map((c) => (
              <th key={c} scope="col">{STAT_HEADERS[c]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={`${p.name}-${i}`}>
              <td>{p.name}</td>
              {cols.map((c) => (
                <td key={c}>{(p as Record<string, string>)[c] || "-"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
