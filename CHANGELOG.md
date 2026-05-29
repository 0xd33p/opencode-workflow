# Changelog

All notable changes to this project will be documented in this file.

### Docs

- Update CHANGELOG.md for v1.2.0
- Add tools section to README and include tools in setup

### Refactor

- **agents:** Remove hardcoded model, inherit from session instead

### Ci

- Auto-generate changelog from conventional commits on release
- Auto-prune old releases, keep only last 5

### Docs

- Update CHANGELOG.md for v1.2.0

### Fix

- **ci:** Checkout main before committing CHANGELOG.md
- Strip commit body from changelog entries
- **ci:** Pull before pushing CHANGELOG.md

### Refactor

- **agents:** Migrate from deprecated tools to permission field

### Style

- Auto-format files using Prettier

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
