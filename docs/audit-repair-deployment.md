# Audit repair — first batch

Fixes document chunking termination, missing NCR columns, misleading document
approval badges/identifiers, and false upload-success responses.

## Deployment order

1. Back up the target and verify its schema matches the audit snapshot:
   `document_chunks(document_id,user_id,chunk_index,content,file_name)`.
2. Apply only the new `20260922163518_repair_document_persistence.sql` through
   the deployment migration workflow. Do not reset production or blindly replay
   historical migrations: earlier Telegram/vector definitions conflict.
3. Deploy `parse-document` including its new `handler.ts` module.
4. Deploy the frontend. It requires `saved: true` and `documentId` from the API;
   deploying it before the function causes old responses to be rejected safely.
5. With a staging account, upload an Arabic UTF-8 TXT, confirm the document and
   chunks, create an NCR with batch fields, and check access from another user.

PDF, DOC/DOCX and XLS/XLSX uploads are intentionally unavailable in this batch.
Their previous extraction path mislabeled binary files as PDF and could persist
placeholder text. The selector and server now explain this restriction; existing
stored documents remain accessible. Reliable parsers are a separate follow-up.

## Verification completed

- Unit/integration suite, TypeScript, build, changed-file ESLint.
- Isolated PostgreSQL engine (PGlite), minimal matching document/NCR schema:
  migration applied twice; NULL/empty/1/50/200/2000/2001/5000 character texts;
  replacement without duplicate chunks; delete cascade; six NCR columns.
- This is not a full historical migration replay or live two-account RLS test.

## Remaining audit work

Server-verified HACCP/CAPA approval, migration history reconciliation, citrus
content validation, dependency upgrades, CI, and operational FSMS modules remain
open. Do not represent this batch as closure of the complete audit.

The public master list now says approval is unverified. That change does not
secure the separate HACCP/CAPA signature workflows.
