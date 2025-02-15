/*
  # Add last update tracking for GitHub users

  1. Changes
    - Add `last_contribution_update` column to `github_users` table
    - Set default value to current timestamp
    - Backfill existing rows with current timestamp

  2. Security
    - Maintain existing RLS policies
*/

-- Add last_contribution_update column
ALTER TABLE github_users 
ADD COLUMN IF NOT EXISTS last_contribution_update timestamptz DEFAULT now();

-- Update existing rows
UPDATE github_users 
SET last_contribution_update = last_updated 
WHERE last_contribution_update IS NULL;