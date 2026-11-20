# Process Recipe Library

The ordinary [Library URL](https://yousefmahajna.github.io/Process-Recipe-Library/) retains its existing Viewer / Editor controls and browser role preference.

When opened from [Process Lab](https://yousefmahajna.github.io/interconnect-process-lab/), the Library receives only the selected email in the URL fragment and reads the current shared permission list and policy. Viewer is read-only; Editor, Manager and Administrator use the Library's existing Editor capabilities. The header shows the selected person's name, email and access level, plus a back link. Hub entry hides the role-switch buttons and ignores stored legacy role preferences and any role/name supplied in the URL.

Denied access, invalid email or failed permission lookup blocks hub entry with a Retry button. No database reads start before the permission check succeeds. Permission changes apply on reload. Internal tabs preserve the email handoff and page choice when reloading. The hub still selects an email without verifying ownership: this is not NVIDIA SSO or server-side authorization. Firebase access continues to depend on the existing database configuration, which is unchanged.

Hub recovery drafts are scoped by email and permission level. A Viewer does not recover an Editor draft or legacy draft, and cannot switch to Editor through recovery. Returning to the original level preserves access to that person's drafts. The existing database store, ETag concurrency checks, history and backup behavior remain; a Viewer guard blocks every store mutation and non-GET database request. No database migration or live data update is part of this change.

When GitHub explicitly reports an exhausted anonymous API quota, the permission reader falls back to the same public `main/platforms.json` on `raw.githubusercontent.com`, with browser caching disabled and a fresh request URL. Other API errors still block entry, as do invalid, denied or unavailable fallback responses. No stored role or browser draft substitutes for the shared permission list.

Run `node --test tests/*.test.cjs` with Node 24. Tests cover current shared permissions, all role mappings, forged URL parameters, denied access, failed lookups and quota fallback. Separate mocked browser checks validated the actual hub link, regular role controls, all Library tabs and reloads, Viewer write guards, role-separated drafts, Editor saves and failed-save draft retention. No live writes were used for validation.
