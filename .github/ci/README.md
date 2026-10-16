# Shared CI checks

`task ci:fast` (or `bash .github/ci/run.sh fast`) runs the same application
build, lint, type check and unit tests as Common Setup, in that order.
Dependencies and the existing Firebase/test database `.env` must be prepared.
It does not install dependencies or provision databases.

`task ci` (or `bash .github/ci/run.sh full`) runs every shared verification
family without change selection: application checks, naming, production npm
audit, production license restrictions, Semgrep, TruffleHog, AI rules drift,
sale ZIP and all material quality checks, full PDF output checks, all thirty
snapshot results, ZIP extraction/environment checks, and the separate
ANALYZE/Lighthouse performance variant. Each command failure stops later
families and preserves its status. The existing material-corpus phase still
collects all its checker failures before returning failure.

Prepare a complete checkout, Node 22, installed project dependencies, Firebase
`.env`, the existing application test database on 5432, and the snapshot
Postgres database `taskapp` on 25532 (`user`/`password`). Full mode also needs
Bash, GNU findutils/coreutils (`md5sum`, `xargs -r`, `seq`), Python, Make, zip,
unzip, pg_isready, license-checker, Semgrep, Docker, poppler, and the existing
Chromium/Playwright browser dependencies. Use the pinned Semgrep image from
`semgrep.yml` if invoking its CLI through a container. No gate provisions a
local database or runs the destructive developer initialization tasks.

Set `RUNNER_TEMP` to an isolated writable evidence directory and
`PDF_BOOK_BUILD_LOG_DIR` to an isolated writable PDF log directory. The PDF
browser cache and link map use the same defaults as cloud CI, and can be set
explicitly. ZIP setup uses an automatically removed temporary directory;
its original `npm ci` and Prisma generation remain inside that extracted tree.
Its existing advisory type check and build-script existence check are retained;
they are not proof of a successful application build. Snapshot execution removes
the existing generated result table before checking it, as cloud CI does.

The PDF verify Make target already runs the PDF self-tests. Local full mode
runs it once, captures its output and keeps the exact existing 46-case guard.
Cloud's separate required self-test job and weekly full verification remain
separate. No APK, application, PDF or signed artifact is reused across variants.
The performance build uses the existing performance job environment and
`ANALYZE=true`; it remains separate from the application build.

Named leaf phases are the exact commands called by their cloud steps. Cloud
retains setup actions, selectors, required check names, job limits, artifacts,
permissions, secrets, service definitions and schedules. Unknown license diff
information runs the license check; shared CI source changes trigger the material,
PDF, snapshot and rule gates. Missing snapshot logs, missing days or SKIP fail.
License restrictions are one literal semicolon-separated CLI argument, without
shell evaluation. TruffleHog preserves the original action's Docker image
(`latest`), range and verified-only/fail flags; local default scans full history.
Explicit `BASE`/`HEAD` must both resolve and differ. Source reference:
<https://github.com/trufflesecurity/trufflehog/blob/6f3c981e7b77f235fd2702dd74af25fc4b72bf11/action.yml>.
License CLI reference: <https://github.com/davglass/license-checker#options>.

Cloud-only operations remain cloud-only: deployments/teardown/publication,
GitHub dependency-review action, bot/AI review services, notifications, PR
comments, and the informational unused-dependency report. These are not local
verification success. No production publication or external message is sent by
this entry. TruffleHog's existing verified-only scan may contact credential
providers when actually run, just as in cloud CI.

`node --test .github/ci/entry.test.mjs` exercises the real shell entry with
isolated fake tools and synthetic inputs. It proves command routing, failure
propagation and gate boundaries. It does not prove the application, material,
PDF, database, browser, security-service or cloud checks pass. The extraction
receipt `source-closure.json` records original workflow step hashes; the
intentional adaptations are portable Bash array input, fail-closed snapshot
log checks, literal license input, and the local nonduplicated PDF verification.
