update public.perfis as p
set perfil_acesso = 'supervisor',
    ativo = true
from auth.users as u
where u.id = p.id
  and lower(u.email) = lower('eduardogomes509@gmail.com')
returning p.nome_usuario, p.perfil_acesso, p.ativo;
