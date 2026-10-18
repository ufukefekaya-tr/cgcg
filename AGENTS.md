# Working on CGCG

Use Node.js 24 or newer. Run `npm ci`, `npm run check`, `npm test` and
`npm run build`. Keep synthetic examples reproducible with
`node scripts/generate-examples.js`. All geometry is a nominal draft and
requires controller-specific review. Never silently select a machine dialect,
homing command or process output. Two-axis mode must never emit Z moves.
Do not commit runtime databases, uploaded jobs, real machine profiles,
credentials or local `.env` files. Preserve third-party notices.
Original contributions use MIT OR Apache-2.0.
