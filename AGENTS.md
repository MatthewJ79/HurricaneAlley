# Hurricane Alley project instructions

## Repository and write-location control

- Never create or initialize a repository, Codex project, worktree, duplicate checkout, or external workspace unless the user explicitly approves the exact path and purpose first.
- Write only inside this existing repository unless the user explicitly approves an exact outside destination. Do not treat `Documents/ChatGPT`, a projectless task directory, or an automatically generated workspace as a project location.
- Before writing, state the active repository and the exact files or directories expected to change.
- After writing, report every created, modified, moved, and deleted path with its repository. Do not hide generated files, screenshots, temporary files, environment files, or tool-created directories from the report.
- Never display secret values. Moving an environment file requires an exact destination and hash or presence verification without revealing its contents.
- Commits, pushes, deployments, publications, remote-state changes, new repositories, new worktrees, agents, automations, and unrelated work require their applicable explicit authorization.

## User-supplied visual assets

- When the user supplies an icon, logo, badge, or other visual asset for use in the app, use that exact supplied asset.
- Do not redraw, trace, recreate, reinterpret, regenerate, or substitute a user-supplied asset unless the user explicitly requests a new version.
- Non-creative technical preparation is allowed only when needed for app integration (for example: copying into the project, lossless resizing, or removing a background while preserving the supplied artwork exactly).
- If the supplied file cannot be used as-is, explain the limitation before creating any visually different replacement.
