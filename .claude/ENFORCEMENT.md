# Rule Enforcement System

## Purpose
This document outlines the enforcement mechanisms to ensure `.cursor/rules/rules.md` are ALWAYS followed.

## Enforcement Mechanisms

### 1. Pre-Commit Checklist
**Location**: `.cursor/rules/PRE_COMMIT_CHECKLIST.md`

**Usage**: 
- Review this checklist BEFORE claiming any work is complete
- Every item MUST be checked before moving on
- If any item is unchecked, work is NOT complete

### 2. Automated Reminders
The AI assistant should:
- Reference this checklist at the START of every coding session
- Check compliance BEFORE claiming completion
- Remind user if checklist items are missing

### 3. Session History Enforcement
**Rule**: Every user-facing task MUST have a `/notes.md` entry

**Enforcement**:
- Check `/notes.md` before completing any task
- If entry is missing, add it immediately
- Use the template from `.cursor/rules/rules.md`

### 4. Test-First Enforcement
**Rule**: Tests MUST pass before claiming completion

**Enforcement**:
- Run `npm test` before claiming work is done
- Fix ALL failing tests before moving on
- Never commit code with failing tests

### 5. Verification Enforcement
**Rule**: Test fixes in browser/application before claiming success

**Enforcement**:
- Never claim something is "fixed" without verification
- Be honest about what can and cannot be confirmed
- Ask for user verification when unsure

## Violation Consequences

If rules are violated:
1. **Immediate**: Fix the violation before proceeding
2. **Documentation**: Update `/notes.md` with what was missed
3. **Prevention**: Review checklist to prevent future violations

## Checklist Integration

Before completing ANY task:
1. Open `.cursor/rules/PRE_COMMIT_CHECKLIST.md`
2. Verify ALL items are checked
3. If not, complete missing items
4. Only then claim work is complete

---

**Remember**: The rules exist to ensure quality. Following them prevents wasted time and frustration.
