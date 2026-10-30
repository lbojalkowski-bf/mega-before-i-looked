---
name: publish-preview
description: Save a rig page as one HTML file and put it on this lane's public preview host (GitHub Pages), check the link from outside, and later upload it again without the lane marker. Use for a plan's "Preview for review" and "Clean up" steps (ADR 0003).
---

# publish-preview

The host is a separate public repo with GitHub Pages, never this repo (ADR 0003: no previews in
the repo, issues or chat). For lane-07 that is `lbojalkowski-bf/rig-preview`, served at
`https://lbojalkowski-bf.github.io/rig-preview/`. Needs `gh`, signed in to the owner's account.

Ask the human before each upload: what goes up, where, who can see it, how to undo it.

## Publish (with marker)

1. Save the page with a command, banner included (the page is self-contained, ADR 0001):

   ```sh
   PORT=8793 npx tsx --env-file=.env src/server.ts &   # LANE_MARKER set in .env
   curl -sf localhost:8793/digest/<night> -o <preview-dir>/index.html
   kill %1
   ```

   `<preview-dir>` is outside this repo. Check it has no `<script>` and no external URLs.
2. First time only: `git init -b main` in `<preview-dir>`, set a repo-local `user.email` (the
   GitHub noreply address, not a work address), commit, then

   ```sh
   gh repo create <owner>/rig-preview --public --source <preview-dir> --push
   gh api -X POST repos/<owner>/rig-preview/pages -f 'source[branch]=main' -f 'source[path]=/'
   ```

   Later uploads: commit and `git push`.
3. Check the link the way the reviewer opens it, before you send it: poll the public URL until
   it answers 200 (first build ~1 min), then compare it with the local file (`cmp`).
4. Send the link. The preview issue stays open until the reviewer has looked (AGENTS.md rule 5).

## Clean up (marker off)

Only after the review is in.

1. Save the page again with the marker unset, without `.env`:
   `LANE_MARKER= npx tsx src/server.ts`, then the same `curl`. The banner reads "no marker set".
2. Upload over the same link as one orphan commit, so the marker leaves the git history too:

   ```sh
   git checkout --orphan clean && git add index.html && git commit -m "preview (no lane marker)"
   git branch -D main && git branch -m main && git push --force origin main
   ```

3. Pages caches up to ~10 min. Poll the plain URL until the marker is gone and the banner reads
   "no marker set"; only then close the clean-up issue.
