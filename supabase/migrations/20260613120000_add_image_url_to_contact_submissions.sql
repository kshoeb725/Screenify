-- Add image_url column to contact_submissions table
ALTER TABLE public.contact_submissions ADD COLUMN IF NOT EXISTS image_url TEXT;
