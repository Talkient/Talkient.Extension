# Contributing to Talkient.Extension

Thank you for your interest in contributing! We welcome all contributions — bug fixes, new features, documentation improvements, and tests.

## Getting Started

1. **Fork** the repository and create your branch from `main`.
2. **Install dependencies** with [pnpm](https://pnpm.io/):
   ```bash
   pnpm install
   ```
3. **Build** the extension:
   ```bash
   pnpm build
   ```

## Development Workflow

- Use `pnpm run lint` and `pnpm run format:check` to verify code style before opening a PR.
- Run unit tests with `pnpm test` and E2E tests with `pnpm test:e2e`.
- Commits are linted via [Husky](https://typicode.github.io/husky/) pre-commit hooks (`pnpm run lint:fix` + `prettier`).

## Pull Request Guidelines

- Keep PRs focused: one feature or fix per PR.
- Add or update tests for any changed behaviour.
- Make sure all existing tests pass.
- Write clear commit messages that describe *what* and *why*.

## Code Style

- TypeScript only — no plain JavaScript in `src/`.
- Use `import` (ES modules), never `require`.
- Formatting is enforced by [Prettier](https://prettier.io/) (`.prettierrc`).
- Linting is enforced by [ESLint](https://eslint.org/) (`eslint.config.mjs`).

## Reporting Bugs

Open a [GitHub Issue](https://github.com/Talkient/Talkient.Extension/issues) with:
- A clear title and description.
- Steps to reproduce.
- Expected vs. actual behaviour.
- Browser version and extension version.

## Security

Please **do not** open a public issue for security vulnerabilities. See [SECURITY.md](./SECURITY.md) for the responsible disclosure process.

## License

By contributing, you agree that your contributions will be licensed under the [GPL-3.0-only](./LICENSE) license.
