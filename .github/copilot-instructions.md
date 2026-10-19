# Project Guidelines

## Code Style
- Use TypeScript + React function components.
- Keep UI concerns in `src/components/` and network logic in `src/api/`.
- Follow existing import style that uses `type` imports for TypeScript-only symbols.

## Architecture
- App state and user flow live in `src/App.tsx` (search location, select candidate, fetch weather, render states).
- API access is centralized in `src/api/weather.ts` via `searchLocations` and `getWeather`.
- Weather presentation is isolated in `src/components/Weather.tsx`.
- Weather-code mapping lives in `src/weatherConditions.ts`.

## Build and Test
- Required runtime: Node.js 24+.
- Install: `npm install`
- Dev server: `npm run dev`
- Lint (zero warnings allowed): `npm run lint`
- Unit tests (single run, Vitest): `npm run test`
- E2E tests (Playwright): `npm run test:e2e`
- Full local verification: `npm run test:all`

## Conventions
- Unit tests are colocated under `src/**` (for example `src/api/weather.test.ts`) and run in `jsdom`.
- E2E tests are under `e2e/` and mock API calls using Playwright route interception helpers in `e2e/fixtures/weatherApi.ts`.
- Accessibility checks are required in E2E flows (see `e2e/accessibility.spec.ts` with axe).
- Weather and geocoding API base URLs come from Vite env vars when set, otherwise defaults in `src/api/weather.ts` are used.
- When expanding guidance, link to `README.md` and existing docs rather than duplicating long explanations.
