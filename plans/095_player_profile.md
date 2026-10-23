---
id: 095
title: Player Profile
phase: 7
status: in-progress
depends_on: [094]
test_file: backend/tests/test_profiles.py, backend/tests/test_account_delete.py, backend/tests/test_account_export.py, frontend/tests/profile.test.tsx
implementation_files: [backend/app/models/orm_profiles.py, backend/app/services/profiles.py, backend/app/schemas/profile_schemas.py, backend/app/api/routes_profile.py, backend/app/services/account_erase.py, backend/app/services/account_admin.py, backend/app/main.py, backend/alembic/versions/e8b4c1d7f2a9_user_profiles.py, backend/app/services/account_export.py, frontend/src/pages/ProfilePage.tsx, frontend/src/components/ProfileForm.tsx, frontend/src/components/AccountPanel.tsx, frontend/src/components/PortraitPanel.tsx, frontend/src/services/profileApi.ts, frontend/src/styles/profile.css]
---

# Objective

The owner (23 Oct): after signing in, a player has a profile with first name,
last name, birthday and gender, on a page with a good layout that includes the
photo from plan 094. The app stores need two more things before ICMBOT is
published: players delete their own account in the app, and they can get a copy
of their data.

# Decisions

- Fields: first name and last name (1 to 40 characters, letters, spaces, dot,
  apostrophe and hyphen, so "José Ñúñez" and "O'Neil" work), display name
  (2 to 24 characters, the name shown at the table), birthday, gender.
- Gender is optional: man, woman, non-binary, self-described (with a short
  text) or prefer not to say, which is the default. It is used for Spanish
  greetings ("Bienvenido" or "Bienvenida").
- The birthday is required to save a profile, and a player under 18 is
  refused. ICMBOT is a poker trainer, so both app stores give it an adult
  "simulated gambling" rating. Nobody else ever sees the date; the owner sees
  it only in the form.
- Only the owner reads or changes a profile. The user comes from the bearer
  token, never from the request. The Admin does not see birthday or gender.
- Profile values are never written to the log. A database error is logged with
  its type only, like portraits.
- Storage: the `user_profiles` table when AUTH_STORAGE=database (Render), which
  the backend creates itself; memory otherwise. One row per username, so
  deleting the account deletes the row.
- Self-service deletion: `DELETE /api/account`. A password account sends its
  password again. An account with Google sign-in sends the confirmation word
  `DELETE`. An Admin account cannot delete itself here, so the last Admin can
  never disappear by accident.

# Steps

1. Storage: `user_profiles` table, Alembic migration, memory and database
   stores.
2. `GET` and `PUT /api/profile`: validation on the pydantic schema, age 18 or
   more, 404 when there is no profile yet.
3. `DELETE /api/account`: account, logins, live tables, saved history, photo
   and profile. The Admin delete uses the same code, so it also removes the
   profile.
4. `GET /api/account/export`: the player's own data as JSON.
5. Profile page `#/profile`: identity card (photo with its review state,
   display name, statistics), personal details form, account section (change
   password, download my data, delete account). "Your portrait" in the home
   menu becomes "Your profile"; `#/portrait` opens the new page.
6. The display name on the hero's seat instead of the username.
7. English and Spanish text, including the gendered greeting.
8. A privacy page linked from the profile and the sign-up screen.

# Checked

Steps 1 to 3, 23 Oct: backend test_profiles.py (24), test_account_delete.py
(8) and test_profiles_db.py (2, PostgreSQL); full suite 781 passed with a
database. Alembic upgrade, downgrade and upgrade again on PostgreSQL 16. Each
safeguard was broken on purpose (password check, age check, profile erase,
owner from the token) and the tests went red, then green after restoring.
Not checked on Render.

Steps 4 and 5, 23 Oct: `GET /api/account` (how the account signs in) and
`GET /api/account/export`, test_account_export.py (4); the profile page,
frontend profile.test.tsx (15). Backend 765 passed, 20 skipped without a
database; frontend 450. Local browser (Chromium, 23 Oct): a new account,
the form saved "José María Ñúñez", display name "Pepe 7", 1985-07-20, man;
the server returned the same values and the title became "Welcome, José
María"; two columns at 1200 px, one column at 600 px; a wrong password on
Delete account showed "The password is not correct." and the account stayed;
`#/portrait` opens `#/profile`; the home menu shows "Your profile". The
export with saved hands is not checked against PostgreSQL. Steps 6 to 8 are
not built yet.

Birthday field, 23 Oct (owner: a phone's date picker is slow): one text box
with the number keyboard, the slashes added while typing (02021971 shows
02/02/1971), a date that does not exist (31/02) refused before sending; the
API still takes yyyy-mm-dd. Frontend birthday_input.test.ts (20) and one more
profile test; 474 passed. Local browser at 375 px: typed 02021971, saved, the
server returned 1971-02-02.
Then (owner: "type it as well", and an easy calendar for the year): a
calendar button beside the box opens a calendar whose year (adult years,
newest first, down to 1900) and month are lists, Monday first, month and
weekday names in the page language; a day fills the same box. Frontend
birthday_picker.test.tsx (5). Local browser at 375 px: 1985, July, 20 gave
20/07/1985.

Not in this plan: changing the password from the profile (the only password
route is the forced Admin change), and the statistics card from the mockup.
