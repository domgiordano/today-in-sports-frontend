# Polish and the social layer

**Created**: 2026-08-27
**Status**: Draft — nothing built
**Repos**: `today-in-sports-frontend`, `today-in-sports-backend`

---

## P0 — the name model is broken, and it leaks an email

Live data, the only account on the system:

```
profile   : {userId: a428…, email: dominickj.giordano@gmail.com}   <- no displayName
play rows : displayName=None | 'Dom' | 'dominickj.giordano'
board shows: 'Anonymous'     | 'Dom' | 'dominickj.giordano'
```

Three identities for one person across eight days, one of which is **the local
part of an email address on a public leaderboard**.

Three separate faults, which is why it feels off rather than simply wrong:

1. **Two independent `displayName` fields.** `plays_dynamo.set_display_name`
   writes to the play row; `users_dynamo.set_display_name` writes to the
   profile. Neither reads the other. A name is per-round, so it drifts between
   rounds and a profile rename changes nothing, anywhere, ever.

2. **Signed-in players are never asked, and nothing fills it in.** The prompt
   renders under `*ngIf="!nameSaved && !signedIn"`, and `play_answer` calls
   `users_dynamo.ensure_user` without copying a name onto the play row. The
   leaderboard reads only the play row and falls back to `'Anonymous'`. So the
   default experience for a signed-in player is to appear as Anonymous.

3. **No canonical name exists to fall back to.** `ensure_user` accepts
   `display_name` but the sign-in path passes only the email, so the profile is
   created without one.

**Fix**: one name, on the profile, seeded at sign-up and editable in settings.
Play rows carry a snapshot for anonymous players only; a signed-in play resolves
its name from the profile at read time so a rename is retroactive. Never derive
a display name from an email.

This is P0 because it is live, visible on a public board, and leaks an address.

---

## P1 — the cheap ones

**Tab order.** Currently `Play · Stats · Groups · Overview · Docs`. The brand
mark already links to `/`, so Overview is a second link to the same place
sitting in the middle of the primary actions. Move it right, next to Docs,
where the secondary destinations live — or drop it, since the logo covers it.

**Admin tabs.** Eleven of them in one row, ordered by the sequence they were
built: `Review Bank Schedule Events Narrative Flagged Rejected Users Analytics
Announcements Errors`. Group them: daily work (Review, Flagged, Schedule),
content (Bank, Events, Narrative, Rejected), people (Users, Announcements),
health (Analytics, Errors).

---

## P2 — the weak surfaces

**Groups** (90 lines of template) does create, join, copy code, regenerate,
leave. There is no member list, no group board on the page itself, no sense of
who is in it or how they are doing. It is a join mechanism with no room.

**Profile** carries email, region, streak. No history, no per-sport accuracy,
no "your best day". Everything needed for that is already in `plays` and
`stats`.

**Analytics** (admin) — worth defining what question it should answer before
adding to it. Right now it reports what is easy to count rather than what would
change a decision.

---

## P3 — the social layer

Notifications, friends, @-mentions, comments on group boards, emoji reactions.

**None of it exists.** No friends table, no notifications, no comments, no
reactions — the grep is clean. This is roughly four DynamoDB tables, a dozen
lambdas, and a comparable amount of frontend. It is not polish; it is the
largest single body of work proposed in this document, larger than everything
above it combined.

It also has an order that cannot be shuffled:

```
friends ──> @-mentions ──┐
                         ├──> notifications
group comments ──────────┘
reactions (independent, cheapest)
```

Reactions are the one piece that stands alone: they attach to a leaderboard row
that already exists, need one table, and give a group something to do.

**The thing worth saying once**: there is one registered user and one player.
A friends graph, an @-mention system and a comment feed are all mechanisms for
turning existing players into returning players. They cannot do that for a
population of one, and building them first means guessing at what a social
layer should look like without a single group to watch.

If the intent is to have it ready *before* inviting anyone, that is a coherent
plan and worth saying out loud. If the intent is to make the app stick, the
order is: name model, then people, then the layer that connects them.

---

## Suggested order

1. **P0 name model** — live bug, leaks an email
2. **P1 tabs** — an afternoon
3. **Reactions** — the one social piece that stands alone and needs no graph
4. **P2 groups and profile** — give a group a room worth being in
5. **Friends, mentions, notifications, comments** — once there are people
