# Security policy

## Reporting a vulnerability

Please report vulnerabilities **privately**:

- Use GitHub's private vulnerability reporting on this repository (Security → Report a vulnerability), or
- email the security contact for the instance you are testing. For the official instance this is the address in `STM_SECURITY_CONTACT`, which is shown on its `/privacy` and `/project` pages.

Do not open a public issue for security problems. Please leave real message text and real phone numbers out of your report. Synthetic examples are enough.

## What to expect

This is a solo-maintained project. Responses are best effort and there is **no bug bounty**. Security reports skip the weekly triage queue. We aim to acknowledge them within 7 days.

## Scope that matters most

- Any path by which a full sender number, the internal sender hash, a receipt code, raw message text, a screenshot or an IP address can be stored, logged or published.
- Bypasses of the scrubbing rules that let names, numbers, links or emails reach storage.
- Ways to delete or flag someone else's report without its receipt (flags are intentionally receipt-free but only hide public views pending review).
- CSP bypasses or any way to load third-party code.

## Operator note

The deployment secret `STM_HMAC_KEY` is the single point of protection for stored sender hashes; see `docs/threat-model.md`. If it leaks, rotate it and treat stored prefixes and hashes as recoverable numbers.
