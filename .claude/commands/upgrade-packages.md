# Upgrade npm packages to latest

Follow these steps in order. Stop and report any failure before proceeding.

## 1. Check outdated packages

```
pnpm outdated
```

Review the output and note any major-version bumps (semver `X.0.0`) — these are likely breaking changes.

## 2. Upgrade all packages to latest

```
pnpm update --latest
```

This updates `package.json` ranges and installs the latest versions.

## 3. Verify the build compiles

```
pnpm build
```

If the build fails, read the compiler errors and fix them:
- Type errors → update typings / adjust code to match new API signatures
- Missing exports → check the package's changelog/migration guide and update imports
- Removed APIs → replace with the new equivalent

Repeat until the build passes.

## 4. Run unit tests

```
pnpm test
```

Fix any failing tests caused by changed behavior or updated mocks. Do not skip tests.

## 5. Run E2E tests

```
pnpm test:e2e
```

Fix any failures. E2E runs `publish` internally (clean dist build) before testing.

## 6. Report results

List all packages that were upgraded (name, old version → new version) and any breaking changes that required code fixes.
