# DocuMon DRMS

DocuMon is a web-based Document Request Monitoring System developed for the
Registrar's Office of Mapua Malayan Colleges Mindanao. It replaces fragmented
Excel monitoring sheets and a physical multi-office clearance form with
centralized request tracking, token-based clearance coordination, and real-time
student status updates.

## Live System

| Portal | URL |
|---|---|
| Student Portal | `https://special-project-im.vercel.app` |
| Staff Login | `https://special-project-im.vercel.app/staff/login` |
| Django Admin | `https://drms-backend-2jid.onrender.com/admin` |

> **Note:** The backend is hosted on Render's free tier and may take 30–60
> seconds to wake from idle on first load.

## Demo Credentials

| Role | Login Field | Value |
|---|---|---|
| Super Admin | Username | `specialproject` |
| Super Admin | Email | `mjPepito@mcm.edu.ph` |
| Student (test) | Student Number | `2022140768` |
| Student (test) | Email | `josephppepitomark@gmail.com` |

Staff accounts are created by the Super Admin via the Admin Panel. Student
accounts are self-registered through the student portal.

## Features

### Student Portal
- Account registration with student number, name, email, program, and academic level
- Login and logout
- Submit document requests online (RO-0005 for enrolled students, RO-0004 for alumni and transferring-out students)
- Select document types and specify number of copies
- Upload authorization letter for representative claims
- Real-time request status tracking through all 13 workflow stages
- View expected claim date (calculated from payment date + 7 working days)
- Search requests by tracking ID or Document Request No.
- Self-service forgot password via student number and registered email verification

### RO Staff Dashboard
- View all active requests with default Newest First sort and toggleable Priority View
- Filter by form type, status, and date; search by name, Document Request No., or status
- Request detail with Form tab, Journey tab, and Clearance tab
- Advance request status through the official 13-stage workflow
- Mark requests as Invalid Request, Clearance Hold, or Rejected with reasons
- Assign staff member (Assigned To) and billing staff member (Billed By) per request
- Generate and send token-based clearance links to other offices
- Enable/disable clearance links and regenerate tokens per office
- Add Board Exam / PRC clearance offices (Program Chair + College Dean) for eligible TOR requests
- Payment Monitor — view all billed requests and mark payments as Paid
- Clearance Tracking page — per-request clearance progress across all required offices
- Download printable PDF of request form
- Manage document types (add, edit, enable/disable, delete) with `doc_code` for ID generation

### Super Admin (all RO Staff features plus)
- Custom admin panel at `/admin`
- Create, edit, disable, and reset passwords for RO staff accounts
- View, disable/enable, reset password, and delete login access for student accounts while preserving request history
- Admin overview dashboard with system counts

### Clearance Offices (token link — no login required)
- View clearance request details: student name, document requested, office, request ID, date
- Upload e-signature image (JPG or PNG, max 5MB)
- Enter name and optional remarks, then confirm clearance
- Handles five link states: Valid Form, Already Cleared, Disabled, Invalid Link, Loading

## Workflow

```
Pending → For Validation → [Invalid Request]
                        → For Clearance → For Billing
                                       → For Payment → Paid
                                                     → For Processing
                                                     → For Printing
                                                     → For Release → Claimed
                                                                   → Shredded
[Rejected] — can occur at any active stage
```

### Status Reference

| Status | Terminal | Description |
|---|---|---|
| Pending | — | Initial submission received |
| For Validation | — | RO staff reviewing request details |
| Invalid Request | ✓ | Request cannot be processed |
| For Clearance | — | On hold pending office clearances |
| For Billing | — | Validated; awaiting billing by staff |
| For Payment | — | Billed; awaiting student payment |
| Paid | — | Payment confirmed; 7-working-day countdown starts |
| For Processing | — | Documents being prepared |
| For Printing | — | Documents being printed |
| For Release | — | Ready for student pickup |
| Claimed | ✓ | Documents collected |
| Shredded | ✓ | Unclaimed after 90 days — auto-triggered |
| Rejected | ✓ | Rejected by RO staff |

## Document Request No. Format

```
RO-[YYYY]-[MM]-[DOCCODE]-[NNN]

Example: RO-2026-06-TOR-001
```

- `YYYY` — year of submission
- `MM` — month of submission
- `DOCCODE` — document type code (e.g. TOR, HD, COE); `MULT` for multiple document types
- `NNN` — sequence number, zero-padded to 3 digits, resets monthly; extends to 4+ digits beyond 999

## Technology

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | Next.js 14 (TypeScript, App Router) | Vercel |
| Backend | Django 4.2 + Django REST Framework | Render |
| Database | PostgreSQL | Supabase |
| File Storage | Supabase Storage | Supabase |
| Scheduled Jobs | cron-job.org | cron-job.org |

## Repositories

| Repo | URL |
|---|---|
| Frontend | https://github.com/Karm101/special-project-im |
| Backend | https://github.com/Karm101/drms-backend |

## Run Locally

Both the backend and frontend must run simultaneously. The database and file
storage remain on Supabase — no local PostgreSQL setup is needed.

### Backend (Django)

```bash
git clone https://github.com/Karm101/drms-backend
cd drms-backend

python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

pip install -r requirements.txt
```

Create a `.env` file in the project root:

```
DATABASE_URL=[supabase postgresql connection string]
SECRET_KEY=[django secret key]
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
# Runs at http://localhost:8000
```

### Frontend (Next.js)

```bash
git clone https://github.com/Karm101/special-project-im
cd special-project-im

npm install
```

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_API_BASE=http://localhost:8000/api
NEXT_PUBLIC_SUPABASE_URL=https://tcmhiqicxadmljlivrcg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your supabase anon key]
```

```bash
npm run dev
# Runs at http://localhost:3000
```

Access points:

| Page | URL |
|---|---|
| Student Portal | http://localhost:3000 |
| Staff Login | http://localhost:3000/staff/login |
| Django Admin | http://localhost:8000/admin |

### Setup Notes

- Supabase Storage buckets `authorization-letters` and `clearance-signatures`
  must exist in your Supabase project before uploading files
- The cron jobs (`/api/admin/run-overdue/` and `/api/admin/run-shredded/`)
  require the `X-Cron-Secret` header and are only needed for automated
  triggers; they can be called manually for testing
- For testing from another device on the same network, run
  `npm run build && npm run start` and open the machine's local IPv4 address

## Automated Background Jobs

Two scheduled jobs run daily via cron-job.org and require no manual action.

| Job | Schedule (Asia/Manila) | Action |
|---|---|---|
| Overdue Check | Daily 00:00 | Marks `For Payment` requests as overdue if unpaid after 7 days |
| Shredded Check | Daily 00:05 | Marks `For Release` requests as Shredded if unclaimed after 90 days past expected claim date |

Both endpoints use `POST` and require the header `X-Cron-Secret: drms-cron-2026`.

## Important Note

DocuMon is an academic prototype developed for the Systems Analysis and Design
course at Mapua Malayan Colleges Mindanao. The current deployment uses free-tier
hosting (Vercel, Render, Supabase) which is not intended for institutional or
business use under standard terms of service. The Registrar's Office has
indicated plans to migrate to a paid, institution-managed hosting arrangement
prior to full production rollout.
