# SureTrace QR Card Generator

Local Flask app for generating SureTrace PVC-size QR cards and sticker PDFs.

## Run locally

```powershell
.\.venv\Scripts\python.exe app.py
```

Open `http://127.0.0.1:5000`.

## Bulk upload columns

Upload `.csv` or `.xlsx` files with these headers:

```text
category,format,name,apartment,location,emergency_contact,company,notes
```

Supported categories are `kids`, `elderly`, `bike`, `car`, `employee`, and `other`.
Supported formats are `pvc`, `jacket_tag`, `sticker_round`, `vehicle_sticker`, and `employee_badge`.

The app stores records in `data/suretrace.db`, so orders are not overwritten when the server restarts.

## Private admin config

Create `instance/admin_credentials.json` locally or on PythonAnywhere. This file is ignored by Git.

```json
{
  "username": "your-admin-username",
  "password": "your-admin-password",
  "cleanup_password": "your-delete-history-password",
  "secret_key": "use-a-long-random-secret"
}
```

You can also set `SURETRACE_ADMIN_USERNAME`, `SURETRACE_ADMIN_PASSWORD`, `SURETRACE_CLEANUP_PASSWORD`, and `SURETRACE_SECRET_KEY` as environment variables.

## PythonAnywhere notes

SQLite works on PythonAnywhere free accounts for small apps because SQLite is available to everyone, but PythonAnywhere recommends it only for testing/light usage. The database file will live inside `data/suretrace.db` under the project folder.

Use `pythonanywhere_wsgi.py` as the WSGI reference file, adjusting `project_home` if your clone path is different from `~/suretraceApp`.
