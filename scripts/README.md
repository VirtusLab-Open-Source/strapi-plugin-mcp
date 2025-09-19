# Release Scripts

## generate-changelog.js

A Node.js script for generating a `CHANGELOG.md` file based on conventional commits and release markers.

### Usage

```bash
# Using npm script (recommended)
npm run changelog

# Or directly
node scripts/generate-changelog.js [--output=path]
```

### Options

- `--output=PATH` - Specify custom output file path (default: `CHANGELOG.md`)
- `--help, -h` - Show help message

### What it does

1. **Gets all commits** - Reads entire git history (ignores tags)
2. **Identifies releases** - Finds `chore` commits starting with "version"
3. **Groups commits by releases** - Organizes commits between release markers
4. **Parses conventional commits** - Categorizes commits by type (feat, fix, docs, etc.)
5. **Generates structured changelog** - Creates markdown with sections for each commit type

### Release identification

Releases are identified by commit messages that:
- Have type `chore`
- Subject starts with "version"
- Supports both stable and beta versions
- Examples: 
  - `chore: version 1.2.3`
  - `chore: version 1.2.3-beta.1`
  - `chore(repo): version 2.0.0-beta.2`

### Example output structure

```markdown
# Changelog

## [Unreleased]

### ✨ Features
- **server**: add new MCP tool for content management ([abc1234](../../commit/abc1234))

### 🐛 Bug Fixes  
- **admin**: resolve UI rendering issue ([def5678](../../commit/def5678))

## [1.2.0-beta.1] (2024-01-20)

### ✨ Features
- **server**: add beta feature for testing ([xyz789](../../commit/xyz789))

## [1.0.0] (2024-01-15)

### 💥 BREAKING CHANGES
- **common**: change API response format ([ghi9012](../../commit/ghi9012))

### ✨ Features
- **server**: implement user authentication ([jkl3456](../../commit/jkl3456))
```

### How it works with your release script

This changelog script works perfectly with the `prepare-release.js` script:

1. **Release script** creates commits like: `chore: version 1.2.3` or `chore: version 1.2.3-beta.1`
2. **Changelog script** finds these commits and groups changes between them
3. **Result**: Automatic changelog generation based on your releases

Example workflow:
```bash
# Make some feature commits
git commit -m "feat(server): add new feature"
git commit -m "fix(admin): resolve bug"

# Create stable release
npm run prepare-release abc1234
# Creates: "chore: version 1.2.3"

# Or create beta release
node scripts/prepare-release.js abc1234 --beta
# Creates: "chore: version 1.3.0-beta.1"

# Generate updated changelog (handles both stable and beta)
npm run changelog
```

### Commit categorization

- 💥 **BREAKING CHANGES** - Commits with `!` or `BREAKING CHANGE:`
- ✨ **Features** - `feat:` commits
- 🐛 **Bug Fixes** - `fix:` commits  
- 📚 **Documentation** - `docs:` commits
- ♻️ **Code Refactoring** - `refactor:` commits
- ⚡ **Performance Improvements** - `perf:` commits
- 🧹 **Chore** - `chore:`, `test:`, `build:`, `ci:`, `style:`, `revert:` commits
- 📦 **Other Changes** - Non-conventional commits

---

## prepare-release.js

A Node.js script for automated release preparation using conventional commits and semantic versioning.

### Usage

```bash
# Using npm script (recommended)
npm run prepare-release <commit-hash>

# Or directly
node scripts/prepare-release.js <commit-hash> [--tag] [--beta[=N]]
```

### Options

- `--tag` - Automatically create a git tag after committing the release
- `--beta[=N]` - Create a beta release (e.g., 1.0.0-beta.1)
  - `--beta` - Auto-increment beta number or create beta.1
  - `--beta=2` - Create specific beta number (e.g., 1.0.0-beta.2)
  - `--beta 3` - Alternative syntax for specific beta number

### What it does

1. **Analyzes commits** - Gets all commits from the specified commit hash up to the latest commit (HEAD)
2. **Validates conventional commits** - Ignores commits that don't follow conventional commit format  
3. **Determines version bump** - Calculates next semver version based on commit types:
   - `BREAKING CHANGE` or `!` marker → **major** version bump
   - `feat:` commits → **minor** version bump  
   - `fix:` commits → **patch** version bump
   - Other valid commits → **patch** version bump
   - With `--beta`: Appends `-beta.N` to the version (e.g., 1.2.0-beta.1)
4. **Updates package.json** - Sets the new version
5. **Runs pnpm install** - Updates the lockfile
6. **Stages files** - Adds `package.json` and `pnpm-lock.yaml` to git staging
7. **Commits automatically** - Creates a commit with message `chore(repo): release vX.Y.Z`
8. **Creates tag (optional)** - Optionally creates a git tag `vX.Y.Z`

### Example

```bash
# Prepare stable release analyzing commits since specific commit to HEAD
npm run prepare-release abc1234

# Prepare stable release with automatic tagging
node scripts/prepare-release.js abc1234 --tag

# Prepare beta release (auto-increment or beta.1)
node scripts/prepare-release.js abc1234 --beta

# Prepare specific beta version
node scripts/prepare-release.js abc1234 --beta=2

# Prepare specific beta version (alternative syntax)
node scripts/prepare-release.js abc1234 --beta 3

# Prepare beta release with automatic tagging
node scripts/prepare-release.js abc1234 --beta=5 --tag

# Prepare release analyzing commits since a tag to HEAD  
npm run prepare-release v1.0.0

# Prepare beta release analyzing commits since a branch point to HEAD
node scripts/prepare-release.js feature/my-branch --beta --tag
```

### Expected commit format

The script follows conventional commits specification:

```
type(scope)!: subject

feat(server): add new MCP tool for content management
fix(admin): resolve UI rendering issue  
refactor(common)!: change API response format
```

### After running the script

The script automatically commits the changes and optionally creates a tag. Example output:

**Without --tag:**
```bash
Release completed successfully!
Version updated from 1.0.0-beta.1 to 1.1.0
Commit created: chore(repo): release v1.1.0

Next steps:
  git push origin main
  git tag v1.1.0  # Create tag manually if needed
  git push origin v1.1.0  # Push tag if created
```

**With --tag:**
```bash
Release completed successfully!
Version updated from 1.0.0-beta.1 to 1.1.0
Commit created: chore(repo): release v1.1.0
Tag created: v1.1.0

Next steps:
  git push origin main
  git push origin v1.1.0
```

**Beta release (--beta):**
```bash
Release completed successfully!
Version updated from 1.0.0 to 1.1.0-beta.1
Commit created: chore(repo): release v1.1.0-beta.1

Next steps:
  git push origin main
  git tag v1.1.0-beta.1  # Create tag manually if needed
```

**Subsequent beta (from 1.0.0-beta.1 to 1.0.0-beta.2):**
```bash
Release completed successfully!
Version updated from 1.0.0-beta.1 to 1.0.0-beta.2
Commit created: chore(repo): release v1.0.0-beta.2
```

**Specific beta number (--beta=5):**
```bash
Preparing release analyzing commits from abc1234 to HEAD
Current version: 1.0.0
Release type: beta.5
Auto-tagging: disabled

Release completed successfully!
Version updated from 1.0.0 to 1.1.0-beta.5
Commit created: chore(repo): release v1.1.0-beta.5
```

### Error handling

- Invalid commits are ignored and logged
- Script exits with error if no valid conventional commits are found
- Validates git repository and commit hash existence
- Handles missing previous tags (starts from v0.0.0)
