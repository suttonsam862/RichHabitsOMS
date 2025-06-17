
# UI/UX Guidelines for Rich Habits

## Aesthetic: Blackout Glassmorphism, Sharp & Luxurious
- **Backdrop:** Deep opaque black (`rgba(0,0,0,0.85)`) layered behind semi-transparent panels.
- **Glass Panels:** Frosted, near-black glass effect with crisp, straight edges—no curves. Think beveled rectangles and rhombus shapes.
  - CSS: `backdrop-filter: blur(8px) brightness(0.2); border: 1px solid rgba(255,255,255,0.1);`
- **Accents:** Slick white gleam animations that sweep across edges (use CSS gradients + keyframe glints).
  - Example: 
    ```css
    .glint::before {
      content: '';
      position: absolute; top: -50%; left: -50%;
      width: 200%; height: 200%;
      background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%);
      transform: translateX(-100%) rotate(25deg);
      animation: glintMove 2s infinite;
    }
    @keyframes glintMove {
      to { transform: translateX(100%) rotate(25deg); }
    }
    ```
- **Color Palette:**
  - Panels: `rgba(10,10,10,0.6)`
  - Borders & Text: `#ffffff` (off-white)
  - Highlight Glow: subtle neon-blue outer glow (`box-shadow: 0 0 8px rgba(0,209,255,0.6)`).

## Typography & Icons

### Heading Font: Rogbold
- **Usage:** Main headings and key titles.
- **Style:** Tall, narrow letterforms for a commanding presence.
- **Examples:** Page titles, section headers, banner text.

### Subtitle Font: Poppins Semi-Bold
- **Usage:** Subheadings, button labels, highlighted text.
- **Spacing:** Increased letter-spacing (`tracking-[0.1em]` or `letter-spacing: 0.1em;`) for an open, luxurious feel.
- **Case:** UPPERCASE for subtitles to enhance impact.

### Body Font: Inter
- **Usage:** Paragraph text, form labels, general UI copy.
- **Style:** Medium weight, normal letter-spacing for readability.

## Color Palette
- **Primary Background:** `#1a1a1a` (dark grey)
- **Accent:** `#00d1ff` (neon blue), `#00ff9f` (neon green)
- **Text:** `#f5f5f5` (off‑white)

## Typography
- **Font Family:** `Inter, sans-serif`
- **Headings:** Font‑weight 600+, sizes `xl` to `4xl`.
- **Body:** Font‑weight 400, size `base`.

## Layout & Spacing
- **Grid:** Use 8px increment spacing (`p-4`, `m-2`, etc.).
- **Cards:** Rounded corners `2xl`, soft shadows (`shadow-md`).
- **Buttons:** Clear hierarchy:
  - Primary: filled accent, uppercase text
  - Secondary: outline with accent border

## Accessibility
- Ensure 4.5:1 contrast for text.
- All interactive elements must have focus states (e.g., `ring-2 ring-accent`).
