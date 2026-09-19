# Step 1 — Database + Real Data Migration

## Status
- Production PostgreSQL/Supabase schema is already applied.
- Migration staging tables exist: migration_batches, migration_rows.
- Source traceability is required: file + sheet + row.
- Stock is derived from stock_movements; current stock is reconciliation-only.
- Weighted-average costing is the default until source evidence requires another method.
- Login/authentication is intentionally out of scope for Step 1.

## Source files
The three Excel workbooks are handled as immutable source material: Customer & Supplier Ledger.xlsx, HAMZA ELEC.xlsx, Ledger INVERTOR.xlsx.
Three Google Sheets are also part of the migration source set. They are not committed into GitHub because the repository is not a safe place for business data.

## Migration sequence
1. Create a migration batch.
2. Stage every source row as raw JSON with source file/sheet/row and a hash.
3. Normalize names only in normalized fields; never replace raw values.
4. Match products/customers/suppliers using normalized keys plus context.
5. Keep ambiguous matches in needs_review.
6. Convert stock history to stock movements; do not manufacture history from a current quantity.
7. Convert explicit ledger activity to customer/supplier ledger and journal entries where supported by the source.
8. Reconcile stock quantities/values and ledger balances against source values.
9. Only approved/reconciled rows move from staging into master/transaction tables.

## Safety
- No source workbook is modified.
- No migrated financial or stock transaction is hard-deleted.
- Duplicate source rows are identified by row fingerprint and migration batch.
- Conflicts preserve both source and ERP values in reconciliation records.
