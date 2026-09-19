# Backend Roadmap

## Phase A — Database foundation
- PostgreSQL/Supabase project
- Run `docs/SCHEMA.sql`
- Verify tables, views, indexes and functions
- Add RLS
- Create Admin profile

## Phase B — Application API/client
- Add Supabase client
- Authentication
- Session handling
- Role/permission checks
- Replace localStorage reads/writes with database operations

## Phase C — Transaction integrity
- Sales transaction: sale + items + stock movement + COGS + customer ledger + payment
- Purchase transaction: purchase + items + stock movement + supplier ledger + payment
- Returns and reversals
- Atomic invoice numbering
- Audit logging

## Phase D — Migration
- Import raw Excel/Google Sheet rows without changing originals
- Normalize and match entities
- Manual review queue
- Commit approved records
- Reconciliation

## Phase E — Production
- Reports
- Backup/restore
- Monitoring
- Error handling
- Security review
- Performance testing
- Multi-user testing
