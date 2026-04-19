# AI HirePro Enterprise — Frontend

React 18 + Vite frontend with a custom dark-theme design system.

## Stack

- **React 18** with React Router v7
- **Vite** — dev server + production bundler
- **Tailwind CSS v4** — utility-first styling
- **Fonts** — Outfit (headings), Inter (body), JetBrains Mono (code)
- **Design** — CSS variables, stagger animations, glassmorphism panels

## Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | LandingPage | Public landing page |
| `/login` | Login | JWT authentication |
| `/register` | Register | User registration |
| `/dashboard` | Dashboard | Role-based redirect (Admin / User) |
| `/admin` | AdminPortal | Admin hub — JD upload, candidate management |
| `/candidates` | Candidates | OnboardGuard candidate list |
| `/upload-docs/:id` | UploadDocs | Document upload for a candidate |
| `/extract/:id` | Extract | Run extraction + build knowledge base |
| `/validate/:id` | Validate | Cross-reference validation |
| `/upload-form` | UploadForm | CSV onboarding import |
| `/interview/:id` | InterviewSession | AI voice interview (premium split-panel UI) |

## Key Components

- **InterviewSession** — Split-panel layout with circular SVG timer, question board dots, audio waveform, phase badges, ambient grid background
- **AdminDashboard** — Quick stats bar + candidate management + JD upload
- **UserDashboard** — Step indicator (resume → interview → results), resume upload, interview launcher

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # Production build → dist/
```

## Build

Last verified: **452 KB** gzipped (111 modules), zero errors.
