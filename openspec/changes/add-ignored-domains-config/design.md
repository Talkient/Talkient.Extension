## Context

Talkient currently decides whether to process page text based on node-level and element-level rules, but it has no site-level opt-out control. Users need a way to disable Talkient behavior on specific domains without disabling the extension globally. This change spans storage defaults, options UI, and content-script eligibility checks, so a shared design is needed to keep behavior consistent across modules.

## Goals / Non-Goals

**Goals:**

- Add a persistent `ignoredDomains` setting with an empty default value.
- Provide options-page management for ignored domains (add, edit, delete).
- Ensure runtime processing is skipped when current page hostname matches an ignored domain entry.
- Keep open tabs in sync with configuration changes through storage listeners.

**Non-Goals:**

- Implement wildcard or regex matching semantics.
- Add sync/account-level sharing beyond existing storage behavior.
- Introduce per-feature domain toggles (this is a single extension-level ignore list).

## Decisions

- Store ignored domains as `string[]` in extension settings under `ignoredDomains`, default `[]`.
  - Rationale: aligns with existing array-based settings patterns and keeps serialization simple.
  - Alternative considered: object map keyed by domain; rejected due to unnecessary complexity for small user-managed lists.

- Normalize domain entries before persistence using lowercase trimmed host-like values and reject empty entries.
  - Rationale: avoids duplicate mismatches caused by casing/whitespace differences and keeps matching deterministic.
  - Alternative considered: preserve raw user input exactly; rejected because matching behavior becomes inconsistent.

- Match by exact hostname or subdomain suffix (`example.com` matches `example.com` and `www.example.com`).
  - Rationale: supports the common intent of ignoring a whole site family while still avoiding complex wildcard syntax.
  - Alternative considered: exact-only matching; rejected because users would need many repetitive entries.

- Apply ignored-domain guard early in content-script processing eligibility checks.
  - Rationale: short-circuits work and prevents UI/button injection where extension behavior is explicitly disabled.
  - Alternative considered: filtering later during button injection only; rejected because processing overhead still occurs.

- Reuse `chrome.storage.onChanged` on both options page and content scripts to keep UI state and runtime cache current.
  - Rationale: follows existing extension architecture and avoids tab reload requirements.
  - Alternative considered: one-time read per page load; rejected because changes would not apply until reload.

## Risks / Trade-offs

- [User enters full URL instead of domain] -> Mitigation: normalize by extracting hostname when possible and show validation feedback for invalid entries.
- [Suffix matching can over-match if not boundary-checked] -> Mitigation: enforce dot-boundary logic (`host === domain` or `host.endsWith('.' + domain)`).
- [Large ignore lists could add lookup overhead] -> Mitigation: cache normalized values and use simple linear checks; list size is expected to remain small.
- [Concurrent edits from multiple options pages] -> Mitigation: rely on storage change events and overwrite with latest persisted state.
