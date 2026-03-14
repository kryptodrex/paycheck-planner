# Paycheck Planner Copilot Instructions

## PR Review Expectations

When asked to review a PR, pull request diff, or changeset, default to a PR review mindset focused on merge risk, regressions, and missing validation. This project is an Electron + React + TypeScript desktop app built with Vite, so reviews should favor focused root-cause fixes that preserve existing architecture, shared primitives, and established UX patterns unless the change explicitly justifies something broader.

- Prioritize findings over summaries.
- Focus first on bugs, behavioral regressions, data loss risks, invalid file acceptance, persistence issues, and missing or insufficient tests.
- Call out platform-specific risks for Electron, especially file handling, keyboard shortcuts, native integrations, and packaging/signing behavior.
- Identify when a change duplicates logic that should live in a shared utility, hook, service, or component.
- Flag changes that bypass existing shared UI primitives such as `Modal`, `Button`, `Toast`, and other shared form or layout components without a clear reason.
- Prefer fixes at the service or state-management boundary when the PR only patches symptoms in the UI.
- Flag styling changes that drift from the current visual language or introduce broad CSS selectors instead of component-scoped selectors.
- Flag globally scoped CSS that risks collisions across screens.
- Treat file operations as safety-critical. Call out regressions in moved-file relink behavior, acceptance of non-plan files such as settings exports, or save flows that can target stale or missing file paths.
- Preserve the existing two-tier keyboard shortcut model: Electron/global shortcuts for app-level reliability and React capture-phase listeners as renderer fallback. Treat bubbling-only handlers for critical shortcuts as a review risk.
- Treat missing test coverage for changed `src/services` or `src/utils` files as a review finding unless there is a strong reason not to add tests.
- Treat a new file in `src/services` or `src/utils` without a corresponding `*.test.ts` file as a review finding.
- Treat changed logic in an existing `src/services` or `src/utils` file without corresponding updates to its existing tests as a review finding.
- Check that new behavior added to existing service or util modules is explicitly exercised by tests, not only covered indirectly by unrelated suites.
- Prefer mock-based tests for services that touch Electron APIs, file system behavior, or keychain behavior.
- Flag dependency or build changes in the package.json or Vite config that are not clearly justified by the PR description or that introduce new risks without clear mitigation.
- If a PR includes a dependency update, check the changelog for that dependency for any breaking changes or new risks that should be called out in the review.

## Review Response Format

- Present findings first, ordered by severity.
- Include concrete file references whenever possible.
- Keep summaries brief and secondary.
- When it makes sense, give a brief explanation of the root cause or reasoning behind a finding, but avoid long-winded explanations when the issue is straightforward.
- For each finding, if possible, suggest a specific fix or improvement rather than just flagging the issue.
- If no issues are found, state that explicitly and mention any residual risks or validation gaps.

## Collaboration Style

- Be direct, concise, and technical.
- Do useful work without unnecessary back-and-forth when the task is clear.
- If there are unrelated local changes, do not revert them unless explicitly asked.
- If user changes conflict with the current task, stop and ask before overwriting them.
