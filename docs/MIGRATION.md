# Source Data Migration Plan

The three original Google Sheets must remain unchanged.

Pipeline:

Google Sheets
-> Audit
-> Header/column detection
-> Product/customer/supplier normalization
-> Duplicate detection
-> Opening balance and stock reconciliation
-> Transaction mapping
-> Central database
-> ERP

For every source row we preserve:
- source file
- source sheet
- source row/reference
- original values
- mapped ERP record
- migration status
- review reason when ambiguous

Inventory uses movement records rather than overwriting a stock quantity.

Costing will use historical transaction data. Weighted-average costing is the initial default, subject to confirmation from the source records.

## Blocker for automatic source audit
The Google Sheets are shared publicly, but the current runtime cannot directly read Google Sheets cell data. Once the three spreadsheets are available as XLSX/CSV uploads or through an authorized Sheets connector, the importer can perform the real audit without modifying the originals.
