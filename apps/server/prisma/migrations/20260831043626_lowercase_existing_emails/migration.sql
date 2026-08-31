-- Normalize existing email addresses to lowercase.
--
-- `User.email` is `@unique` but the column is plain `text`, so uniqueness is
-- case-sensitive. From now on every write is lowercased by the Zod schema
-- (auth.schema.ts / lead.schema.ts) and the seed script; this migration brings
-- rows written before that change into line.
--
-- If two User rows differ only by letter case, the first statement fails on the
-- unique constraint — that is a genuine duplicate account to reconcile by hand.

UPDATE "User" SET email = lower(email) WHERE email <> lower(email);
UPDATE "Lead" SET email = lower(email) WHERE email <> lower(email);
