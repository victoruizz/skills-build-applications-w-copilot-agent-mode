# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so the work can proceed in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## Responsibilities by tier

### Presentation tier: React frontend

The React app owns navigation, routing, and rendering for the four capabilities:

- Activities
- Teams
- Leaderboard
- Workout suggestions

It should call the backend over the `/api` surface and render loading, empty, and error states using accessible semantics such as `role="status"` and `role="alert"`. The current repository still contains stubbed rendering in `CapabilityCard` and route components, which is why the frontend contract tests fail even though the router and navigation shell already exist.

### Logic tier: Express + TypeScript backend

The Express app in `octofit-tracker/backend/src/app.ts` and `routes/api.ts` is the contract boundary for the browser. It validates incoming requests, delegates to the service layer, and converts service exceptions into HTTP responses. The service layer is responsible for:

- activity creation and validation
- team creation and membership handling
- leaderboard aggregation
- workout recommendations based on user email and recent activity patterns

The current implementation is incomplete: `createActivity`, `createTeam`, `getLeaderboard`, and `suggestWorkouts` do not yet satisfy the documented behaviors, and the routes still rely on placeholder service methods.

### Data tier: MongoDB + Mongoose

The MongoDB layer persists the application data with Mongoose models in `octofit-tracker/backend/src/models` and idempotent seed data in `seed.ts`. It owns the schema rules for users, teams, activities, and workouts, including required fields, default arrays, object references, and seeded representative fixtures. The tests expect meaningful validation on model construction and a seed script that preserves sentinel records while creating or updating the canonical OctoFit data.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Current failing baseline

The repository is intentionally in a starter state and the current test baseline fails in all three tiers:

- Data-tier contract: `npm run test:data --prefix octofit-tracker/backend` fails because the schema definitions are missing required validation and the seed process does not yet create the representative idempotent seed data that the contract expects.
- API contract: `npm run test:api --prefix octofit-tracker/backend` fails because the service layer is still placeholder logic. `createActivity` and `createTeam` throw `501`, `getLeaderboard` returns an empty list, and the workout suggestion route does not yet derive recommendations from user activity or goal data.
- Frontend contract: `npm test --prefix octofit-tracker/frontend -- --run` fails because the UI is still rendering static placeholders instead of fetching and rendering real data; it also fails to expose loading and error semantics used by the tests.

## Intended behavior for each failing test

### Data-tier tests

The data tests in `octofit-tracker/backend/tests/data.contract.test.ts` expect:

- `User` validation to require `name`, `email`, and `fitnessGoal`
- `Team` validation to require `name` and `mascot`, while also defaulting `members` to an empty array
- `Activity` validation to require `type`, `user`, `team`, `minutes`, `points`, and `occurredAt`
- `Workout` validation to require `focus`, `minutes`, and `difficulty`
- Seed data to be idempotent and preserve unrelated existing records while creating the expected OctoFit fixtures for users, teams, activities, and workouts

### API tests

The API tests in `octofit-tracker/backend/tests/api.contract.test.ts` expect:

- `POST /api/activities` to accept valid `userId`, `teamId`, `type`, and `minutes` and reject malformed or missing references with a 4xx status
- created activities to be stored with `user`, `team`, `type`, `minutes`, computed `points`, and `occurredAt`
- `POST /api/teams` to reject missing `name` with `400` and persist `name`, `mascot`, and members
- `GET /api/leaderboard` to return team totals in descending order with `teamName`, `totalPoints`, and `rank`
- `GET /api/workouts/suggestions/:userEmail` to return workout suggestions relevant to the matching email, while unknown emails respond with a deliberate 4xx

### Frontend tests

The frontend tests in `octofit-tracker/frontend/tests/app.contract.test.tsx` expect:

- visible headings and fetched content for activities, teams, leaderboard, and workouts
- loading indicators while requests are pending through `role="status"`
- accessible empty states like “No activities” or “No teams”
- accessible alert messaging when API calls fail
- fetches to the correct `/api/...` endpoints with the specific user email used for workout suggestions

## Smallest safe implementation plan

1. Fix the data model and seed layer first.
   - Add required Mongoose validation and defaults to the models in `octofit-tracker/backend/src/models`.
   - Implement the seed script as an idempotent setup routine that creates the canonical user/team/activity/workout fixtures without deleting unrelated records.

2. Implement the Express service layer second.
   - Finish the activity and team validators in `octofit-tracker/backend/src/services/octofitService.ts`.
   - Compute points and timestamps from valid request data.
   - Aggregate leaderboard totals and rank order.
   - Match workout suggestions by user email and recent activity or goal, returning a reasoned recommendation.

3. Complete the frontend last.
   - Replace the placeholder `CapabilityCard` content with live API-driven rendering.
   - Reuse the shared fetch client and render loading, empty, and failure states clearly.
   - Confirm each capability route renders data from the `/api` contract and not from local mock-only logic.

This is the smallest safe order because the UI depends on backend behavior, and the backend depends on valid data-layer contracts. The repository’s current failures cluster around these missing layers in exactly that order.

## Test plan and validation commands

Record the commands run and what each failure means as the implementation progresses.

- Data-tier validation: `npm run test:data --prefix octofit-tracker/backend`
  - Fails when Mongoose validation or idempotent seeding is incomplete.
- API validation: `npm run test:api --prefix octofit-tracker/backend`
  - Fails when route behavior, validation, leaderboard ordering, or workout recommendations do not match the contract.
- Frontend validation: `npm test --prefix octofit-tracker/frontend -- --run`
  - Fails when the React app does not render real API-backed data, loading states, empty states, or accessible alerts.
- Backend build validation: `npm run build --prefix octofit-tracker/backend`
  - Verifies the TypeScript project compiles cleanly after the backend logic is implemented.
- Frontend build validation: `npm run build --prefix octofit-tracker/frontend`
  - Verifies the React app and Vite build compile cleanly after the frontend is implemented.

## Implementation decisions

- Presentation tier decision: Keep the React frontend responsible only for rendering and user interaction; it should not directly manipulate MongoDB or contain business rules.
- Logic tier decision: Keep validation, HTTP error handling, leaderboards, and workout recommendation logic in the Express service layer so the routes remain thin and consistent.
- Data tier decision: Use Mongoose schemas as the source of validation and seed them idempotently so the backend works against a reliable MongoDB model layer.
- Activity tracking approach: Store user, team, type, and minutes, and derive `points` and `occurredAt` in a single server-side action.
- Team management approach: Require a team name and mascot, keep members as ObjectId references, and expose them through the API as an array of member IDs.
- Leaderboard approach: Aggregate activity points by team and return a ranked list with `teamName`, `totalPoints`, and `rank`.
- Workout suggestions approach: Match the requested user email to a seeded user, inspect the user goal or recent activity pattern, and recommend the best-fit workout with a human-readable reason.

This document reflects the current repository and the observed failing baseline; no application code or test files were modified while documenting the implementation path.
