# T056 — Lightweight Knowledge Graph Explorer

> Status: Done  
> Roadmap: Post-MVP product experiment  
> GitHub issue: [#6](https://github.com/wudong/tt-learning-library/issues/6)  
> Pull request: [#20](https://github.com/wudong/tt-learning-library/pull/20)

## Goal

Expose the existing table-tennis knowledge graph through a small, useful, read-only exploration experience without introducing a generic graph editor or a complex visualisation dependency.

## Agreed first slice

- [x] Start from a selected Topic, Skill, Video, or Drill.
- [x] Traverse exactly one hop through the existing allowlisted graph relationships.
- [x] Return a stable owner-scoped connection DTO with edge type and direction.
- [x] Cap the response at 24 adjacent nodes.
- [x] Group connections using player-friendly relationship labels.
- [x] Resolve normal detail-page links for supported domain objects.
- [x] Show Notes and Pictures as supporting items when no detail route exists.
- [x] Build a deterministic mobile-first hub-and-lanes map.
- [x] Provide a source-equivalent semantic grouped-list view.
- [x] Add **Explore connections** entry points to Topic, Skill, Video, and Drill details.
- [x] Keep the feature private and absent from public share projections.
- [x] Add a lightweight usefulness question using the existing feedback service.
- [x] Document the API, UX, accessibility, privacy, measurement, and non-goals.
- [x] Add integration coverage for grouping, direction, navigation, ownership, capping, and unsupported centers.
- [x] Pass the repository Quality workflow.
- [ ] Review the experiment in production and decide whether another graph interaction is justified.

## Acceptance criteria

### API and data

- `GET /api/library/nodes/:nodeId/connections` is authenticated and owner-scoped.
- Only Topic, Skill, Video, and Drill may be center nodes.
- The endpoint performs one-hop traversal only.
- Deleted nodes and relationships are excluded.
- Results are deterministic and capped at 24 adjacent nodes.
- The response reports total, shown, cap, and truncation values.
- Each group exposes canonical edge type, direction, friendly label, total count, and items.
- Navigable items point to their normal domain detail route.
- No schema migration is introduced.

### User experience

- The default map remains useful on a phone without drag, pan, or zoom.
- The list view contains the same information as the map.
- The selected center and each relationship group are clearly labelled.
- Empty and truncated states are understandable.
- Navigable objects open their normal detail page.
- Supporting objects without detail pages are visibly non-interactive.
- Keyboard and screen-reader users can traverse headings, lists, toggles, and links.

### Security and privacy

- Cross-owner center IDs return not found.
- The browser never supplies an owner ID.
- Public share projections remain unchanged.
- The endpoint does not expose arbitrary graph editing.
- Experiment feedback sends only the center type and aggregate counts, not node titles or relationship contents.

## Validation

GitHub Actions Quality run #17 passed on the pull-request head:

```text
typecheck
lint
public-sharing regression tests
concurrent-migration regression tests
full Bun test suite
migration
production build
PWA verification
```

Focused integration tests cover:

- incoming and outgoing relationship labels;
- Topic, Skill, Drill, and Video detail links;
- non-navigable Note support items;
- owner isolation;
- 24-node truncation;
- rejection of unsupported center types.

## Deferred work

- whole-library graph;
- second-hop traversal;
- force-directed layout;
- node dragging;
- pan and zoom;
- relationship editing;
- public graph views;
- standalone Note/Picture detail pages;
- graph visualisation libraries.

## Related documentation

- [`docs/KNOWLEDGE_GRAPH_EXPLORER.md`](../KNOWLEDGE_GRAPH_EXPLORER.md)
- [`docs/API_CONTRACT.md`](../API_CONTRACT.md)
- [`docs/PRODUCT_DESIGN.md`](../PRODUCT_DESIGN.md)
- [`docs/UX_FLOWS.md`](../UX_FLOWS.md)
- [`docs/TASKS.md`](../TASKS.md)
