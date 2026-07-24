# Table Tennis Drill Image Prompt

Use this template for every Drill image. Keep the composition, palette, visual
language, and avoidance rules unchanged. Replace only the six Drill input
fields.

```text
Use case: scientific-educational

Asset type:
Mobile table-tennis drill diagram for a learning application.

Drill:
Title: "{{DRILL_TITLE}}"
Objective: "{{DRILL_OBJECTIVE}}"
Sequence:
{{NUMBERED_STROKE_SEQUENCE}}
Spin by sequence:
{{SPIN_BY_SEQUENCE}}
Player movement:
{{PLAYER_MOVEMENT}}
Target areas:
{{TARGET_AREAS}}

Primary request:
Create a precise, easy-to-understand top-down instructional diagram for this
table-tennis drill.

Composition:
- Portrait 4:5 canvas.
- One complete table viewed perfectly from directly above.
- Table centered with generous off-white margins.
- Net runs horizontally across the middle.
- Show simplified player-position semicircles outside the relevant baselines.
- Keep all important elements readable at mobile-card size.

Visual language:
- Deep blue table.
- Crisp white table markings.
- Dark charcoal net.
- Bright orange solid arrows for ball movement.
- Teal dashed arrows for player footwork.
- Pale yellow translucent zones for placement targets.
- Orange filled circle for the starting ball.
- Teal player-position markers.
- Large numbered circular markers for sequence order.
- Use consistent line widths, arrowheads, colors, and marker sizes.

Sequence rules:
- Show every stroke using a separate directional arrow.
- Place numbered markers 1, 2, 3, etc. beside the corresponding arrows.
- Use curved paths only when they improve clarity.
- Avoid ambiguous intersections.
- If paths must cross, separate them visually using spacing or distinct curves.
- Show the starting position clearly.
- Show recovery movement where relevant.
- Highlight only the target zones used by this drill.

Text:
- Do not render the drill title.
- Do not use words, abbreviations, stroke names, or explanatory prose.
- Numerals are allowed only for sequence markers.
- Leave clear space beside each numbered marker for a code-rendered spin badge.
- Do not invent or visually imply spin that differs from `SPIN_BY_SEQUENCE`.
- The application will display all descriptive text outside the image.

Accuracy:
- Preserve realistic table-tennis geometry.
- Ball paths must cross the net.
- Player markers must remain outside the table.
- Target zones must be on valid table areas.
- Footwork arrows must not look like ball trajectories.
- The diagram must agree exactly with the supplied drill sequence.

Style:
Clean modern sports-coaching infographic, flat vector-like raster, precise,
accessible, high contrast, polished, and consistent with a professional
training manual.

Avoid:
- perspective or isometric views;
- photorealism;
- 3D effects;
- decorative clutter;
- paddles, hands, crowds, or venue backgrounds;
- logos or watermarks;
- gradients that reduce readability;
- tiny labels;
- invented movements or additional strokes;
- more balls, arrows, or target zones than the drill requires.
```

## Example Input

```text
Title: "Serve and Third-Ball Attack"

Objective:
Practice serving short, anticipating the receiver's push, and attacking the
third ball into the open corner.

Sequence:
1. Bottom player serves short to the top player's backhand half.
2. Top player pushes long toward the bottom player's backhand side.
3. Bottom player moves around the backhand corner and attacks crosscourt into
   the top player's forehand corner.

Player movement:
After the serve, the bottom player pivots around the backhand corner and
recovers toward the middle.

Target areas:
- Short service target on the top backhand half.
- Long push landing zone on the bottom backhand side.
- Third-ball attack target in the top forehand corner.
```

## Consistency Rule

Reuse the exact template, palette, canvas ratio, and visual-language section for
every Drill. Change only:

1. Drill title.
2. Objective.
3. Numbered stroke sequence.
4. Spin by sequence.
5. Player movement.
6. Target areas.
