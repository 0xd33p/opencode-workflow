# Changelog

All notable changes to this project will be documented in this file.

### Ci

- Auto-generate changelog from conventional commits on release Add git-cliff configuration (cliff.toml) and update the release workflow to dynamically generate changelogs from conventional commit history instead of using a static body template. The release workflow now: 1. Installs git-cliff 2. Generates a changelog for the current tag 3. Updates CHANGELOG.md in the repo 4. Uses the generated changelog as the GitHub Release body
- Auto-prune old releases, keep only last 5 After creating a new release, delete the 6th+ oldest releases and their associated tags to avoid clutter.

### Fix

- **ci:** Checkout main before committing CHANGELOG.md The release workflow ran in detached HEAD (tag checkout), causing 'git push' to fail. Switch to main branch before committing. Also add fetch-depth: 0 to avoid needing git fetch --unshallow.

### Refactor

- **agents:** Migrate from deprecated tools to permission field Remove the deprecated 'tools' key from all 7 agent configs and add matching 'permission' entries using the new allow/ask/deny system. Changes: - code-reviewer: edit:deny, bash:deny - debugger: edit:deny, bash with glob patterns - docs-writer: edit:allow, bash:deny - orchestrator: edit:allow, bash:allow, task:*:allow - refactorer: edit:allow, bash:deny - security-auditor: edit:deny, bash:deny - test-architect: edit:allow, bash:deny

### Chore

- Keep plural folder names in setup and release

### Style

- Auto-format files using Prettier

### Feat

- Add npx installer script

### Ci

- Add GitHub Action for auto-formatting
- Add release automation workflow

### Docs

- Refactor README for clarity and update repository references
- Add support section to README

### Feat

- **plugins:** Add Linux support to notifications plugin
- **tools:** Add bat tool
- **tools:** Add ctags tool
- **tools:** Add http tool
- **tools:** Add jq tool
- **tools:** Add rg tool
- **tools:** Add tree tool

### Fix

- **ci:** Remove explicit file_pattern to prevent pathspec error
- **ci:** Grant write permissions to GitHub Action bot

### Style

- Auto-format files using Prettier
