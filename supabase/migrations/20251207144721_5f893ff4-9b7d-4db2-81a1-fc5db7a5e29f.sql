-- Add multilingual support to page_sections
ALTER TABLE public.page_sections 
ADD COLUMN title_en text,
ADD COLUMN title_el text,
ADD COLUMN subtitle_en text,
ADD COLUMN subtitle_el text,
ADD COLUMN content_en text,
ADD COLUMN content_el text;

-- Copy existing data to Greek fields as default
UPDATE public.page_sections 
SET title_el = title,
    subtitle_el = subtitle,
    content_el = content,
    title_en = title,
    subtitle_en = subtitle,
    content_en = content;