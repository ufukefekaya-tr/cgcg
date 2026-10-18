# Release validation · 0.1.0

Validated on Node.js 24 with an isolated local database and synthetic profiles.

- 37 tests passed; zero failed or skipped. Covers engine geometry, arcs, modal
  movement, units/coordinate limits, unsupported expression failures, process
  injection, API CRUD, upload constraints, request-origin/rate controls and mocks.
- Server/script syntax checks and production React build passed.
- Four public example requests generated actual G-code and passed the declared
  static validation subset; matching nominal XY drawings are included.
- Browser checks: generation, parsing, validation, feed injection, preset
  create/load, file save/open, profile creation, circle/linear/ordered generation
  and reference filtering. No browser runtime errors or live AI requests.
- Desktop 1440px and mobile 390px screenshots captured from the running app.
  All six mobile navigation pages checked without horizontal page overflow.
- Dependency installation audit reported zero known vulnerabilities at release.

These checks establish software behavior within the documented subset. They do
not qualify a physical controller, machine, I/O mapping, fixture or process.
