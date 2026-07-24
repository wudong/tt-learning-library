# Lightweight Knowledge Graph Explorer

> Product experiment: `knowledge-graph-explorer-v1`  
> Related issue: [#6](https://github.com/wudong/tt-learning-library/issues/6)  
> Status: first implementation slice

## Purpose

The graph is already the persistence and relationship backbone of TT Learn. This feature makes that structure visible without turning the application into a generic graph editor.

The first experiment helps a player answer questions such as:

- Which videos explain this Skill?
- Which Drills practise it?
- Which Topic contains it?
- Which Notes and Pictures support it?
- What else is directly connected to this Video or Drill?

The experiment measures whether a simple one-hop view improves discovery before the product invests in automatic graph layout, pan, zoom, or multi-hop traversal.

## Supported entry points

The explorer starts from one private, owner-scoped graph node of type:

- Topic;
- Skill;
- Video;
- Drill.

The route is:

```text
/library/connections/:nodeId
```

Each supported detail page exposes an **Explore connections** action.

## API contract addendum

### GET `/api/library/nodes/:nodeId/connections`

Returns a read-only, owner-scoped, one-hop projection. This endpoint is private and authenticated. It is not exposed through public share projections.

Example response:

```json
{
  "data": {
    "center": {
      "id": "node_skill",
      "nodeType": "skill",
      "title": "Backspin Serve",
      "summary": null,
      "visibility": "private",
      "createdAt": "2026-07-24T00:00:00.000Z",
      "updatedAt": "2026-07-24T00:00:00.000Z"
    },
    "centerHref": "/library/skills/node_skill",
    "groups": [
      {
        "key": "explains:incoming",
        "edgeType": "explains",
        "direction": "incoming",
        "label": "Explained by",
        "total": 2,
        "items": [
          {
            "node": {},
            "edge": {},
            "href": "/videos/video_123"
          }
        ]
      }
    ],
    "maxNodes": 24,
    "totalConnections": 2,
    "shownConnections": 2,
    "truncated": false
  }
}
```

Rules:

- traversal depth is exactly one edge;
- all nodes and edges are scoped to the authenticated owner;
- deleted nodes and edges are excluded by the graph repository;
- the response is capped at 24 adjacent nodes;
- ordering is deterministic by relationship priority, direction, node type, title, and edge ID;
- groups preserve the canonical edge type and direction while adding a product-language label;
- Topic, Skill, Drill, Video, and Practice Session items receive normal detail-page links when a domain row exists;
- supporting objects without a detail route, including Notes and Pictures in this version, return `href: null`;
- unsupported or cross-owner center IDs return `404` through the canonical error middleware.

## Relationship language

The explorer does not display raw edge identifiers as its main copy. It translates direction-aware relationships into player-friendly labels while preserving `edgeType` in the API response.

Examples:

| Edge and direction | Display label |
| --- | --- |
| `belongs_to`, outgoing | Part of |
| `belongs_to`, incoming | Contains |
| `explains`, incoming | Explained by |
| `demonstrates`, incoming | Demonstrated by |
| `practices`, incoming | Practised by |
| `mentions`, incoming | Notes and mentions |
| `requires`, outgoing | Requires |
| `prerequisite_of`, incoming | Prerequisites |

The allowlisted ontology remains authoritative. The explorer never creates or changes relationships.

## User experience

### Map view

The default view uses a deterministic hub-and-lanes layout:

- the selected item appears as the center card;
- related items are grouped by relationship meaning;
- lightweight connector lines communicate graph structure;
- item positions do not move between renders;
- no dragging, force simulation, zooming, or canvas interaction is required.

### List view

The same data is available as a semantic grouped list:

- headings identify each relationship group;
- counts are written in text;
- each navigable item is a standard button;
- supporting objects remain readable without pretending to have a detail page;
- the view works with keyboard navigation and screen readers.

Both views expose the same connections. The list is not a reduced fallback with missing information.

## Mobile and accessibility constraints

- mobile-first stacked layout;
- minimum touch-friendly controls;
- no meaning conveyed only by line position or colour;
- visible type labels and icons;
- map/list toggle uses `aria-pressed`;
- relationship groups use headings and lists;
- truncation is announced in text;
- reduced-motion preferences are respected;
- the feature remains usable without SVG or canvas interaction.

## Privacy and public sharing

This explorer is private-only:

- the API is behind the authenticated `/api/*` boundary;
- the current principal supplies the owner ID;
- clients cannot request another owner;
- public share endpoints do not call this projection;
- arbitrary private graph traversal is never included in a public share response;
- feedback contains experiment metadata and aggregate connection counts, not graph contents.

## Measurement

The page asks:

> Did this reveal something useful?

Responses are submitted through the existing feedback service with:

```json
{
  "experiment": "knowledge-graph-explorer-v1",
  "response": "useful | not_yet",
  "centerNodeType": "skill",
  "totalConnections": 12,
  "shownConnections": 12
}
```

This signal is intended to guide whether the next investment should be improved relationship copy, richer node previews, a second-hop action, or a more visual layout.

## Explicit non-goals for this slice

- whole-library rendering;
- traversal beyond one hop;
- relationship editing;
- arbitrary edge creation;
- force-directed layout;
- node dragging;
- pan and zoom;
- public graph exploration;
- graph database adoption;
- a new graph visualisation dependency.

## Candidate follow-ups

Only pursue these after reviewing usage and feedback:

1. improve group ordering and labels based on real libraries;
2. add detail pages for Notes and Pictures where useful;
3. allow an explicit **Explore from here** action without increasing the response depth;
4. test an optional second-hop preview with a stricter cap;
5. evaluate a richer desktop layout while retaining the semantic list as the source-equivalent view.
