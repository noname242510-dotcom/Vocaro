# CHANGELOG

## [Unreleased]

### Added
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
- **Next.js 15 Compatibility**: Updated dynamic routing page components (`[subjectId]`, `[userId]`, `[groupId]`, etc.) to correctly handle the `params` object as a `Promise` by utilising `React.use()` to retrieve parameter values.
- **UI Component Refactor**:
  - Standardized `.card`, `.button`, and `.input` components to strictly adhere to the `DESIGN_SYSTEM.md` specifications.

### Fixed
- **Application Errors (Next.js 15 Routing Bug)**: Resolved critical errors thrown across dashboard detail pages and dynamic segments.
- **Overlapping UI Elements**: Addressed z-index conflicts between sidebars, modal dialogs, and navigation headers.

### Removed
- **Flashcards Feature**: Completely deleted the old `/dashboard/flashcards` pages and all associated components.
- **Mock Data**: Removed lingering dummy statistics and static array representations across dashboard views, replacing them fully with functional Firestore integrations and proper loading/empty states.
