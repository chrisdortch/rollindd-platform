# Central Command Spec

## Launch command

```text
ROLLINDD LAUNCH

Site name: [name]
Suno playlist: [url]
Domain: [domain]
Theme instruction: [description]
Uploaded images: [references]
Artist names: hide
Lyrics search: enabled
Exact match: enabled
Download all MP3s: capability_check
Budget mode: lowest cost
Autonomy: safe_max
```

## Update command

```text
ROLLINDD UPDATE

Site: [slug or domain]
New Suno playlist: [url]
Regenerate theme from lyrics: yes
Preserve domain: yes
Preview before live: yes
```

## Domain command

```text
ROLLINDD DOMAIN

Site: [slug]
Domain: [domain]
Action: assign and verify
```

## Result format

Every command should return:

- Status.
- Completed actions.
- Preview URL if available.
- Domain status.
- Risk notes.
- Exact next user steps.

## Approval gates

Stop before:

- Moving live domains.
- Buying domains.
- Changing DNS/nameservers.
- Enabling downloads.
- Hosting copied MP3/video files.
- Replacing a live theme.
- Deleting existing playlist data.
- Touching non-RollinDD projects.
