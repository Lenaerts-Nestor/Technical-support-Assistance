# Automation spec: <name>

| Field | Value |
|---|---|
| Purpose (why) | |
| Trigger | schedule / event / manual · exact times · time zone · DST handling |
| Runs where | app / database / server worker |
| Inputs | data read (tables, settings), required configuration, secrets (names only) |
| Preconditions | what must exist for it to run (e.g. a published schedule today) |
| Steps | numbered, with the decision at each branch |
| Idempotency | how a second/late/overlapping run is made harmless (claim key, window) |
| Delivery semantics | at-most-once / at-least-once; retry policy; dead-letter |
| Outputs | message/record/side effect, with the exact template |
| Observability | where a human sees the last runs, failures, and next run |
| Failure modes | table: failure → detection → user message → recovery |
| Manual controls | run now, retest, pause, change time, dry-run |
| Dependencies | extensions, services, links that must exist |
| Test plan | clock injection, window edges, DST days, holidays, concurrency, failure injection |
| Future improvements | kept separate from the above |
