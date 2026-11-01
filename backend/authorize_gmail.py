from pathlib import Path

from google_auth_oauthlib.flow import InstalledAppFlow


SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
BACKEND_DIR = Path(__file__).resolve().parent
CREDENTIALS_PATH = BACKEND_DIR / "credentials.json"
TOKEN_PATH = BACKEND_DIR / "token.json"


def main():
    if not CREDENTIALS_PATH.is_file():
        raise FileNotFoundError(
            "Download a Google OAuth Desktop app credentials file and save it "
            "as backend/credentials.json"
        )

    flow = InstalledAppFlow.from_client_secrets_file(
        str(CREDENTIALS_PATH), SCOPES
    )
    credentials = flow.run_local_server(port=0)
    TOKEN_PATH.write_text(credentials.to_json(), encoding="utf-8")
    print("Gmail authorization saved to backend/token.json")


if __name__ == "__main__":
    main()