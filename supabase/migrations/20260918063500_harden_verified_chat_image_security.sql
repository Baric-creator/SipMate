-- Tighten privileges for the trigger-only chat image guard.
revoke execute on function public.protect_chat_image_message_insert() from public;
revoke execute on function public.protect_chat_image_message_insert() from anon;
revoke execute on function public.protect_chat_image_message_insert() from authenticated;
