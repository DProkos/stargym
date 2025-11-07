-- Insert default email template for class deletion notifications
INSERT INTO public.email_templates (
  name,
  description,
  category,
  is_system,
  html_template
) VALUES (
  'class_deletion_notification',
  'Template για ειδοποιήσεις διαγραφής τάξεων που στέλνονται στους μαθητές',
  'notification',
  true,
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #d32f2f; margin-top: 0;">{{title}}</h2>
    <p style="color: #333; font-size: 16px; line-height: 1.6;">Αγαπητέ μέλος,</p>
    <p style="color: #333; font-size: 16px; line-height: 1.6;">{{intro_text}}</p>
    <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0;">
      <ul style="list-style-type: none; padding-left: 0; margin: 0;">
        {{class_list}}
      </ul>
    </div>
    <p style="color: #666; font-size: 15px; line-height: 1.6;">Λυπούμαστε για την αναστάτωση. Μπορείτε να κάνετε κράτηση σε άλλες διαθέσιμες τάξεις μέσω της πλατφόρμας μας.</p>
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <p style="color: #999; font-size: 14px; margin: 0;">Με εκτίμηση,</p>
      <p style="color: #333; font-size: 15px; font-weight: bold; margin: 5px 0;">Η ομάδα του γυμναστηρίου</p>
    </div>
  </div>
  <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
    Αυτό είναι ένα αυτοματοποιημένο email. Παρακαλούμε μην απαντήσετε.
  </p>
</div>'
) ON CONFLICT DO NOTHING;