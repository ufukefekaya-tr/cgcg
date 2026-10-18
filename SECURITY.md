# Security

Default access is local loopback. Keep it local, or place it behind explicit
authentication/TLS and reviewed access controls before exposing it to a network.
Profiles, presets and G-code may contain sensitive machine/job information.
Do not commit runtime data, uploads, local .env files or actual machine presets.

AI integration is opt-in and may incur provider charges. Generated or assisted
content requires operator review. This app has no hardware-control connector;
its validation does not establish physical machine safety.

Report vulnerabilities privately through the GitHub repository security reporting
facility when enabled. Do not attach credentials or customer programs to issues.
