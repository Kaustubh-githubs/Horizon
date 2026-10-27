# 0011. Frontend stack

Status: Accepted · 2026-10-28

## Context
The UI is a data-heavy internal tool: a large table, forms and a dashboard. It should be quick to build, consistent and accessible, and the code should be easy to follow.

## Decision
- **React + TypeScript, built with Vite.** A fast dev server and simple build, with types shared across components and API calls.
- **shadcn/ui + Tailwind** for components. The component code is copied into the repo and built on Radix, which handles keyboard and screen-reader support.
- **TanStack Table** for the directory, with paging, sorting and filtering done on the server.
- **TanStack Query** for fetching data: caching, loading and error states, and refreshing after a change.
- **React Router**, with directory filters kept in the URL.
- **Recharts** for insights charts, and React Hook Form + Zod for forms (shadcn's standard form pattern).

## Options considered
- **Mantine.** A complete set of components including tables and charts. Faster to start, but you're tied to its styling system and release cycle.
- **Ant Design.** Strong tables and forms with a classic admin look, but heavy and hard to restyle.
- **MUI.** Widely used, and its data grid handles server paging, but the bundle is heavier and advanced grid features are paid.

## Consequences
- Good: we own the component code, so there's no fighting a library's styling. Accessibility comes from Radix.
- Good: server state (TanStack Query) and UI state stay separate, which keeps components small.
- Cost: more assembly. The data table and some patterns are built from pieces rather than used off the shelf.
