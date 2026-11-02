# Business rule template

```
ID:         XX-R12
Statement:  One sentence, testable ("A reminder is skipped when it is more than 30 minutes late").
Why:        The reason it exists / the failure it prevents.
Applies to: feature · actor · platform
Inputs:     data the rule reads
Example:    concrete numbers ("due 11:45, now 12:20 → skipped")
Exceptions: when it does NOT apply
Priority:   hard (never violated) | soft (weighted, with the weight)
Test:       file::test name
Source:     old file/function it came from
```

Tip: write the example first; if you cannot, the rule is not precise enough yet.
