## AI Assistant Behavior Guidelines

### Testing and Verification
- **ALWAYS test fixes thoroughly before claiming they are complete**
- **NEVER claim something is "fixed" without proper verification**
- **Always verify that changes actually work as intended**
- **Be humble and admit when you're not sure about results**
- **Check to make sure the processes you're running aren't just hanging**

### Communication Style
- **Be careful about being overconfident**
- **Don't assume fixes work without testing them**
- **Ask for verification when unsure**
- **Be honest about limitations and uncertainties**

### Development Practices
- **Test all changes in the browser/application before declaring success**
- **Verify API endpoints are working correctly**
- **Check that UI changes render properly**
- **Ensure backend and frontend integration is functioning**

### Code Quality
- **Follow existing code patterns and conventions**
- **Maintain consistency with the current codebase structure**
- **Use proper error handling and validation**
- **Document complex logic and decisions**


## Remember
- **Test first, claim success second**
- **Verify everything works before moving on**
- **Be honest about what you can and cannot confirm**

## Enforcement

**MANDATORY**: Before completing ANY task, review `.cursor/rules/PRE_COMMIT_CHECKLIST.md` and ensure ALL items are checked.

**See**: `.cursor/rules/ENFORCEMENT.md` for complete enforcement system details.

**Violations will NOT be tolerated.** Follow the checklist every time.

# Session History Logging

- At the end of every user-facing task, append a concise summary to `/notes.md`.
- If `/notes.md` does not exist, create it before writing the summary.
- Use the following template for each entry:
  - `Date: YYYY-MM-DD`
  - `Tasks:`
    - `...` (bullet list of what was completed)
  - `Follow-ups:`
    - `...` (bullet list of outstanding items or `None`)
- Separate entries with a blank line for readability.

# Test-First Development
 
- **ALWAYS create tests for new functionality before or alongside implementation.**
- **NEVER commit code until all tests are passing.**
- When adding new features:
  1. Write tests first (or alongside implementation)
  2. Implement the feature
  3. Run tests to ensure they pass
  4. Fix any failing tests
  5. Only then commit the changes
- Test coverage should include:
  - Unit tests for individual functions/components
  - Integration tests for API routes and workflows
  - Component tests for UI interactions
  - Edge cases and error handling
- If tests fail, fix them before committing. Do not commit broken tests.
