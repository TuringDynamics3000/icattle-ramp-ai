# iCattle Ramp AI

**Automated livestock capture, ID, and welfare scoring at feedlot/saleyard ramps**

---

## Product Overview

iCattle Ramp AI is a ramp-centric SaaS product for Australian feedlots and saleyards that:

- **Captures** every animal over the ramp via smartphone or fixed cameras
- **Identifies** animals using iCattle Digital ID and NLIS tags
- **Scores** welfare metrics (lameness, body condition, tick burden)
- **Exports** NLIS-ready movement records and compliance reports
- **Verifies** critical events on RedBelly blockchain via TuringCore Protocol

---

## Key Features

### For Ramp Operators
- ✅ Hit record, do your job, trust the system logs everything
- ✅ Minimal taps while under time pressure
- ✅ Offline-tolerant capture with queue/retry

### For Operations Managers
- ✅ Daily/weekly view of runs, counts, and welfare issues
- ✅ Evidence for NLIS compliance and welfare audits
- ✅ "What went over the ramp yesterday?" in seconds

### For Auditors / Banks / Processors
- ✅ Verifiable records for specific runs/lots
- ✅ Cryptographic proof via RedBelly blockchain
- ✅ iCattle Verified pack with on-chain reference

---

## Architecture

```
┌─────────────────┐
│  Ramp AI App    │  React + TypeScript + tRPC
│  (Web/Mobile)   │  PWA for mobile compatibility
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TuringCore API │  Python FastAPI
│  (Protocol)     │  RedBelly integration
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  RedBelly       │  Blockchain anchoring
│  (Testnet)      │  Cryptographic proofs
└─────────────────┘
```

---

## Tech Stack

**Frontend:**
- React 19 + TypeScript
- Tailwind CSS 4
- tRPC for type-safe API
- Wouter for routing
- shadcn/ui components

**Backend:**
- Node.js 22 + Express
- tRPC 11 server
- PostgreSQL (TuringCore)
- Drizzle ORM

**Integration:**
- TuringCore Protocol API
- RedBelly blockchain (testnet)
- CV service (animal detection, welfare scoring)

---

## Getting Started

### Prerequisites
- Node.js 22+
- pnpm 9+
- PostgreSQL 14+
- TuringCore API access

### Installation

```bash
# Clone repository
git clone https://github.com/TuringDynamics3000/icattle-ramp-ai.git
cd icattle-ramp-ai

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your TuringCore API credentials

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

### Development

```bash
# Start dev server (frontend + backend)
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Preview production build
pnpm preview
```

---

## Project Structure

```
icattle-ramp-ai/
├── client/              # Frontend React app
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable UI components
│   │   ├── lib/         # Utilities and tRPC client
│   │   └── hooks/       # Custom React hooks
│   └── public/          # Static assets
├── server/              # Backend tRPC server
│   ├── routers.ts       # API routes
│   ├── db.ts            # Database queries
│   └── _core/           # Framework plumbing
├── drizzle/             # Database schema & migrations
├── shared/              # Shared types & constants
└── docs/                # Documentation
```

---

## Core Workflows

### 1. Create Run
Operator creates new run with type (incoming/outgoing), site, and metadata.

### 2. Capture Video
Operator records video via phone camera or selects fixed camera feed.

### 3. CV Analysis
Computer vision service detects animals, links IDs, scores welfare metrics.

### 4. Review & Correct
Operator reviews detections, makes minimal corrections (false positives, NLIS IDs).

### 5. Confirm Run
Operator confirms run, triggering NLIS export and RedBelly notarisation.

### 6. Export & Verify
System generates NLIS file and run report with blockchain verification.

---

## Integration with TuringCore

### Event Types
- `icattle.ramp_run_started`
- `icattle.animal_seen_at_ramp`
- `icattle.cattle_movement_recorded` ⚡ **Critical (Rule 12)**
- `icattle.health_event_recorded` ⚡ **Critical (Rule 12)**
- `icattle.ramp_run_completed`
- `icattle.nlis_export_generated`

### RedBelly Anchoring
Critical events (`cattle_movement_recorded`, `health_event_recorded`) are:
- Passed through Protocol enforcement decorator
- Notarised to RedBelly blockchain (testnet)
- Stored in `redbelly_commitments` table
- Queryable via ProofService for verification badges

---

## NLIS Compliance

### Export Format
NLIS-compatible movement file per current spec:
- Animal NLIS IDs
- Movement dates and times
- Source and destination PICs
- Head count and lot numbers

### Manual Upload (V1)
Operator downloads NLIS file and manually uploads to NLIS portal.

### Future: Direct API
Direct integration with NLIS API for automated submission.

---

## Deployment

### Development
```bash
pnpm dev
```

### Staging
```bash
pnpm build
pnpm preview
```

### Production
Deploy to Manus hosting or any Node.js hosting platform:
- Vercel
- Railway
- Render
- AWS/GCP/Azure

---

## Roadmap

### V1 (MVP) - Current
- ✅ Phone capture only
- ✅ NLIS file export (manual upload)
- ✅ RedBelly testnet anchoring
- ✅ Basic run history and reports

### V2 (Future)
- 🔄 Fixed camera capture with calibration
- 🔄 Direct NLIS API integration
- 🔄 Lender/processor dashboards
- 🔄 Mainnet RedBelly anchoring
- 🔄 Integration with AgriWebb/Mobble

---

## Contributing

This is a private repository for Turing Dynamics internal development.

---

## License

Proprietary - All rights reserved

---

## Support

For support, contact: support@turingdynamics.com

---

## Links

- **GitHub:** https://github.com/TuringDynamics3000/icattle-ramp-ai
- **TuringCore:** https://github.com/TuringDynamics3000/TuringCore-v3
- **Documentation:** [Coming soon]

---

**Built with ❤️ by Turing Dynamics**
