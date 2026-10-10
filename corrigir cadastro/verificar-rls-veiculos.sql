select
  u.email,
  p.nome_usuario,
  p.perfil_acesso,
  p.ativo,
  has_table_privilege('authenticated', 'public.veiculos', 'INSERT') as tem_permissao_insert,
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'veiculos'
      and policyname = 'vehicles_manage_admin_supervisor'
  ) as politica_existe
from auth.users u
left join public.perfis p on p.id = u.id
where lower(u.email) = lower('eduardogomes509@gmail.com');
