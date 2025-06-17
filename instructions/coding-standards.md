
# Coding Standards

## JavaScript/TypeScript
- **ESLint & Prettier:** All files must pass lint & format on save (`npm run lint && npm run format`).
- **Naming:** Use `camelCase` for variables/functions, `PascalCase` for components & classes.
- **Imports:** Alphabetical order, grouped by external, internal, styles:
  ```js
  import React from 'react';
  import _ from 'lodash';

  import { Card } from '@/components/ui';
  import { formatDate } from '@/utils/date';

  import './MyComponent.css';
  ```

## CSS / Tailwind
- **Utility‑First:** Favor Tailwind classes; only add custom CSS for complex selectors.
- **Naming:** BEM style when writing custom CSS: `.btn--primary`, `.card__header`.

## Comments & Documentation
- **JSDoc:** Exported functions/components should have a one‑sentence JSDoc comment.
- **TODOs:** Prefix with `// TODO(RH): <your note>`.
