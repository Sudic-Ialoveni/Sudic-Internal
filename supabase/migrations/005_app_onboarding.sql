-- Mark existing users as having completed the app UI onboarding so they are not
-- forced through the product tour. New preference rows get the default from the API merge.
UPDATE public.user_preferences
SET preferences = COALESCE(preferences, '{}'::jsonb) || jsonb_build_object('app_onboarding_completed', true)
WHERE NOT (COALESCE(preferences, '{}'::jsonb) ? 'app_onboarding_completed');

