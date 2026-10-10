# Documento de Requisitos — Sistema de Inspeção e Manutenção da Frota

## Configuração do Supabase

1. Execute [`supabase/schema.sql`](supabase/schema.sql) no SQL Editor do projeto Supabase.
2. Em `supabase-config.js`, preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY` com a URL e a chave pública (anon/publishable) do projeto. Nunca use a chave `service_role` no navegador.
3. Publique os arquivos em um servidor HTTP/HTTPS (abrir `index.html` via `file://` não é suportado).
4. O app autentica pelo Supabase Auth e consulta o perfil em `public.perfis`. Como a interface pede nome de usuário, a autenticação usa o endereço interno `<usuario em minúsculas>@fleet.local`; configure o projeto para não exigir confirmação por e-mail para esse fluxo, ou implemente um fluxo de convite/recuperação com endereço real.
5. Cadastre veículos diretamente em `public.veiculos` por um usuário administrador/supervisor. O cliente lista veículos ativos; a política RLS do esquema bloqueia cadastro por outros perfis.

Para criar a conta de demonstração no SQL Editor, execute [`supabase/usuario-teste.sql`](supabase/usuario-teste.sql) depois do esquema. Entre usando o e-mail `eduardogomes509@gmail.com` e a senha informada para teste.

O navegador grava inspeções em `inspecoes`, respostas em `resultados_checklist`, anexos em `fotos_inspecao` e arquivos no bucket privado `inspection-evidence`. Itens “Não OK” também criam uma linha em `solicitacoes_manutencao`. Não há armazenamento local de senhas.

Observação: gerenciamento administrativo de contas Auth (criar usuário, redefinir senha e desativar login) precisa ser implementado por função de servidor usando a Admin API do Supabase. O cliente não expõe esse fluxo para evitar colocar credenciais privilegiadas no navegador.

## 1. Objetivo
O presente documento estabelece os requisitos funcionais para o desenvolvimento de um sistema de inspeção e manutenção da frota, com foco no controle de checklists de caminhões, registro de ocorrências, acompanhamento de manutenção e geração de relatórios.

## 2. Escopo
O sistema deve permitir:
- registrar inspeções realizadas em veículos;
- identificar irregularidades e registrar ocorrências;
- acompanhar solicitações de manutenção;
- manter histórico de inspeções e intervenções;
- controlar o cadastro de veículos e usuários;
- gerar relatórios gerenciais e operacionais.

## 3. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite |
|---|---|---|---|
| RF01 | O sistema deve permitir que o operador registre o checklist do veículo, incluindo verificação de nível de óleo, nível do líquido de arrefecimento, condições dos pneus e demais itens definidos como obrigatórios. | Alta | Ao final da inspeção, todos os itens obrigatórios devem estar preenchidos e o sistema deve impedir a conclusão quando houver campo obrigatório em branco. |
| RF02 | O sistema deve permitir registrar a identificação do veículo inspecionado. | Alta | O operador deve selecionar ou informar o veículo antes do início do checklist. |
| RF03 | O sistema deve permitir registrar a data, a hora e o responsável pela inspeção. | Alta | Esses dados devem ficar vinculados ao registro da inspeção e ser exibidos no histórico. |
| RF04 | O sistema deve permitir registrar observações e descrições sobre irregularidades identificadas durante a inspeção. | Alta | O operador deve poder informar detalhes da falha ou condição detectada. |
| RF05 | O sistema deve permitir registrar uma ocorrência de manutenção quando qualquer item do checklist for classificado como Não OK. | Alta | Ao marcar um item como “Não OK”, o sistema deve criar ou vincular uma solicitação de manutenção ao veículo. |
| RF06 | O sistema deve permitir que o responsável pela manutenção visualize as solicitações em aberto. | Alta | As solicitações pendentes devem ser listadas de forma acessível para o responsável. |
| RF07 | O sistema deve permitir alterar o status da solicitação de manutenção para Aberta, Em manutenção e Concluída. | Alta | O responsável deve conseguir atualizar o status e o sistema deve registrar o histórico da alteração. |
| RF08 | O sistema deve permitir registrar os serviços executados durante a manutenção do veículo. | Média | Ao concluir a manutenção, o responsável deve informar o serviço realizado e o resultado da correção. |
| RF09 | O sistema deve permitir consultar o histórico de checklists realizados para cada veículo. | Média | Ao selecionar um veículo, o usuário deve visualizar os registros anteriores de inspeção. |
| RF10 | O sistema deve permitir consultar o histórico de manutenções realizadas em cada veículo. | Média | O usuário deve acessar o histórico de intervenções vinculadas ao veículo. |
| RF11 | O sistema deve permitir que o supervisor acompanhe os checklists realizados e as irregularidades identificadas. | Alta | O supervisor deve visualizar os registros e os itens marcados como “Não OK”. |
| RF12 | O sistema deve permitir gerar relatórios de checklists e manutenções realizadas na frota. | Média | Usuários autorizados devem conseguir gerar relatórios por período, veículo, responsável ou status. |
| RF13 | O sistema deve permitir cadastrar, editar e inativar veículos da frota. | Alta | Usuários autorizados devem manter o cadastro dos veículos atualizado e consistente. |
| RF14 | O sistema deve permitir cadastrar usuários e definir perfis de acesso. | Alta | O administrador deve criar usuários e atribuir permissões conforme o perfil do cargo; operadores e motoristas podem criar a própria conta no primeiro acesso. |
| RF15 | O sistema deve alertar o responsável quando uma inspeção identificar irregularidade que exija manutenção. | Alta | Ao registrar uma condição “Não OK”, o sistema deve gerar notificação ou pendência para o responsável designado. |

## 4. Regras de Negócio
- Todo item obrigatório deve possuir resposta válida antes do envio do checklist.
- Itens marcados como Não OK devem gerar uma ocorrência de manutenção vinculada ao veículo.
- O status da manutenção deve ser rastreado por histórico de alterações.
- O supervisor deve ter acesso ao acompanhamento das inspeções e das pendências.
- Somente usuários autorizados podem cadastrar, editar ou inativar veículos e usuários.
- No primeiro acesso, operadores e motoristas podem criar uma conta local; o cadastro não cria perfis administrativos.

## 5. Critérios de Aceitação Gerais
- O sistema deve registrar todas as inspeções com data, hora e responsável.
- O cadastro de veículos e usuários deve ser mantido de forma segura e rastreável.
- O histórico de inspeções e manutenções deve ser consultável por veículo.
- Não conformidades devem gerar pendência para correção e acompanhamento.
- Os relatórios devem refletir corretamente os dados registrados no sistema.

## 6. Observações
Este documento serve como base para análise, desenvolvimento e validação funcional do sistema, podendo ser ajustado conforme regras operacionais da frota, políticas internas e requisitos específicos do cliente.

## 7. Conclusão
O sistema proposto visa garantir segurança operacional, rastreabilidade das inspeções e controle eficiente da manutenção preventiva e corretiva da frota, reduzindo riscos de falhas e melhorando a organização da gestão de veículos.
