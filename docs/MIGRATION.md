# Migration design

1. Import every source workbook into a staging layer without changing values.
2. Detect headers, transaction rows, blank/template rows and anomalous dates.
3. Normalize names for matching while preserving the original source value.
4. Match products by normalized name + brand, then review conflicts.
5. Match customers/suppliers by normalized name, phone/address where available, and ledger context.
6. Preserve each source row with source_file, source_sheet and source_row.
7. Create opening balances only where the source establishes an opening/current balance; do not manufacture transactions.
8. Convert explicit stock movements to inventory movements. Current stock quantities are reconciliation targets, not substitutes for history.
9. Reconcile ERP closing stock and ledgers against source totals before activation.
10. Keep uncertain records in manual review.

## Costing
Historical inventory costing should be derived from purchase/stock-in history. Weighted-average cost is the initial implementation default; any source-specific costing evidence should override it after review.

## Data quality flags
Flag future-dated records, impossible/ambiguous dates, duplicate normalized names, duplicate product descriptions, mismatched stock totals, and ledger balances that do not equal opening + debits - credits under the source's sign convention.
