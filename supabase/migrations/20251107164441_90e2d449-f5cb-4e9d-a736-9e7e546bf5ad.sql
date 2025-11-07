-- Drop the existing foreign key constraint
ALTER TABLE public.classes 
DROP CONSTRAINT IF EXISTS classes_trainer_id_fkey;

-- Add new foreign key constraint pointing to auth.users
ALTER TABLE public.classes
ADD CONSTRAINT classes_trainer_id_fkey 
FOREIGN KEY (trainer_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;