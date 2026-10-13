# Cursor Rules System

This directory contains the rules and enforcement mechanisms for AI-assisted development.

## Files

### `rules.md`
The main rules document that defines:
- Testing and verification requirements
- Communication style guidelines
- Development practices
- Code quality standards
- Session history logging requirements
- Test-first development requirements

### `PRE_COMMIT_CHECKLIST.md`
A mandatory checklist that MUST be reviewed before completing any task. Contains:
- Testing and verification checklist
- Session history logging checklist
- Test-first development checklist
- Communication checklist
- Code quality checklist

### `ENFORCEMENT.md`
The enforcement system that ensures rules are followed:
- Explains how to use the checklist
- Defines violation consequences
- Provides integration guidance

## Usage

**Before completing ANY task:**
1. Review `.cursor/rules/PRE_COMMIT_CHECKLIST.md`
2. Ensure ALL items are checked
3. Only then claim work is complete

**After completing a task:**
1. Add entry to `/notes.md` using the template
2. Verify all tests pass
3. Confirm changes work as intended

## Violations

If rules are violated:
1. Fix the violation immediately
2. Document what was missed in `/notes.md`
3. Review checklist to prevent future violations

---

**Remember**: These rules exist to ensure quality and prevent wasted time. Follow them consistently.
