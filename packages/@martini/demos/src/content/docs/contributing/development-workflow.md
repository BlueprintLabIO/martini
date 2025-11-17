---
title: Development Workflow
description: Learn the workflow for making changes and submitting pull requests to Martini SDK
---

# Development Workflow

This guide covers the process of making changes to Martini SDK and submitting pull requests.

## Before You Start

1. **Read the [Getting Started Guide](/docs/latest/contributing/getting-started)** to set up your environment
2. **Pick an issue or feature** from [Where to Contribute](/docs/latest/contributing/where-to-contribute)
3. **Check existing issues and PRs** to avoid duplicate work
4. **Ask questions** in GitHub Discussions if uncertain

## Making Changes

### 1. Create a Branch

Use descriptive branch names:

```bash
# Feature branches
git checkout -b feature/host-migration
git checkout -b feature/socket-io-transport

# Bug fix branches
git checkout -b fix/sprite-interpolation-bug
git checkout -b fix/player-leave-race-condition

# Documentation branches
git checkout -b docs/add-unity-guide
git checkout -b docs/update-api-reference
```

**Branch naming convention:**
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation changes
- `refactor/*` - Code refactoring
- `test/*` - Test additions/improvements
- `chore/*` - Build config, dependencies, etc.

### 2. Make Your Changes

Follow these guidelines:

#### Code Changes

- **Follow [Coding Standards](/docs/latest/contributing/coding-standards)**
- **Keep changes focused** - One feature/fix per PR
- **Write tests** for new functionality
- **Update documentation** if you change APIs
- **Ensure type safety** - No `any` without justification

#### Documentation Changes

- **Use clear, simple language**
- **Include code examples** where appropriate
- **Test all code snippets**
- **Add links** to related docs

### 3. Commit Your Changes

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
# Features
git commit -m "feat(core): add host migration support"
git commit -m "feat(phaser): add swimming physics profile"

# Bug fixes
git commit -m "fix(phaser): resolve sprite interpolation stuttering"
git commit -m "fix(core): handle race condition in player leave"

# Documentation
git commit -m "docs(api): update GameRuntime documentation"
git commit -m "docs(guide): add Unity adapter guide"

# Tests
git commit -m "test(core): add tests for player join/leave"
git commit -m "test(transport): add WebSocket error handling tests"

# Chore
git commit -m "chore: update dependencies"
git commit -m "chore(build): optimize Turbo pipeline"
```

**Commit message format:**
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `test` - Tests
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `chore` - Build/tooling changes
- `style` - Code style (formatting, missing semicolons)

**Scopes:**
- `core` - @martini/core
- `phaser` - @martini/phaser
- `transport` - Transport packages
- `devtools` - @martini/devtools
- `ide` - @martini/ide
- `demos` - @martini/demos
- `docs` - Documentation
- `build` - Build system

### 4. Test Your Changes

Run the full test suite:

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @martini/core test

# Run tests in watch mode during development
pnpm --filter @martini/core test --watch

# Run tests with coverage
pnpm test --coverage
```

**Manual testing checklist:**

- [ ] Changes work in dev mode (`pnpm --filter @martini/demos dev`)
- [ ] Production build succeeds (`pnpm build`)
- [ ] Type checking passes (`pnpm --filter <package> check`)
- [ ] Example games still work
- [ ] No console errors
- [ ] Works in multiple browsers (Chrome, Firefox, Safari)

### 5. Update Documentation

If your changes affect user-facing functionality:

- [ ] Update relevant API documentation
- [ ] Add/update code examples
- [ ] Update README if necessary
- [ ] Add entry to CHANGELOG.md (if releasing)

## Submitting a Pull Request

### 1. Push Your Branch

```bash
git push origin feature/my-feature
```

### 2. Create Pull Request

Go to the Martini repository and create a pull request:

**PR Title Format:**
- Use the same format as commit messages
- Examples:
  - `feat(core): add host migration support`
  - `fix(phaser): resolve sprite interpolation bug`
  - `docs: add Unity integration guide`

**PR Description Template:**

```markdown
## Description
<!-- Describe what this PR does -->

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
<!-- Link to related issues -->
Closes #123
Related to #456

## Changes Made
<!-- List the specific changes -->
- Added host migration support
- Updated GameRuntime to handle host transfer
- Added tests for host failover

## Testing
<!-- Describe how you tested these changes -->
- [ ] Added unit tests
- [ ] Added integration tests
- [ ] Manual testing completed
- [ ] Tested in multiple browsers

## Screenshots/GIFs
<!-- If applicable, add screenshots or GIFs -->

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Breaking Changes
<!-- If this is a breaking change, describe the migration path -->

## Additional Notes
<!-- Any additional information -->
```

### 3. Address Review Feedback

The maintainers will review your PR within 2-3 business days:

**During review:**
- Be responsive to questions and feedback
- Make requested changes in new commits (don't force-push)
- Update the PR description if scope changes
- Re-request review after addressing feedback

**Common review feedback:**
- Code style improvements
- Test coverage gaps
- Documentation updates needed
- Performance concerns
- Security issues

### 4. CI/CD Checks

Your PR must pass all automated checks:

- ✅ **Build** - All packages build successfully
- ✅ **Tests** - All tests pass
- ✅ **Type Check** - No TypeScript errors
- ✅ **Lint** - Code follows style guidelines
- ✅ **Coverage** - Test coverage meets threshold

If checks fail:
1. Click "Details" to see the error
2. Fix the issue locally
3. Push the fix
4. CI will automatically re-run

### 5. Merge

Once approved and all checks pass:

- Maintainer will merge your PR
- Your changes will be included in the next release
- You'll be added to the contributors list!

## Best Practices

### Keep PRs Small

- **Easier to review** - Reviewers can understand changes quickly
- **Faster to merge** - Less chance of conflicts
- **Lower risk** - Smaller changes are less likely to introduce bugs

**Good PR sizes:**
- Small: &lt; 100 lines changed
- Medium: 100-500 lines changed
- Large: &gt; 500 lines changed (avoid if possible)

**If your PR is too large:**
- Split into multiple PRs
- Submit infrastructure changes first
- Then submit feature changes

### Write Clear PR Descriptions

Help reviewers understand your changes:

- **Explain the why** - Why is this change needed?
- **Describe the how** - How did you implement it?
- **Show the what** - What changed (screenshots, GIFs, examples)
- **List testing** - How did you verify it works?

### Respond to Feedback Constructively

- **Thank reviewers** for their time
- **Ask questions** if feedback is unclear
- **Explain your reasoning** if you disagree
- **Be open to suggestions** - reviewers want to help!

### Keep Your Branch Updated

If your PR is open for a while:

```bash
# Fetch latest changes
git fetch origin

# Rebase on main
git rebase origin/main

# If conflicts, resolve them and continue
git rebase --continue

# Force push (since we rebased)
git push --force-with-lease
```

## Common Workflows

### Fixing a Bug

1. Create issue describing the bug
2. Create branch: `fix/bug-description`
3. Write a failing test that reproduces the bug
4. Fix the bug
5. Verify the test now passes
6. Submit PR referencing the issue

### Adding a Feature

1. Discuss the feature in GitHub Discussions (optional but recommended)
2. Create branch: `feature/feature-name`
3. Implement the feature
4. Write tests
5. Update documentation
6. Submit PR with detailed description

### Improving Documentation

1. Create branch: `docs/what-you-are-documenting`
2. Make documentation changes
3. Test code examples
4. Submit PR

### Updating Dependencies

1. Create branch: `chore/update-dependencies`
2. Update `package.json`
3. Run `pnpm install`
4. Test that everything still works
5. Submit PR with changelog of dependency updates

## Getting Help

If you're stuck or have questions:

- **Ask in your PR** - Tag maintainers with `@username`
- **GitHub Discussions** - General questions and brainstorming
- **Discord** (if available) - Real-time chat
- **Stack Overflow** - Tag with `martini-sdk`

## After Your PR is Merged

1. **Pull the latest main branch**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Delete your feature branch** (optional)
   ```bash
   git branch -d feature/my-feature
   ```

3. **Celebrate!** 🎉 You've contributed to open source!

## Code Review Guidelines

When reviewing others' PRs:

- **Be kind and constructive**
- **Explain your reasoning** - Don't just say "change this"
- **Ask questions** rather than making demands
- **Appreciate the effort** - Contributing is hard work!
- **Focus on code, not the person**

**Good review comment:**
> "Great work on this feature! I noticed that we're using `playerId` here instead of `targetId`. This could cause issues when one player affects another. Could we update this to use `targetId`? See [this example](link) for reference."

**Bad review comment:**
> "This is wrong. Use `targetId` not `playerId`."

---

Ready to make your first contribution? Start with [Getting Started](/docs/latest/contributing/getting-started)!
