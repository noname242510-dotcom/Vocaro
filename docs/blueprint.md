# **App Name**: Vocaro

## Core Features:

- User Authentication: Secure user authentication using Firebase Auth, including username/password registration, auto-login, and password reset via email. Usernames must be unique.
- Subject Management: Allow users to create, rename, and delete subjects. Each subject has a name and an emoji.
- Vocabulary Upload and Management: Enable users to add vocabulary either manually or via OCR from uploaded images. Vocabulary is organized into stacks, each with a name.
- OCR Image Processing: Implement OCR functionality on the frontend to extract words from uploaded images. Images are processed locally without being stored on the server.
- Learning Mode: Provide a learning mode with flashcards. Users can flip cards to reveal the answer and mark whether they knew the answer or not.
- Repetition Mode: Implement a repetition mode that includes vocabulary the user previously answered incorrectly, within a user-defined timeframe.
- Settings Customization: Allow users to customize the app's appearance and quiz settings, including font selection, light/dark mode, and quiz preferences.

## Style Guidelines:

- Primary color: Almost black (#121212) to ensure sufficient contrast.
- Background color: Very dark grey (#0A0A0A) for a minimalistic dark design.
- Accent color: Light gray (#D3D3D3) for a high contrast with the background. Use on selections, switches, and progress bars.
- Body and headline font: 'PT Sans' (sans-serif) for a modern yet readable style.
- Use minimalist icons. Light shadows for a glass effect.
- Fully responsive layout with rounded edges. Glass effect for buttons.
- Confetti animation (black in light mode, white in dark mode) on achieving ≥90% correct in a session (if enabled in settings).