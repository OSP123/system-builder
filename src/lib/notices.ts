/** Wording for CMS save notices, in the voice of the Imperium. */

export const NOTICE_TITLES = {
  saved: "Record sanctified",
  created: "Record inducted",
  invalid: "Heresy detected",
  forbidden: "Access denied",
  crashed: "Machine spirit unresponsive",
} as const;

export type NoticeKind = keyof typeof NOTICE_TITLES;

const SUCCESS_LINES = [
  "Your changes are committed to the Archivum. The Emperor protects.",
  "The data-stacks are updated. The machine spirit is appeased.",
  "Transcription complete. Ave Imperator.",
  "The scribes have set it down in ink and oath.",
];

const CREATED_LINES = [
  "A new record enters the Archivum. Let it be remembered.",
  "Inducted into the data-stacks. The Omnissiah approves.",
];

export function successLine(kind: "saved" | "created", rand: () => number = Math.random): string {
  const lines = kind === "created" ? CREATED_LINES : SUCCESS_LINES;
  return lines[Math.floor(rand() * lines.length) % lines.length];
}

/** Detail line for a failed save, from the field errors returned by the server. */
export function failureNotice(errors: Record<string, string>): { kind: NoticeKind; detail: string } {
  const fields = Object.keys(errors).filter((k) => k !== "_form");
  const formError = errors._form;
  if (formError && /permission/i.test(formError)) {
    return { kind: "forbidden", detail: `${formError}. Your clearance is insufficient.` };
  }
  if (formError && fields.length === 0) {
    return { kind: "crashed", detail: `${formError} Nothing was saved; your text is still here.` };
  }
  const n = fields.length;
  return {
    kind: "invalid",
    detail: `The record was not saved. ${n === 1 ? "One field requires" : `${n} fields require`} correction before it can be committed.`,
  };
}
