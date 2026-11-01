# TaskFlow – Task Management Application

A task-management web application built with **Next.js, TypeScript, Flask, Supabase and Gmail API**. Users sign in with Google, view other registered users, assign tasks, and view tasks assigned to them.

## Features

- Google sign-in using Supabase Auth.
- User directory populated from Supabase Auth users.
- Assign a task to another registered user.
- Store task information in Supabase.
- Send an email notification to the assignee using the Gmail API.
- View tasks assigned to the currently signed-in user.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Python, Flask, Flask-CORS |
| Authentication and database | Supabase |
| Email notifications | Gmail API, Google OAuth 2.0 |

## Project structure

```text
task-management/
├── backend/
│   ├── app.py
│   ├── authorize_gmail.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── credentials.json       # Download separately; do not commit
│   └── token.json             # Generated during Gmail authorization; do not commit
│
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── auth/callback/
│   │       ├── lib/
│   │       ├── Home.tsx
│   │       ├── My_Tasks.tsx
│   │       ├── SignUp.tsx
│   │       └── page.tsx
│   ├── package.json
│   └── .env.example
│
└── README.md
```

## Prerequisites

Install the following:

- Node.js and npm
- Python 3
- A Supabase project
- A Google Cloud project with Gmail API enabled
- A Google account to act as the application's email sender

## 1. Configure Supabase

1. Create a project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Enable Google as an authentication provider under **Authentication → Sign In / Providers**.
3. Configure the Google OAuth client ID and secret in the provider settings.
4. In **Authentication → URL Configuration**, add the local callback URL to the allowed redirect URLs:

   ```text
   http://localhost:3000/auth/callback
   ```

5. Create a `Tasks` table in the Supabase database. The backend expects these columns:

   | Column | Purpose |
   |---|---|
   | `id` | Unique task identifier |
   | `task_title` | Task title |
   | `task_description` | Optional task description |
   | `created_by` | Supabase Auth user ID of the task creator |
   | `assigned_to` | Supabase Auth user ID of the assignee |

   Use UUID-compatible columns for `created_by` and `assigned_to`, and make `id` a primary key. Configure a suitable default for `id` (for example, an identity/serial value or UUID) to match your database design.

6. Obtain the project URL, publishable/anon key, and a server-only secret/service-role key from the Supabase project settings.

The backend uses the admin key to look up Auth users and access the task table. Keep this key on the backend only.

## 2. Configure Google OAuth for the frontend

The frontend uses Supabase Google sign-in. In Google Cloud Console:

1. Create or select a Google Cloud project.
2. Configure the OAuth consent screen.
3. Create an OAuth client for a Web application.
4. Add the Supabase callback URL shown in your Supabase Google provider settings as an authorized redirect URI.
5. Copy the client ID and client secret into the Supabase Google provider configuration.

The frontend redirects to `/auth/callback`, where the Supabase authorization code is exchanged for a session.

## 3. Configure Gmail API for task notifications

The backend sends notifications through a dedicated Gmail account.

1. In [Google Cloud Console](https://console.cloud.google.com/), enable the **Gmail API**.
2. Configure the OAuth consent screen and add the sender account as a test user if the app is in testing mode.
3. Create an OAuth client of type **Desktop app** for the local development authorization flow.
4. Download the OAuth client JSON file and save it as `backend/credentials.json`.
5. Install backend dependencies (see below).
6. From the `backend` directory, run:

   ```bash
   python authorize_gmail.py
   ```

7. Complete the Google consent flow in the browser. The script creates `backend/token.json`.
8. Keep `credentials.json` and `token.json` private and out of source control.

The Gmail permission used by the backend is `https://www.googleapis.com/auth/gmail.send`. The Gmail account that authorizes this flow is the sender. The assignee's email address is the recipient.

> **Deployment note:** The included desktop OAuth authorization flow is intended for local development. A deployed backend needs a secure server-side OAuth setup and secure persistent storage for the sender's refresh token. Do not assume a local `token.json` file will persist on a cloud host.

## 4. Backend setup

Open a terminal:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment.

**Windows PowerShell:**

```powershell
.venv\Scripts\Activate.ps1
```

**macOS/Linux:**

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `backend/.env` using the following template:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
SUPABASE_ADMIN_KEY=YOUR_SUPABASE_SECRET_OR_SERVICE_ROLE_KEY
```

Start Flask:

```bash
python app.py
```

The backend runs at:

```text
http://localhost:5000
```

## 5. Frontend setup

Open another terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

Start Next.js:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 6. How task assignment works

1. A user signs in through Google using Supabase Auth.
2. The frontend requests the other registered users from `GET /api/users`.
3. The user selects an assignee and submits a task.
4. The frontend sends the task title, description and assignee ID to `POST /api/tasks`, with the Supabase access token in the Authorization header.
5. Flask validates the access token and checks that the selected assignee exists.
6. Flask inserts the task into the `Tasks` table.
7. Flask sends a notification to the assignee using Gmail API.
8. The assignee can view assigned tasks in the **My Tasks** view.

## API endpoints

All endpoints require a valid Supabase access token in the header:

```http
Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN
```

### `GET /api/users`

Returns registered users other than the currently authenticated user.

### `POST /api/tasks`

Creates and assigns a task.

Example JSON body:

```json
{
  "task_title": "Complete project documentation",
  "task_description": "Prepare the README and setup instructions",
  "assigned_to": "ASSIGNEE_SUPABASE_USER_UUID"
}
```

### `GET /api/my-tasks`

Returns tasks created by or assigned to the authenticated user. The frontend filters this list to show tasks assigned to the current user.

## Troubleshooting

- **No other users appear:** Register another account. The user-list endpoint deliberately excludes the currently signed-in user.
- **401 Authentication required:** Sign in again and check that the frontend sends the current Supabase access token.
- **Task insert fails:** Verify the `Tasks` table name and column names match the backend insert/select statements, and check the Flask terminal for the database error.
- **No notification email:** Run `authorize_gmail.py` again if Gmail authorization is missing or invalid. Check the Flask terminal for `Could not send Gmail task assignment email`, verify the sender account's OAuth consent, and check the recipient's spam folder.
- **CORS/network error:** Confirm Flask is running on port `5000` and the frontend backend URL points to it. The current Flask CORS configuration permits `http://localhost:3000`.

## Security

- Never commit `.env`, `.env.local`, `credentials.json`, `token.json`, Supabase secret/service-role keys, or OAuth client secrets.
- Keep the Supabase admin key exclusively on the backend.
- Use HTTPS and a production-appropriate OAuth configuration when deploying.
- Restrict allowed CORS origins to the deployed frontend origin in production.
- Do not expose access tokens or refresh tokens in logs or client-side code.

## Current development scope

The supplied project includes local development configuration and a desktop OAuth flow for Gmail sending. Production deployment, production OAuth consent/verification, and persistent secure refresh-token storage must be configured separately before deploying the email feature.
