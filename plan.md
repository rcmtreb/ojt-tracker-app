Plan: Make target hours configurable per user & fix Action button visibility

Goal
- Allow each user to set their own target OJT hours (default 480) and persist this setting.
- Fix visibility logic so the Action button only shows when the current user may act on a record.

Approach
1. Backend
   - Add `targetHours` field to User schema (default 480).
   - Add API endpoints: GET /api/users/:id/settings, PATCH /api/users/:id/settings to read/update targetHours.
   - Ensure data migration: existing users get default value.
2. Frontend
   - Add UI in Profile/Dashboard to view/edit target hours.
   - Use settings API to save and fetch targetHours on login and user settings load.
   - Update hours-calculation logic to use per-user targetHours.
   - Fix Action button visibility checks to use auth user id and record ownership/role rules.

Files to change
- backend/server.js (User schema, routes)
- backend/controllers/userController.js (new handlers)
- src/pages/Dashboard.jsx (use targetHours)
- src/pages/Profile.jsx (settings UI)
- src/components/ActionButton.jsx (visibility logic)

Testing
- Manual: create user, change target hours, add records, verify calculations and persistence.
- Automated: add basic endpoint tests (optional follow-up).

Rollout notes
- No destructive migration: add default where missing.
- Update README with new env/config notes if needed.

Estimated effort: 3-5 hours
