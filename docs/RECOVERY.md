# Source recovery and public reconstruction

Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.

This release recovers the original readable JavaScript dispensing engine and
reconstructs its local API and React workbench. The available deployment had no
TypeScript/TSX source checkout, Git metadata, original repository reference or
source maps. Generated JavaScript preserves the engine's original business logic
and comments, but cannot recover erased TypeScript interfaces or the original
React component source. The public frontend is new source, not deminified source.

## Source selection

The reviewed deployment contained an older 56-module server tree, a newer
24-module API tree, and 14 historical minified frontend bundles. Seventeen common
API modules were identical; five common modules differed. The newer tree adds
the vision controller and route, loads environment configuration, and raises its
JSON-body limit from 1 MB to 20 MB. Its service imports the shared engine outside
the newer API subtree, so copying only that subtree would omit the engine.

The public engine comes from the shared engine modules. The API follows the
newer route capabilities, with new validation, persistence, configuration and
resource controls. The previous generated frontend bundles are excluded. The
fingerprints below identify reviewed source without publishing private server
paths or original data.

## Changes from the reviewed deployment

- Machine profiles are explicit, validated objects. The only seeded profile and
  example layout are synthetic. An unknown controller is rejected rather than
  falling back to Falcon. Falcon, Fanuc and Siemens labels describe implemented
  dialect adapters, not manufacturer approval.
- Two-axis generation emits no Z word. A request must explicitly enable a
  third axis before vertical moves or safe-Z injection are allowed.
- No machine-coordinate move is assumed. A machine-zero command is omitted
  unless the profile has an explicit single-line command under
  `operatorVerifiedMachineZero: { "verified": true, "command": "..." }`.
  A vertical command conflicts with two-axis mode. Priming requires a declared
  operator-verified position; washing/blowing does not infer a travel route.
- Grids use rows on X and columns on Y consistently. Work-coordinate geometry
  does not add the work offset a second time. XY arcs use I/J centers.
- Validation tracks supported modal coordinate behavior and supported XY arc
  extents. Unsupported frames, expressions or motion representations produce
  explicit issues instead of silently being accepted as ordinary work moves.
  This is a bounded code-analysis subset, not a CNC interpreter or certification.
- Geometry, process values, machine-code words and injection rules are validated
  deeply, with finite numeric ranges, expansion bounds and no embedded command
  newlines. Presets and machine records use the same validation.
- Persistence uses a new Node 24 `node:sqlite` schema. Uploaded UTF-8 G-code is
  stored as bounded text in that database, never at a caller-supplied disk path.
  No original SQLite database, jobs, upload directory or environment file is read
  or migrated by this release.
- The default listener is `127.0.0.1:4310`. Explicit Origin checks reject cross-site
  browser mutations before JSON or multipart parsing. The backend also limits
  request sizes/rates, files and stored record counts. The production SPA fallback
  does not absorb API routes or expose arbitrary filesystem directories.
- AI is off by default. Optional Gemini access requires explicit opt-in, a fresh
  caller-supplied key and an explicit model identifier. The SDK is loaded only
  for an enabled provider call. Error responses never expose provider credentials
  or raw provider diagnostics. Tests use an injected mock, without live calls.

Local engine/API use needs no AI account or provider key. Generated G-code remains
an editable draft requiring machine-specific operator review; the application
does not connect to hardware or certify physical CNC safety.

## Local API contract

JSON success responses use `{ "success": true, "data": ... }`. Errors use
`{ "success": false, "error": { "code": "...", "message": "..." } }`.

| Endpoint | Input or result |
| --- | --- |
| `GET /api/health` | Local status, AI opt-in state and resource limits; no secrets. |
| `GET /api/examples` | `{ machineProfile, request }`, containing the complete synthetic generation example. |
| `POST /api/gcode/generate` | A request with an explicit `machineProfile`, `geometry`/`process`, or ordered `geometries: [{ geometry, process, sequence }]`; returns `gcode`, `ast`, `metadata`. |
| `POST /api/gcode/parse` | `{ gcode }`; returns the AST and line/motion/rapid/dwell statistics. |
| `POST /api/gcode/validate` | `{ gcode, machineProfile }`; returns `valid` and structured `issues`. |
| `POST /api/gcode/inject` | `{ gcode, machineProfile, injection: { type, params }, use2AxisOnly? }`; returns edited code, AST and change count. |
| `GET/POST /api/machines` | List/create canonical camelCase profiles with server-assigned IDs. |
| `GET/PUT/DELETE /api/machines/:id` | Read/replace/delete an explicit profile. |
| `GET/POST /api/presets` | List/create `{ name, config }` records. `config` is a generation configuration; geometry-only presets may omit a profile until one is selected. |
| `GET/PUT/DELETE /api/presets/:id` | Read/replace/delete a preset. |
| `GET/POST /api/files` | List files or create UTF-8 text using `{ name, content }`; aliases `{ filename, gcode }` are also accepted. |
| `POST /api/files/upload` | The same text input or a single multipart `file` field. |
| `GET /api/files/:id` | A file record with text under `content` and the compatibility alias `gcode`. |
| `GET /api/files/download/:id` | A plain-text attachment, with `nosniff`; no filesystem paths are exposed. |
| `DELETE /api/files/:id` | Delete the stored text record. |
| `POST /api/vision/chat` | Opt-in provider endpoint, otherwise `503 AI_DISABLED`; messages contain `user`/`assistant` roles and text, with an optional bounded base64 image. |

The supported injection types are `changeFeedrate` (`feedRate`), `addPreDwell`,
`addPostDwell`, `addWashBlock`, `addPrimingBlock` (`durationMs`), `changeMCode`
(`oldMCode`, `newMCode`), `addEarlyClose` (`distanceMm`) and `insertSafeZ`.
`insertSafeZ` requires an explicit `use2AxisOnly: false` request.

The server factory is `createApp(options)` from `server/app.js`; importing it does
not start a listener or contact a provider. Tests pass `dbPath: ':memory:'` and
close `app.locals.close()`. `startServer(options)` in `server/index.js` starts the
configured listener separately.

## Evidence and exclusions

Synthetic tests cover generation/parsing/editing, two-axis output, explicit
controller/position behavior, supported modal and arc validation, canonical CRUD,
SQLite restart persistence, bounded UTF-8 file handling, browser Origin checks,
quota/rate/body errors and disabled/mock-enabled AI behavior. No hardware or live
AI request is part of the test suite.

Original databases, customer presets, jobs, uploads, credentials, environment
files, logs, PM2 state and historical minified frontend bundles are excluded.
Third-party dependencies retain their own license terms; the original-code dual
license does not replace those terms.

## Reviewed source fingerprints

The generated-source labels identify the older shared engine and newer API
revision. SHA-256 values refer to the original reviewed files before public fixes.

| Reviewed revision | Source reference | SHA-256 |
| --- | --- | --- |
| Shared engine / deployment revision | `engine/adapters/ControllerAdapter.js` | `630709cd392787b484e8970e5814ab0c0ce52573c090ab04425dbae163f24b18` |
| Shared engine / deployment revision | `engine/defaults.js` | `b07d09c337c52cdb8ed9d11e7cb253d7d9bbb147d99c36286f79fa00335f7aad` |
| Shared engine / deployment revision | `engine/generator/ParametricGenerator.js` | `1302ff701ed89072be98bfb83d13ac4ed65f1ee0a9f71530fdddcef070244b8c` |
| Shared engine / deployment revision | `engine/generator/patterns/CirclePattern.js` | `ff4058404531f7ce9bf0c6ce6b88a141863252a5491a852fd37176825efdbc14` |
| Shared engine / deployment revision | `engine/generator/patterns/LinearPath.js` | `6e4223421119e83f47c71b2da4ef2e1946ffd07e5b9933086b74fcea5f94692e` |
| Shared engine / deployment revision | `engine/generator/patterns/RectangleGrid.js` | `c2ad52d1446169a55e9406159a2e322d7dc68c362fd8820f4d55ae57cccdd4e7` |
| Shared engine / deployment revision | `engine/generator/routines/AntiDripRoutine.js` | `00f469af574e687728740921ea7b2685e4bfb542574f19b8bf6d8d5cd33152ef` |
| Shared engine / deployment revision | `engine/generator/routines/DwellRoutine.js` | `0f62ed823413ca5dff95ff4a06b6c5b491c34c6c560f9308c5407bb59a2ff1f3` |
| Shared engine / deployment revision | `engine/generator/routines/SafetyRoutines.js` | `a64d23d124474feea132add45d36f824fe866d4ddafb0e4d4920bcaf11db5a9c` |
| Shared engine / deployment revision | `engine/generator/routines/WashRoutine.js` | `c00014aa0186780377aa6efc9b53b8eb5435803ddf2f4a4fbd322db8dcd8e313` |
| Shared engine / deployment revision | `engine/generator/templates/footer.js` | `a2070a58417ed3b28cd6de24b610a71db59601c638c99a71abbd93c6e0334b89` |
| Shared engine / deployment revision | `engine/generator/templates/header.js` | `6ecef7c9f2be5ce4ccf54cae763519f74ac72c9fec82213fd0e542b45ec554d1` |
| Shared engine / deployment revision | `engine/index.js` | `f0cd55b99ab6d4605a6bcc354502f070847172fef2fb7f282a0d9fa551c2cd29` |
| Shared engine / deployment revision | `engine/injector/Injector.js` | `f975373a8ead62d149dc4293706f2883f914c8af2d51c89d194dcb6c5d911930` |
| Shared engine / deployment revision | `engine/injector/rules/AddEarlyClose.js` | `ef12a0c613cdefbe08436f9318db1f8ce2cb1e9e1c7b3f9db07b0f848bdb3a4e` |
| Shared engine / deployment revision | `engine/injector/rules/AddPostDwell.js` | `8f415508a4e58e27a7dc79888c6c008adec8fbbc5a8f05b83736596ef71a29f4` |
| Shared engine / deployment revision | `engine/injector/rules/AddPreDwell.js` | `945ae628169caf8b0189eda08b137e23e2a44aca27915c232f5b0c98a614ff53` |
| Shared engine / deployment revision | `engine/injector/rules/AddPrimingBlock.js` | `20fb4977ba9aa1ca40716d79b1a14d47c854a974e57703d6d534877628a57c9c` |
| Shared engine / deployment revision | `engine/injector/rules/AddWashBlock.js` | `bad8ce6bbf21b4effcf665184736f39b30ed9fb42cac814f3bef9784f3244067` |
| Shared engine / deployment revision | `engine/injector/rules/ChangeFeedrate.js` | `9d90a56a34949857fa77644863fc11fd11c4e83309008b40f277a1e1b469e19d` |
| Shared engine / deployment revision | `engine/injector/rules/ChangeMCode.js` | `dc56d1ace45cb817af744ecdb575f3b66302d95e901553e58d96e85b245551ac` |
| Shared engine / deployment revision | `engine/injector/rules/InsertSafeZ.js` | `a659cdf45895d22a4bb7d75bc9f301ee440f08960eb3908b1dd57365dcaf2864` |
| Shared engine / deployment revision | `engine/parser/GCodeLexer.js` | `df53cc443c7043a348edfd1fd07bc0ecd307efd3238349323118920a9b041c84` |
| Shared engine / deployment revision | `engine/parser/GCodeParser.js` | `2ffe00effdf1d5e8fedf6e1015965398fc2e6c51b62c49155a698f2f0362e66a` |
| Shared engine / deployment revision | `engine/parser/GCodeSerializer.js` | `313565b0ca11a943d03696c39148947e018da6d697899a7c340ba5624a9a572c` |
| Shared engine / deployment revision | `engine/validators/SafetyValidator.js` | `5128b6ef143ef32f07c67e6ffef226bba58c8d2a310145e76e2db72763de54d5` |
| Shared engine / deployment revision | `engine/validators/SoftLimitValidator.js` | `41e80fa2e339ae2b83f80dcc99324e7c145305140c91ee5be8da2f91761d9a4e` |
| Shared engine / deployment revision | `engine/validators/SyntaxValidator.js` | `4649a22f9958dedeab749e4fd0ffe5874550246128b6e74854716de01078d0bb` |
| Newer API / deployment revision | `api/config.js` | `53a9862a8e9f54353a2004af6a1f6e61bfee9acc371a0c526305ba807a59c994` |
| Newer API / deployment revision | `api/controllers/file.controller.js` | `eb53e25704aef8cba0f70d173ab8a3f4ea06daef7124982654952cb6c766c8d8` |
| Newer API / deployment revision | `api/controllers/gcode.controller.js` | `f7b147df1f4b721547879a33c3b058e684034a06b2fe735ad5d988b391ec7347` |
| Newer API / deployment revision | `api/controllers/machine.controller.js` | `012edf2446d9c978632ba454697ac4617567eb8c6fd044cb39b395f77a51fb0f` |
| Newer API / deployment revision | `api/controllers/preset.controller.js` | `6b4d732d4bd648e6cb3ad2a9b9606d1db197007bbd019cc4dad2b74c46af2d70` |
| Newer API / deployment revision | `api/controllers/vision.controller.js` | `a8f19ca8b7e94c9a4b6683d7a3ca08abb3f51611263d65343b765222be55dc87` |
| Newer API / deployment revision | `api/index.js` | `93be50d4693df5a5114c902d355af604d3c21ebd67b09c4245bbb91ace05893e` |
| Newer API / deployment revision | `api/middleware/errorHandler.js` | `e50366fa779bb819ee5bd79b4dc78f6d6eb693ac50d46d55d0b68ccc69856b7c` |
| Newer API / deployment revision | `api/middleware/rateLimiter.js` | `66cc028e8779afb61a50536c149fd7cedf1bf0474881d2b36d8c8fabae7b28ca` |
| Newer API / deployment revision | `api/middleware/requestLogger.js` | `f01ba740edb8208bf16fe5fa71a02a7d7d398e13542445d1489514ee62bf300e` |
| Newer API / deployment revision | `api/models/db.js` | `eb6552cff23d615c5fde4b13e4374472aaa9bd810fa18f1549feb405183aa478` |
| Newer API / deployment revision | `api/models/file.model.js` | `af3f2dd4b26b80ad1fd0f397de2c20e7e5b32001e1a97659855e90c7188570b2` |
| Newer API / deployment revision | `api/models/machine.model.js` | `92506df4abe48199657a3b84c94939a48317419d9210f28f643e9e81ee262542` |
| Newer API / deployment revision | `api/models/preset.model.js` | `284a27e69b860b8f8b6bd039f0f1ba71a36ceebbe409cf3bed95ff6801d325bc` |
| Newer API / deployment revision | `api/models/project.model.js` | `2b38ab13846d1d994876d4cadee0da06820a590802916b4555cd7a7c49583706` |
| Newer API / deployment revision | `api/routes/file.routes.js` | `047f679fff363a3e6ffbc18d86e9098d8bed595c0fd0c99c3b956ae69365f2fc` |
| Newer API / deployment revision | `api/routes/gcode.routes.js` | `fb15bd72674c80ca8461a67f72bde1cd264b299d37e34005f01da0b8f3f2ff1b` |
| Newer API / deployment revision | `api/routes/machine.routes.js` | `aee9f577b8b486058016c9dec1c10ba50db32a4d1d017296e376785ba8c09b18` |
| Newer API / deployment revision | `api/routes/preset.routes.js` | `3794cc0eacff0832db612f92b3c89252e7d028129895a68ee08f2ec199aaa9db` |
| Newer API / deployment revision | `api/routes/vision.routes.js` | `788e75b4d146a3f463470228757818e90e3eaa2863ab62b1ba489d8aca3e4286` |
| Newer API / deployment revision | `api/services/engine.service.js` | `2e2ccb54c543c68c8234843094c5784ff4c84de05ddd03214b8c4b77952f7786` |
| Newer API / deployment revision | `api/services/file.service.js` | `cb3aee7bd65dc0ebe62ee5275cf00b72a4cc7da4f4f95ce8baae166f44fde11d` |
| Newer API / deployment revision | `api/utils/apiResponse.js` | `c859a1c091d0008211fa527b16f71a7093bae4f3b64ad4240793f4a1591838d7` |
| Newer API / deployment revision | `api/utils/fileHelpers.js` | `68ad4a6c628cbf151ffc703dc1876d31a9003e3ec086ecb8260d11f8765b662f` |
