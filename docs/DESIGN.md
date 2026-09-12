# 身体手记 · design direction

Audience: adults exploring body measurements, everyday activity and nutrition estimates.
Tasks: finish four short steps, resume saved progress, understand estimates, inspect the simulated subscription.
Content: selectable answers, numeric measurements, calculated values and a dated weight projection.

Two layout studies:

```
A — chosen: editorial spread
brand                                      language / tools
step / title / explanation   |   focused question + controls
curved progress ruler       |   back / continue

B — compact worksheet
brand / progress
centered question
controls
```

A gives the explanation a stable place without crowding inputs. On mobile it folds into B.

Tokens: mist #F3F1F8, plum #342646, violet #6750A4, sage #D6E6DA, coral #E6B7AD, white #FFFFFF.
Type: Outfit for Latin and numerical values, Noto Sans SC for Chinese. Display 48–64px desktop / 32–40px mobile; body 15–17px. Tabular numerals for metrics.
Layout: 1120px maximum width, 48px desktop gap, 24px mobile gutter. Rounded answer controls with thin ruled separators; no uniform dashboard card grid.
Motion: brief entry and selected-state feedback, reduced-motion support. Progress ruler represents answered steps; no artificial countdown or medical scanner.

Pre-implementation critique: a purple palette alone is insufficient identity. The recurring curved measurement ruler connects the visual language to body measurement and progress. Remove unsupported clinical approval, guaranteed outcomes, urgency, discounts and features. Result visualizations must use returned data; free results must never show fabricated personalized curves. Keep bilingual text, unit controls, persistence, errors, routes and reviewer actions.
