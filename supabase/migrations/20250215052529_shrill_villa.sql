/*
  # Fix contribution update timestamps

  1. Changes
    - Ensure last_contribution_update has NOT NULL constraint
    - Set default value to now()
    - Update any NULL values to match last_updated
*/

-- Ensure the column is NOT NULL and has a default
ALTER TABLE github_users 
ALTER COLUMN last_contribution_update SET NOT NULL,
ALTER COLUMN last_contribution_update SET DEFAULT now();

-- Update any records where last_contribution_update might be incorrect
UPDATE github_users 
SET last_contribution_update = last_updated 
WHERE last_contribution_update > last_updated;