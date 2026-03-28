---
name: sonarqube-fix
description: Fix SonarQube issues reported on a pull request. Use when the user wants to resolve SonarQube issues, clean up code quality warnings, or fix security hotspots from a PR analysis.
argument-hint: [pull-request-id]
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
---

Fix SonarQube issues reported on a pull request.

## Step 1 — Get the Pull Request ID

If `$ARGUMENTS` is provided, use it as the pull request ID.

Otherwise, use the **AskUserQuestion** tool to ask:
> "Please enter the Pull Request ID to fix SonarQube issues for (required):"

Do not proceed if no value is provided.

## Step 2 — Resolve the SonarQube project key

Follow this lookup order:
1. Check `.sonarlint/connectedMode.json` for `projectKey`
2. Search `sonar.projectKey` in root config files: `sonar-project.properties`, `pom.xml`, `build.gradle`, `build.gradle.kts`, `package.json`
3. Search CI/CD pipeline files: `.github/workflows/*.yml`, `Jenkinsfile`, `.gitlab-ci.yml`, `azure-pipelines.yml`
4. If still not found, call `mcp__sonarqube__search_my_sonarqube_projects` to list projects and use **AskUserQuestion** to let the user pick one

## Step 3 — Fetch issues from the PR

Call both in parallel:
- `mcp__sonarqube__search_sonar_issues_in_projects` with `projectKey` and `pullRequest`
- `mcp__sonarqube__search_security_hotspots` with `projectKey` and `pullRequest`

If there are no issues, report "No SonarQube issues found for PR #<id>" and stop.

## Step 4 — Plan the fixes

Group issues by file. For each file:
- Read the file to understand context
- Identify the root cause of each issue (NEVER suppress with `// NOSONAR` or similar — fix the actual code)
- Note the rule ID and severity

Use **TaskCreate** to create one task per file (or logical group) so progress is visible.

## Step 5 — Fix the issues

Work through each task:
- Edit only what is strictly necessary to resolve the issue
- Do NOT add unrelated refactors, comments, or docstrings
- Do NOT introduce new lint or type errors while fixing
- Call **TaskUpdate** to mark each task `completed` after fixing it

## Step 6 — Verify with tests

Run the test suite:
```bash
pnpm test
```

If changes touch content scripts, popup, or options UI, also run:
```bash
pnpm test:e2e
```

If any test fails, diagnose the root cause and fix it — do NOT skip, comment out, or remove tests.

## Step 7 — Report

Summarize:
- How many issues were fixed (bugs, code smells, security hotspots)
- Which files were changed
- Test results (passed / failed)
