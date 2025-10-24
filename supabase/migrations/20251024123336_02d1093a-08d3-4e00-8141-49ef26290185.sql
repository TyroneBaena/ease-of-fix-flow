-- Add notification_settings column to profiles table
ALTER TABLE profiles
ADD COLUMN notification_settings JSONB DEFAULT jsonb_build_object(
  'emailNotifications', true,
  'pushNotifications', true,
  'smsNotifications', false,
  'appNotifications', true
);

-- Add comment to explain the column
COMMENT ON COLUMN profiles.notification_settings IS 'User notification preferences stored as JSON object with emailNotifications, pushNotifications, smsNotifications, and appNotifications boolean flags';

-- Create index for faster queries on notification settings
CREATE INDEX idx_profiles_notification_settings ON profiles USING gin(notification_settings);

-- Update existing profiles to have default notification settings
UPDATE profiles
SET notification_settings = jsonb_build_object(
  'emailNotifications', true,
  'pushNotifications', true,
  'smsNotifications', false,
  'appNotifications', true
)
WHERE notification_settings IS NULL;