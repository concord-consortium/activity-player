# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Activity Player is a React/TypeScript single-page application for presenting lightweight educational activities. It supports sequenced content, interactive elements, teacher feedback, and comprehensive data tracking. Developed by the Concord Consortium.

## Commands

### Development
```bash
npm start                    # Dev server on localhost:8080 with HMR
npm start:secure            # HTTPS with local certs
npm start:secure:no-certs   # HTTPS without certs
```

### Building
```bash
npm run build               # Full build (lint + clean + webpack)
npm run build:webpack       # Direct webpack production build
npm run clean               # Remove dist/ folder
```

### Linting
```bash
npm run lint                # Full linting (all source + cypress)
npm run lint:build          # Stricter linting for production
npm run lint:fix            # Auto-fix lint issues
```

### Testing
```bash
npm test                    # Jest unit tests
npm run test:watch          # Jest with --watch
npm run test:coverage       # Jest with coverage report

# Cypress E2E
npm run test:cypress        # Headless mode
npm run test:cypress:open   # GUI with debugger
npm run test:full           # Jest + Cypress (sequential)

# Run single test file
npx jest path/to/file.test.ts
npx cypress run --spec 'cypress/e2e/specific.test.ts'
```

## Architecture

### State Management
The app uses React Context API extensively. Key contexts:
- `LaraDataContext` - Current activity/sequence data
- `PortalDataContext` - User and portal information
- `LaraGlobalContext` - LARA plugin API
- `ReadAloudContext` - Text-to-speech state
- `AccessibilityContext` - Font size, font type settings
- `MediaLibraryContext` - Media library items

### Data Flow
1. App.tsx loads activity/portal data via `portal-api.ts`
2. `firebase-db.ts` establishes Firestore connection for real-time sync
3. Data propagates via React Context to components
4. Changes saved to Firestore (answers, interactive states, feedback)

### Key Directories
- `src/components/` - React components (activity-page, page-sidebar, teacher-feedback, etc.)
- `src/lara-plugin/` - Plugin API v3, embeddable contexts, event system
- `src/utilities/` - Helper modules (activity-utils, embeddable-utils, plugin-utils, auth-utils)
- `src/data/` - Activity/sequence JSON fixtures for testing
- `cypress/e2e/` - E2E test specs
- `cypress/support/elements/` - Page object classes for Cypress tests

### Plugin System
Located in `src/lara-plugin/`:
- Plugin API v3 for embeddable and runtime contexts
- Dynamic script loading via `loadPluginScripts()` in plugin-utils.ts
- Supports custom interactives and linked interactives

### URL Parameters
Activities load via query parameters:
```
?activity=<id|url>           # Load activity
?sequence=<id|url>           # Load sequence
?sequenceActivity=<n|id>     # Select activity in sequence
?page=<n|id>                 # Select page
?mode=teacher-edition        # Teacher view
?token=<jwt>                 # Auth token
```

## Key Technologies
- **React 16.14** with TypeScript 4.5
- **Firebase 9.8** (Firestore for real-time data)
- **Webpack 5** for bundling
- **@concord-consortium packages**: lara-interactive-api, interactive-api-host, dynamic-text
- **Jest 27** + **@testing-library/react** for unit tests
- **Cypress 13** for E2E tests
- **Sass/SCSS** for styling

## Code Style
- 2-space indentation
- Double quotes (template literals allowed)
- Strict TypeScript with no implicit any
- Components: PascalCase (ActivityPage.tsx)
- Utilities: kebab-case (auth-utils.ts)
- Tests: `.test.ts` or `.spec.ts` suffix

## Testing Notes
- Activity JSON fixtures in `src/data/` can be imported directly
- Firebase is mocked via `src/test-utils/firestore-mock.ts`
- Cypress uses page objects from `cypress/support/elements/`
- Jest setup in `src/setupTests.js` includes Enzyme, jQuery mocks, crypto polyfill
