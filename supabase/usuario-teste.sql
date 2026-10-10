-- Conta de teste do app: eduardogomes509@gmail.com
-- Execute depois de supabase/schema.sql no SQL Editor do projeto.
-- A inserção em auth.users dispara criar_perfil_novo_usuario() e cria o perfil.
-- Este insert direto usa tabelas internas do Supabase Auth; para ambientes
-- permanentes, crie contas pelo Dashboard ou pela Auth Admin API em servidor.

do $$
declare
  test_user_id uuid;
  test_email constant text := 'eduardogomes509@gmail.com';
begin
  select id into test_user_id from auth.users where email = test_email;

  -- Reaproveita a conta do teste anterior, caso ela já tenha sido criada.
  if test_user_id is null then
    select id into test_user_id from auth.users where email = 'eduardogomes@gmail.com';
  end if;

  if test_user_id is null then
    test_user_id := gen_random_uuid();
    insert into auth.users (
      id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data
    ) values (
      test_user_id,
      test_email,
      extensions.crypt('J10259933j', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"eduardogomes509@gmail.com","display_name":"Eduardo Gomes","role":"operador"}'::jsonb
    );
  else
    update auth.users
    set email = test_email,
        encrypted_password = extensions.crypt('J10259933j', extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        raw_user_meta_data = '{"username":"eduardogomes509@gmail.com","display_name":"Eduardo Gomes","role":"operador"}'::jsonb,
        updated_at = now()
    where id = test_user_id;
  end if;

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
    jsonb_build_object('sub', test_user_id::text, 'email', test_email, 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  ) on conflict (provider_id, provider) do update
    set user_id = excluded.user_id,
        identity_data = excluded.identity_data,
        updated_at = now();

  insert into public.perfis (id, nome_usuario, nome_exibicao, perfil_acesso, ativo)
  values (test_user_id, test_email, 'Eduardo Gomes', 'operador', true)
  on conflict (id) do update
    set nome_usuario = excluded.nome_usuario,
        nome_exibicao = excluded.nome_exibicao,
        perfil_acesso = excluded.perfil_acesso,
        ativo = true;
end;
$$;

-- Confirme que o gatilho também criou o perfil público esperado.
select id, nome_usuario, nome_exibicao, perfil_acesso, ativo
from public.perfis
where nome_usuario = 'eduardogomes509@gmail.com';
