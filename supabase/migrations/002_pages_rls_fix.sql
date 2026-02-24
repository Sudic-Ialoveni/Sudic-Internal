-- Fix pages RLS so authenticated users can create/delete pages
-- Some Supabase setups treat auth.role() differently; auth.uid() IS NOT NULL is reliable for "logged-in user".

-- Allow insert when user is logged in (auth.uid() set)
CREATE POLICY "Pages insert when authenticated" ON pages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to delete their own pages
CREATE POLICY "Users can delete their own pages" ON pages
  FOR DELETE USING (auth.uid() = creator);
