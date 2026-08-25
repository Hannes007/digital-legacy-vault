# @dlv/ui

Digital Legacy Vault's React component library — the "design-system foundations"
(tokens, buttons, inputs, shell) from the Phase 2 roadmap.

## Components
- **Primitives:** `Button`, `Input`, `Badge`, `Spinner`, `Card` (+ `CardHeader`/
  `CardBody`/`CardFooter`), `Alert`, `EmptyState`, `Modal`.
- **Shell:** `AppShell` — the authenticated sidebar + topbar + content layout.

## Styling
Components are styled with Tailwind classes bound to the **semantic** layer from
`@dlv/design-tokens`. Import the theme once, globally:

```css
@import "@dlv/design-tokens/theme.css";
```

Dark mode flips by toggling `.dark` on `<html>`.

## Usage
```tsx
import { Button, Card, CardBody } from "@dlv/ui";

<Card>
  <CardBody>
    <Button variant="primary" loading>Save</Button>
  </CardBody>
</Card>
```

React 19 is a peer dependency. `"use client"` is preserved in the build for
Next.js App Router consumers.
