/** Boot-time configuration check; exits non-zero (stopping the deploy) on errors. */
// Like `next start`, read a local .env if there is one (never overriding real environment variables).
import "dotenv/config";
import { checkEnv, formatReport } from "../src/lib/env-check";

const report = checkEnv(process.env);
const output = formatReport(report);
if (report.errors.length) {
  console.error(output);
  process.exit(1);
}
console.log(output);
