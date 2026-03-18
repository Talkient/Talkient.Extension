# Upgrade npm packages to latest

Follow these steps in order. Stop and report any failure before proceeding.

## 1. Check outdated packages

```
pnpm outdated
```

Review the output and note any major-version bumps (semver `X.0.0`) — these are likely breaking changes.

## 2. Update the github actions

Update the workflow actions used in `.github/workflows` to their latest stable major versions.

## 3. Upgrade all packages to latest

```
pnpm update --latest
```

This updates `package.json` ranges and installs the latest versions.

## 4. Verify the build compiles

```
pnpm build
```

If the build fails, read the compiler errors and fix them:

- Type errors → update typings / adjust code to match new API signatures
- Missing exports → check the package's changelog/migration guide and update imports
- Removed APIs → replace with the new equivalent

Repeat until the build passes.

## 5. Run all tests

```
pnpm test:all
```

Fix any failures. Do not skip tests.

## 6. Report results

List all packages that were upgraded (name, old version → new version) and any breaking changes that required code fixes.
