# Arham Electronics ERP — Supabase Backend Setup

This project is moving from browser-only localStorage to a persistent PostgreSQL backend using Supabase.

## Safety
Do NOT import the original Excel/Google Sheet data yet. First create the database and verify the schema. Original source files must remain untouched.

## Setup
1. Create a Supabase PostgreSQL project.
2. Run `docs/SCHEMA.sql` in the Supabase SQL Editor.
3. Enable email/password authentication.
4. Create the first admin user and matching `profiles` row.
5. Add Row Level Security policies before production use.

## Security
Never put a Supabase service-role key in frontend code. The public anon key may be used by the frontend only with proper RLS policies.

## Migration order
1. Load raw source rows into `migration_rows`.
2. Normalize names.
3. Generate product/customer/supplier match candidates.
4. Review ambiguous matches.
5. Create master records.
6. Create opening stock and historical movements.
7. Create ledger transactions.
8. Reconcile source totals against ERP totals.

The current browser seed data is prototype data and is not authoritative historical data.
