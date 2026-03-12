# CHANGELOG

## [Unreleased]

### Added
- **Subjects Overview (`/dashboard/stacks`)**: New central page for managing subjects and stacks with expandable lists.
- **Subjects Cache Context**: Implemented `SubjectsCacheProvider` to provide globally shared, cached subject data across the dashboard, reducing Firestore read operations and enabling instant navigation.
- **Learn Page (Verbs)**: New practice mode for verb conjugations.
- **Enhanced Vocab Form**: Added fields for Lautschrift (Phonetic), Ähnliches Wort (Related Word), and Hinweise (Notes) to the manual addition flow.
- **Design System (`DESIGN_SYSTEM.md`)**: Comprehensive documentation of UI guidelines including colors, typography, sizing, border radii, and component specifications.
- **Dark Mode**: Complete dark mode implementation using `next-themes` and Tailwind CSS class strategy (`darkMode: 'class'`).
  - Added `ThemeProvider` component for application-wide theme context.
  - Added `ModeToggle` component in Appearance Settings.
  - Defined CSS variables for dark mode specific colors in `globals.css`.
  - Systematically replaced hardcoded `bg-white` and `text-black` utilities with semantic variables (`bg-card`, `bg-background`, `text-foreground`).
- **Premium UI Enhancements**:
  - Consistent border radii (`rounded-2xl` for inputs/buttons, `rounded-[2.5rem]` or similar abstract squircle implementations for cards).
  - Premium shadow effects (`shadow-xl shadow-primary/5`) applied throughout the dashboard components.
  - Enhanced animations and transitions on hover states.

### Changed
- **Navigation (Desktop & Mobile)**: Reordered items to: Home, Community, Sprachen (Stacks), Statistiken, Einstellungen.
- **Learn Page UI**:
  - Removed streak display to reduce visual clutter.
  - Reduced card aspect ratio for a scroll-free experience.
  - Implemented dynamic font sizing (Auto-Resize) based on term length to prevent overflows.
- **Subject Detail Page**: Improved layout with vertical stack list and dedicated action buttons for adding vocabulary/verbs.
- **Statistics Overview**: Overhauled with real Firestore data support for metrics, weekly activity charts, and a functional "Error Radar" for unmastered items.
- **Next.js 15 Compatibility**: Updated dynamic routing page components (`[subjectId]`, `[userId]`, `[groupId]`, etc.) to correctly handle the `params` object as a `Promise` by utilising `React.use()` to retrieve parameter values.
- **UI Component Refactor**:
  - Standardized `.card`, `.button`, and `.input` components to strictly adhere to the `DESIGN_SYSTEM.md` specifications.

### Fixed
- **Mobile Navigation Padding**: Added bottom padding to floating action buttons to prevent overlap with the mobile bottom nav.
- **Dark Mode Audit**: Audited all dashboard pages and replaced remaining hardcoded `bg-white` instances with semantic UI tokens.
- **Build Stabilization**: Resolved all JSX hydration and tag mismatch errors on dynamic pages.
- **Application Errors (Next.js 15 Routing Bug)**: Resolved critical errors thrown across dashboard detail pages and dynamic segments.
- **Overlapping UI Elements**: Addressed z-index conflicts between sidebars, modal dialogs, and navigation headers.

### Removed
- **Flashcards Feature**: Completely deleted the old `/dashboard/flashcards` pages and all associated components.
- **Mock Data**: Removed lingering dummy statistics and static array representations across dashboard views, replacing them fully with functional Firestore integrations and proper loading/empty states.
