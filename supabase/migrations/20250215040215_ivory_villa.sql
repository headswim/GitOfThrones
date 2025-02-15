/*
  # Create contributions tables

  1. New Tables
    - `github_users`
      - `username` (text, primary key)
      - `avatar_url` (text)
      - `total_contributions` (integer)
      - `last_updated` (timestamptz)
    - `yearly_contributions`
      - `id` (uuid, primary key)
      - `username` (text, foreign key)
      - `year` (integer)
      - `contributions` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for public read access
*/

-- Create github_users table
CREATE TABLE IF NOT EXISTS github_users (
  username text PRIMARY KEY,
  avatar_url text NOT NULL,
  total_contributions integer NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now()
);

-- Create yearly_contributions table
CREATE TABLE IF NOT EXISTS yearly_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL REFERENCES github_users(username) ON DELETE CASCADE,
  year integer NOT NULL,
  contributions jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(username, year)
);

-- Enable RLS
ALTER TABLE github_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE yearly_contributions ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to github_users"
  ON github_users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to yearly_contributions"
  ON yearly_contributions
  FOR SELECT
  TO public
  USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS yearly_contributions_username_year_idx 
  ON yearly_contributions(username, year);