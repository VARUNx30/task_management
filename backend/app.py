import base64
import os
from email.message import EmailMessage
from pathlib import Path
from uuid import UUID

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from supabase import create_client
from supabase_auth.errors import AuthApiError

load_dotenv(Path(__file__).resolve().with_name(".env"))

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "https://taskmanagement-flax-delta.vercel.app"])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_ADMIN_KEY = os.getenv("SUPABASE_ADMIN_KEY")
GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

if not SUPABASE_URL or not SUPABASE_KEY or not SUPABASE_ADMIN_KEY:
    raise RuntimeError("Supabase environment variables are missing")

supabase_auth = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_admin = create_client(SUPABASE_URL, SUPABASE_ADMIN_KEY)


def send_notification_email(recipient_email, task_title, task_description=""):
    token_path = Path(__file__).resolve().with_name("token.json")
    if not token_path.is_file():
        app.logger.error(
            "Gmail is not authorized; run backend/authorize_gmail.py first"
        )
        return False

    body = f"A task has been assigned to you: {task_title}"
    if task_description:
        body += f"\n\nTask details: {task_description}"

    try:
        credentials = Credentials.from_authorized_user_file(
            str(token_path), GMAIL_SCOPES
        )
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(GoogleAuthRequest())
            token_path.write_text(credentials.to_json(), encoding="utf-8")
        if not credentials.valid:
            app.logger.error("Gmail authorization is invalid; authorize again")
            return False

        message = EmailMessage()
        message["To"] = recipient_email
        message["Subject"] = f"New task assigned: {task_title}"
        message.set_content(body)
        encoded_message = base64.urlsafe_b64encode(
            message.as_bytes()
        ).decode("utf-8")

        service = build("gmail", "v1", credentials=credentials, cache_discovery=False)
        result = service.users().messages().send(
            userId="me",
            body={"raw": encoded_message},
        ).execute()
        app.logger.info(
            "Gmail accepted task notification (id=%s)", result.get("id")
        )
        return True
    except Exception:
        app.logger.exception("Could not send Gmail task assignment email")
        return False


def get_authenticated_user():
    authorization = request.headers.get("Authorization", "")
    scheme, separator, token = authorization.partition(" ")
    if not separator or scheme.lower() != "bearer" or not token.strip():
        return None

    try:
        response = supabase_auth.auth.get_user(token.strip())
    except AuthApiError:
        app.logger.info("Rejected request with an invalid Supabase access token")
        return None
    except Exception:
        app.logger.exception("Could not validate Supabase access token")
        raise

    return response.user if response else None


@app.get("/api/users")
def list_users():
    current_user = get_authenticated_user()
    if current_user is None:
        return jsonify({"error": "Authentication required"}), 401

    try:
        users = supabase_admin.auth.admin.list_users()

        return jsonify({
            "users": [
                {
                    "id": user.id,
                    "email": user.email or "",
                    "name": (
                        user.user_metadata.get("name")
                        if user.user_metadata
                        else None
                    ),
                }
                for user in users
                if user.id != current_user.id
            ]
        })
    except Exception:
        app.logger.exception("Could not list Supabase Auth users")
        return jsonify({"error": "Unable to load users"}), 500


@app.post("/api/tasks")
def create_task():
    current_user = get_authenticated_user()
    if current_user is None:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required"}), 400

    title = data.get("task_title")
    description = data.get("task_description", "")
    assignee_id = data.get("assigned_to")
    if not isinstance(title, str) or not title.strip():
        return jsonify({"error": "A task title is required"}), 400
    if not isinstance(description, str):
        return jsonify({"error": "Description must be text"}), 400
    if not isinstance(assignee_id, str):
        return jsonify({"error": "A valid assignee is required"}), 400

    try:
        assignee_id = str(UUID(assignee_id))
    except ValueError:
        return jsonify({"error": "A valid assignee is required"}), 400

    if assignee_id == current_user.id:
        return jsonify({"error": "Choose another user to assign this task to"}), 400

    try:
        assignee = supabase_admin.auth.admin.get_user_by_id(assignee_id).user
        if assignee is None:
            return jsonify({"error": "The selected user does not exist"}), 404

        response = (
            supabase_admin.table("Tasks")
            .insert({
                "task_title": title.strip(),
                "task_description": description.strip(),
                "created_by": current_user.id,
                "assigned_to": assignee_id,
            })
            .execute()
        )
        if assignee.email:
            send_notification_email(
                assignee.email,
                title.strip(),
                description.strip(),
            )
        return jsonify({"task": response.data[0] if response.data else None}), 201
    except Exception:
        app.logger.exception("Could not create assigned task")
        return jsonify({"error": "Unable to assign task"}), 500
    
@app.get("/api/my-tasks")
def get_tasks():
    current_user = get_authenticated_user()

    if current_user is None:
        return jsonify({"error": "Authentication required"}), 401

    try:
        response = (
            supabase_admin.table("Tasks")
            .select(
                "id, task_title, task_description, created_by, assigned_to"
            )
            .or_(
                f"created_by.eq.{current_user.id},"
                f"assigned_to.eq.{current_user.id}"
            )
            .order("id", desc=True)
            .execute()
        )
        tasks = response.data or []

        return jsonify({"tasks": tasks}), 200
    except Exception:
        app.logger.exception("Could not load tasks for authenticated user")
        return jsonify({"error": "Unable to load your tasks"}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
