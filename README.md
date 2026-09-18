# Arham Electronics ERP

Modern ERP foundation for Arham Electronics.

## Source data
The original Google Sheets remain untouched. They are treated as source-of-truth migration inputs and are not stored in this repository.

## ERP principles
- Stock is maintained as immutable movement transactions.
- Sales, purchases, returns and payments update ledgers through transactions.
- Financial/stock records are reversed/cancelled rather than hard-deleted.
- Historical data is preserved.
- Ambiguous duplicate mappings go to manual review.
- Role-based access, audit logs, reconciliation and backups are planned into the architecture.

## Current stage
Phase 1: ERP application shell + migration-ready data model.

Phase 2: import/audit the three source spreadsheets and reconcile opening balances.

Phase 3: persistent database/API, authentication, invoices, reports and production deployment.

## Important
Do not commit passwords, API keys, service-account JSON files, or private spreadsheet exports to GitHub.
