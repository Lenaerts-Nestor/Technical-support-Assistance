# Feature spec: <name>

> Status: draft | as-built | agreed · Source in old code: `<paths>` · Owner: <you> · Last reviewed: <date>

## 1. Why it exists
The user problem, in two sentences. What goes wrong without it? What would make it unnecessary?

## 2. Actors and permissions
| Actor | Can do |

## 3. Domain model
Entities, fields, relationships, where each is stored, how long it lives, what is a secret.

## 4. Business rules
| ID | Rule | Rationale (why) | Test |
Use IDs like `XX-R12`; every rule links to a test name. See `business-rule.md`.

## 5. User flows
Numbered steps for the happy path, then variants. Add a diagram for anything with more than 5 steps.

## 6. States
Empty · loading · error · offline · read-only · desktop vs web differences.

## 7. Dependencies
Other features, integrations, configuration, secrets (names only), required setup steps.

## 8. Automation (if any)
Use `automation-spec.md`.

## 9. Error handling
| Situation | What the user sees | What the system does | Recovery |

## 10. Accessibility and platform notes
Keyboard path for every pointer action, announcements, motion, mobile behaviour (full / view-only / unavailable).

## 11. Out of scope / future ideas
Separate lists. Future ideas never change section 4.

## 12. Open questions
