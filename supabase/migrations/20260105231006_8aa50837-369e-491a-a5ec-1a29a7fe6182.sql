-- Drop the old check constraint that doesn't include 'pending' and 'rejected'
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add new check constraint that includes all valid status values
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'confirmed', 'cancelled', 'rejected', 'completed'));