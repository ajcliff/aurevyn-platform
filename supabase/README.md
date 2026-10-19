# Database

`schema.sql` is a reference snapshot of the dev database: 117 tables, functions, triggers, row-level-security policies, storage policies and cron jobs.

It leaves out foreign keys, check constraints, indexes and all data, and uses placeholders (`<PROJECT_REF>`, `<ANON_KEY>`) where real project values were removed. Read it to understand the design; the running Supabase project is the source of truth.
