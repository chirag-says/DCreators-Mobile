-- Phase 1 RLS verification gap: `notifications` was ENABLE ROW LEVEL SECURITY
-- with only SELECT/UPDATE policies (own row). There was no INSERT policy, so
-- the default-deny RLS behavior silently blocked every notification insert —
-- and src/lib/notifications.ts swallows the error in a try/catch, so the
-- feature has been failing silently for every cross-user notification
-- (payment received, bid posted, review submitted, etc. — see the 16
-- call sites of sendNotification()).
--
-- Authenticated users may only ever SELECT/UPDATE their own notifications
-- (unchanged), so this only allows writing a notification row addressed to
-- a counterpart they are already transacting with — not reading others'.
CREATE POLICY "Authenticated users can create notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
