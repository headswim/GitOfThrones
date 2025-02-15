/*
  # Add write policies for github_users and yearly_contributions

  This migration adds the necessary Row Level Security (RLS) policies to allow:
  1. Authenticated users to insert and update their own data
  2. The application to write data through the anon key
*/

-- Allow anon writes to github_users
CREATE POLICY "Allow anon writes to github_users"
  ON github_users
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon updates to github_users"
  ON github_users
  FOR UPDATE
  TO anon
  USING (true);

-- Allow anon writes to yearly_contributions
CREATE POLICY "Allow anon writes to yearly_contributions"
  ON yearly_contributions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon updates to yearly_contributions"
  ON yearly_contributions
  FOR UPDATE
  TO anon
  USING (true);