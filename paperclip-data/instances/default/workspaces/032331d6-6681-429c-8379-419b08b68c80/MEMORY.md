# Tacit Knowledge — Frontend Engineer

## Deployment Patterns

- **RetailerOS**: Always SSH to `root@khosha.tech`. Source is `/var/www/retaileros/production/`. Build with `npm run build`. Never touch local files or Netlify.
- **Gitea** (`git.khosha.tech/khosha-bot/RetailerOS`) only has a README — not the canonical source.

## Design Constraints (don't break these)

- RetailerOS desktop center column shows decorative dark "OS"/"RETAILER" text when not logged in. This is intentional. Do not put the login form there.
- Landing page at `retaileros.in/` is separate from the app at `retaileros.in/app/`. Do not break the landing page.

## Operating Lessons

- Before editing any file, confirm which server actually serves the live URL (`dig +short <domain>`).
- Test the API directly (`curl -X POST ...`) before assuming code changes are the fix.
- When login says "Invalid store code", check if the demo retailer is seeded in the DB.
- `^~` in nginx location blocks prevents regex locations from taking priority.
- Always read Paperclip issue comments fully before making changes — the board often has specific instructions buried in comments (e.g. KHO-109 for deployment method).
