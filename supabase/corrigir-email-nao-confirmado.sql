-- Corrige a conta de teste quando o Supabase Auth retorna "Email not confirmed".
update auth.users
set email_confirmed_at = now(),
    updated_at = now()
where lower(email) = lower('eduardogomes509@gmail.com');

-- O resultado precisa mostrar email_confirmed_at preenchido.
select id, email, email_confirmed_at, confirmed_at
from auth.users
where lower(email) = lower('eduardogomes509@gmail.com');
