# Feature spec: Device API client + SSH Terminal (desktop only)

> As-built documentation. Source: `src/features/nvx/`, `src/features/terminal/`, `desktop/nvx.cjs`, `desktop/terminal.cjs`,
> `desktop/preload.cjs`, README sections "Device API" and "Terminal".
> Vendor-neutral on purpose: the current app targets one AV-device family's REST API; in the rebuild that vendor knowledge becomes a
> **device profile** (a replaceable adapter), not part of the core.

## 1. Why it exists

Troubleshooting network devices means repeating the same read-only calls on several units and comparing answers, and sometimes
opening a text console. Doing that in a generic API tool or a terminal loses context (which unit? which saved call? what changed?).
This feature is a **small, safe Postman + multi-console for the units you support**, with safety rails so a tired
person cannot change a device by accident.

**Why desktop only:** a browser cannot set `Cookie`/`Origin`/`Referer`, keep HttpOnly cookies, accept self-signed certificates for a single
host, or open raw SSH. The Electron main process does it; the web build only lets you *prepare* groups, units and calls.

## 2. Architecture (keep this split)

```
Renderer (UI, React)  ──preload bridge (narrow, typed)──▶  Main process (network + secrets)
  groups/units/calls state                                   login/session/cookies, TLS exception, SSH
  results/compare/review UI                                  validation + limits (never trusts the UI)
```

Rule for the rebuild: **every safety rule is enforced in the main process**, the UI only mirrors it.

## 3. Domain model

```
Group        id, name, username, units[], folders[], calls[]
Unit         id, name, ipv4
Folder       id, name
SavedCall    id, title, folderId?, method, path, headers (text), body (text)
Result       unitId, callId, status, ms, size, body|image, responseHeaders (no cookies)
ChangeLog    session-only list of {time, unit, method, path, outcome}
Terminal     id, host, user, state, history (memory only)
```
Persisted: groups/units/folders/calls (incl. headers/bodies) in `nvx.json`, plus full backup. **Never persisted:** passwords, command history,
session cookies, change log.

## 4. Business rules

### Device API
| ID | Rule |
|---|---|
| DA-R1 | Only **private-network IPv4** (10/8, 172.16/12, 192.168/16, 169.254/16) are accepted; the app cannot be pointed at the internet. |
| DA-R2 | Self-signed certificate accepted **only** for those requests. |
| DA-R3 | Methods: GET, POST, PUT, PATCH, DELETE. Path: starts with one `/`, printable ASCII, no spaces, ≤ 500 chars, not `//…`. |
| DA-R4 | Headers: ≤ 20; the app-managed ones (`Cookie`, `Host`, `Content-Length`, `Transfer-Encoding`, `Connection`, … ) cannot be overridden. |
| DA-R5 | Body ≤ 100 KB; form-data uploads ≤ 50 MB with a 120 s timeout; responses capped at 5 MB; normal timeout 10 s. |
| DA-R6 | Login is automatic, repeated when a session expires; **a failed login stops the run for that unit (no retry)** so a wrong password cannot lock an account. Logs out of every device on quit. |
| DA-R7 | Password lives in memory only; username remembered per group. |
| DA-R8 | App starts in **Read only** every time. **Changes allowed** is a deliberate switch. |
| DA-R9 | `Send` runs a GET at once; any other method opens a **review** showing exactly what goes out (method, path, headers, body). |
| DA-R10 | Changes go to **one unit at a time**. After sending, show the device's own answer (applied / restart needed / refused + reason). |
| DA-R11 | **Run all** and folder play run **only GET** calls. Deleting a folder keeps its calls. |
| DA-R12 | An **empty object in a body** is flagged (the device treats it as "delete this object"); button becomes "Send anyway"; never blocked. *(Vendor-specific → move to the device profile.)* |
| DA-R13 | A settings-change POST is **read back** and the on-screen value follows the device. |
| DA-R14 | Results: per unit, per call: status, time, size, table/JSON, response headers (cookies hidden), images rendered (PNG/JPEG/GIF/WebP/BMP; SVG excluded). |
| DA-R15 | **Compare**: units side by side, differing properties highlighted, "Only differences" filter; unreachable units left out and marked. |
| DA-R16 | In-place value editing (pencil) only when changes are allowed; read-only values are refused by the device with a message. |
| DA-R17 | "Changes this session" list with **Copy log** for a case note. |

### Terminal
| ID | Rule |
|---|---|
| TM-R1 | One SSH session = one unit, port 22, private IPv4 only, **max 12** terminals; all closed on quit. |
| TM-R2 | Grid: 3 per row by default (1/2/3 selectable); sidebar collapses to icons while any terminal is open; terminals keep running while you visit other pages. |
| TM-R3 | Unit card: host name, firmware, release, **Web** button → `https://<ip>/`. Read on a **second hidden shell** on the same connection (`hostname`, `ver -v`, `help all`), so typing is never delayed. |
| TM-R4 | Line editing in the page while the unit is at its prompt (history ↑/↓, Tab completion from the unit's own command list, Home/End/Delete, Ctrl+A/E/K/U/W). While a command runs, keys go straight through. A toggle passes every key untouched. |
| TM-R5 | Ctrl+C copies when text is selected, interrupts otherwise; Ctrl+V pastes. |
| TM-R6 | **Host keys**: first sight is remembered (accept-new); a different key later is refused, with an explicit "Trust the new key and connect" action. |
| TM-R7 | Command history is per unit, **memory only** (commands can contain passwords). |
| TM-R8 | The terminal is **not** covered by the Changes-allowed switch (a console can do anything) — a documented gap; consider an explicit "console = full access" banner. |

## 5. User flow (Device API)

1. Pick/create a group → add units (name + IP) → tick one or more.
2. Enter username/password (memory only).
3. Build or load a saved call → **Send** (GET) → see per-unit cards → optionally **Compare**.
4. To change something: switch to **Changes allowed** → Send → **review** → confirm → read the device's answer → copy the log into the case.

## 6. Error handling

| Case | Behaviour |
|---|---|
| Public/invalid IP | Rejected before any request |
| Device silent | Gives up after 10 s, result marked, other units continue |
| 403 | Bad credentials or expired session → re-login once; failed login stops that unit |
| Oversized body/response | Refused with a message |
| SSH host key changed | Refused until trusted explicitly |

## 7. Rebuild recommendations

- **Device profile interface**: `{ id, loginFlow, defaultHeaders, dangerousPatterns[], propertyReader, endpoints[] }`. The vendor-specific login, the "empty object = delete" check and
  the "POST /Device = change setting" read-back become one profile; a generic REST profile ships as the default.
- Typed IPC contract (one schema file shared by main and renderer), every handler validated again in main.
- Save **environments** (lab/production) with a colour; show a persistent banner when Changes are allowed.
- **Snapshot & diff**: store a result set with a label ("before upgrade"), diff against a later run.
- **Audit log** of changes to a local file (opt-in), still without secrets.
- Export results to CSV/Markdown for case notes.
- Terminal: broadcast a read-only command to several consoles; session logging opt-in with redaction.
- Test with a **fake device server** (HTTPS + SSH) in CI instead of only unit tests for helpers.
