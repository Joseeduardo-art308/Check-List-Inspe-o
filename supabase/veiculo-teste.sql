-- Cadastra/reativa o veículo de teste usado pelo checklist.
insert into public.veiculos (identificacao)
values ('OGT-8896')
on conflict (identificacao) do update set ativo = true;

select id, identificacao, ativo
from public.veiculos
where identificacao = 'OGT-8896';
