-- Execute no SQL Editor do mesmo projeto Supabase configurado no app.
-- Promove a conta para supervisor e repara a política de cadastro de veículos.

update public.perfis
set perfil_acesso = 'supervisor', ativo = true
where lower(nome_usuario) = lower('eduardogomes509@gmail.com');

grant select, insert, update on public.veiculos to authenticated;

drop policy if exists vehicles_manage_admin_supervisor on public.veiculos;
create policy vehicles_manage_admin_supervisor on public.veiculos
for all to authenticated
using ((select public.usuario_eh_admin_ou_supervisor()))
with check ((select public.usuario_eh_admin_ou_supervisor()));

-- Confirme que a conta foi encontrada e está como supervisor.
select nome_usuario, perfil_acesso, ativo
from public.perfis
where lower(nome_usuario) = lower('eduardogomes509@gmail.com');
