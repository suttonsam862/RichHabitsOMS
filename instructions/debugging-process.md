
# Debugging Process

1. **Reproduce:** Verify the bug in local environment.
2. **Isolate:** Comment out or mock external dependencies to narrow down.
3. **Inspect:** Use breakpoints & `console.log` to trace variable values.
4. **Test:** Write a failing unit or integration test capturing the issue.
5. **Fix:** Implement the minimal change and rerun tests.
6. **Review:** Ensure no regressions; run full test suite & manual smoke test.
7. **Document:** Add a short note under `docs/CHANGELOG.md` saying what was fixed.
