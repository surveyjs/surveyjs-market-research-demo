# Acme Research

A market research operations demo. SurveyJS Form Library renders the working forms. SurveyJS Creator edits those forms, surveys, and screeners. Projects, participants, participation, responses, and incentives are stored in SQLite through a small Express API.

## Appearance

The shell uses Bootstrap 5 with the Bootswatch Zephyr theme. SurveyJS forms do not use a built-in SurveyJS theme. `src/main.tsx` loads, in order:

1. `bootswatch/dist/zephyr/bootstrap.min.css`
2. `survey-core/survey-core.min.css`
3. `survey-core/themes/adapters/bootstrap-zephyr.css`

The Zephyr adapter maps Bootstrap’s `--bs-*` variables onto the form controls, so a form matches the page.

This stack is separate from the other SurveyJS product demos. The HR demo uses Material UI. The Campus demo uses shadcn/ui. The Healthcare demo uses a custom green Tailwind palette.

Survey Creator is a commercial product. The form builder runs without a license key and shows the SurveyJS banner. Set `SURVEYJS_KEY` to a developer license key to remove that banner. Copy `.env.example` to `.env.local` for a local key. Form Library does not need a key.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3004. The API listens on port 4004 and stores `data/research.db`.

Sign in with any seeded account. Every password is `demo1234`.

| Username | Role |
| --- | --- |
| `maya.collins` | Administrator |
| `owen.blake` | Research Manager |
| `priya.shah` | Researcher |
| `noah.grant` | Read-only |

Maya Collins can manage projects, participants, surveys, screeners, incentives, and form definitions. A research manager can change records but cannot open the form builder. A researcher can view records and save a test survey response. A read-only user can view records.

## What you can do

- Search participants by surname, participant ID, or email. An empty search lists the directory. `Thompson` returns Emma Thompson (`P-10481`).
- Register and edit participants. A duplicate email or participant ID is rejected.
- Open a profile with contact details, study participation, screening history, and notes.
- Add a participation record. The same participant cannot join a project twice unless that project allows repeat participation.
- Open Holiday Shopping Study 2026 (42 of 100), Mobile Banking UX Study (18 of 24), and Healthy Snacks Concept Test (not started). Recruitment counts come from participation records.
- Create and edit surveys in Survey Creator, preview them, and save a test response.
- Create and edit screeners, change qualification rules, preview the result, and send a screener to a participant.
- Record and update incentives. Every navigation item is active, including Incentives.

To reset the demo data, stop the server and delete `data/research.db`, or call `POST /api/admin/reset`.

## Scripts

```bash
npm run build
npm run lint
npm run test:unit
```
