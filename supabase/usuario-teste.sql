-- Conta de teste do app: eduardogomes509@gmail.com
-- Execute depois de supabase/schema.sql no SQL Editor do projeto.
-- A inserção em auth.users dispara criar_perfil_novo_usuario() e cria o perfil.
-- Este insert direto usa tabelas internas do Supabase Auth; para ambientes
-- permanentes, crie contas pelo Dashboard ou pela Auth Admin API em servidor.

do $$
declare
  test_user_id uuid := gen_random_uuid();
  test_email constant text := 'eduardogomes509@gmail.com';
begin
  if exists (select 1 from auth.users where email = test_email) then
    raise notice 'A conta % já existe; nenhuma alteração foi feita.', test_email;
    return;
  end if;

  insert into auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) values (
    test_user_id,
    test_email,
    extensions.crypt('J10259933j', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"eduardogomes509@gmail.com","display_name":"Eduardo Gomes","role":"operador"}'::jsonb
  );

  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    test_user_id::text,
    test_user_id,
    jsonb_build_object('sub', test_user_id::text, 'email', test_email),
    'email',
    now(),
    now(),
    now()
  );
end;
$$;

-- Confirme que o gatilho também criou o perfil público esperado.
select id, nome_usuario, nome_exibicao, perfil_acesso, ativo
from public.perfis
where nome_usuario = 'eduardogomes509@gmail.com';
