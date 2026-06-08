# Database Migrations

This folder tracks data migrations required to keep the MongoDB schema in sync with the codebase.

## How to use

1. Each time a schema is significantly altered (e.g., adding required fields, changing relationships), create a new script sequentially named (e.g., `02_add_new_feature_fields.js`).
2. Make sure the script uses the Node MongoDB driver directly (or Mongoose) to iterate over collections and update documents safely.
3. Keep track of which migrations have been run manually or in your CI/CD pipeline.

## History

* `01_add_fee_and_code_to_classes.js`: (June 2026) Normalizes legacy `ACADEMIC_CLASSES` by adding missing `monthlyFee`, `admissionFee` and sequential `classCode` integers.
