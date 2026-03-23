# Review PR Comments

## Steps

1. **Detect PR context**: Check if `gh` CLI is available (`gh --version`). If available, find the current branch's open PR with `gh pr view --json number,url,comments,reviews` and extract all unresolved review comments using `gh api repos/{owner}/{repo}/pulls/{pr}/comments` and `gh api repos/{owner}/{repo}/pulls/{pr}/reviews`.

2. **Collect unresolved comments**: Filter out comments that have been resolved or are outdated. Focus on review comments that request changes or raise concerns.

3. **Analyze each comment**: For each unresolved comment, think carefully:
   - Read the relevant code at the file and line referenced in the comment
   - Determine if the concern raised is valid and makes sense in context
   - If it does NOT make sense (e.g., the code is already correct, the concern is based on a misunderstanding), explain why and skip it
   - If it DOES make sense, include it in the fix plan

4. **Build a fix plan**: For all valid comments, create a prioritized plan:
   - Group related comments together
   - For each item: describe the issue, the file/line affected, and the proposed fix
   - Present the plan to the user and ask for confirmation before making any changes

5. **Execute**: After user confirmation, implement the fixes one by one, marking each as done.

## Notes
- If `gh` is not available or there is no open PR for the current branch, ask the user to paste the review comments manually
- Do not fix comments that are already addressed in the current working tree
- Prefer minimal, focused changes — do not refactor surrounding code unless the comment specifically asks for it
