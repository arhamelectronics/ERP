# Arham Electronics ERP

Migration-ready ERP foundation for Arham Electronics.

## Source data protection
The three original Excel/Google Sheets remain untouched and are never committed to this repository.

## Migration pipeline
Source files -> audit -> normalization -> duplicate review -> reconciliation -> central database -> ERP.

Historical source row references and original values must be retained. Ambiguous matches go to manual review. Stock is represented as movement transactions. Financial/stock records are cancelled or reversed rather than hard-deleted.

## Phase 1 audit findings
- Customer & Supplier Ledger.xlsx: 39 sheets; multiple customer/supplier ledgers with Debit/Credit/Balance structures.
- HAMZA ELEC.xlsx: Stock and stock in sheets; 152/153 product rows with 121 unique normalized item names in each sheet.
- Ledger INVERTOR.xlsx: 21 sheets; overlapping customer/invoice ledgers.
- Source data contains duplicate/overlapping names and inconsistent spellings/structures; these require controlled mapping rather than blind merging.

See docs/MIGRATION.md for mapping rules.
