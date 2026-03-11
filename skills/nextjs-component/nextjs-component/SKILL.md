---
name: nextjs-component
description: Scaffolds a new Next.js React component. Use when Gemini CLI needs to create a new UI component for the frontend.
---

# Next.js Component Skill

This skill guides the creation of a new UI component in the Next.js `frontend/` directory.

## Workflow

1.  **Component Location**: Determine if the component is generic (goes in `frontend/src/components/`) or page-specific (goes in `frontend/src/app/(routes)/[page]/components/`).
2.  **File Structure**: Create the `.tsx` file using standard React Component structure (functional components with `React.FC` or just standard function declarations).
3.  **Styling**: Use Tailwind CSS for styling. Do not use external CSS files unless strictly necessary.
4.  **Client vs Server Components**:
    -   Default to Server Components (RSC) for performance.
    -   If the component needs interactivity (state, hooks like `useState`, event listeners like `onClick`), add `"use client";` at the very top of the file.
5.  **Typing**: Export a TypeScript interface for the component's props named `[ComponentName]Props`.

## Component Template

```tsx
// Example of a Client Component
"use client";

import React, { useState } from 'react';

export interface MyComponentProps {
  title: string;
  description?: string;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, description }) => {
  const [isActive, setIsActive] = useState(false);

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      {description && <p className="text-gray-600 mt-2">{description}</p>}
      <button 
        onClick={() => setIsActive(!isActive)}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {isActive ? 'Active' : 'Inactive'}
      </button>
    </div>
  );
};
```

## Reference

-   Project uses React 18/19 and Next.js 14+ (App Router).
-   TypeScript is mandatory.
