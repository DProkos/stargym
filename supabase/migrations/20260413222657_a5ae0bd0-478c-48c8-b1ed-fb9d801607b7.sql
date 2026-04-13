
-- Prevent duplicate bookings: same user, same class, same date
CREATE UNIQUE INDEX idx_unique_booking_per_user_class_date 
ON public.bookings (user_id, class_id, booking_date) 
WHERE status != 'cancelled';
