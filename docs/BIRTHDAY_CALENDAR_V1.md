# NestJourney — Calendário de aniversários v1 (18/10/2026)

## Objetivo
Celebrar pessoas sem inferir idade, vender dados ou criar mais uma lista operacional esquecida.

## Entregas implementadas na branch
- Rota /birthdays: calendário mensal responsivo, pesquisa, próximos aniversários, destaques para hoje e próximos sete dias, troca de congregação.
- Atalho em Pessoas e navegação desktop.
- Gestores selecionam pessoa já existente, dia e mês. Não exige ano de nascimento.
- A autorização para armazenar a data é afirmada explicitamente no cadastro. A autorização para divulgar à equipe é independente, opcional e vem desligada.
- Dados privados só ficam disponíveis a gestão autorizada; equipe com permissão de Pessoas vê apenas aniversários publicados para sua congregação.
- Exportação individual .ics para Apple/Outlook e link Google Agenda. Exportações são iniciadas pelo usuário; não há sincronização automática.
- Para 29 de fevereiro, a política é comemorar em 28 de fevereiro nos anos não bissextos. O arquivo ICS gerará datas explícitas por 40 anos.

## Dados e segurança
Coleção: organizations/{orgId}/products/raiz_e_mesa/personBirthdays/{personId}. O ID refere-se à pessoa cadastrada na igreja; os campos contêm day, month, shareWithTeam, controle de autorização, trilha de operação e escopo. Sem nascimento completo, telefone, notas pastorais, filiação religiosa explícita ou mensagens.

Permissões: owner/admin/pastor/data_admin da organização. Equipe autorizada a gerenciar Pessoas somente pode ler registros com shareWithTeam=true no escopo do local. CEO global isoladamente não adquire direito de ver aniversários.

Gravação em transação verifica a pessoa original e grava audit imutável; auditoria não copia a data de nascimento. A remoção elimina a data desta coleção e registra operação de remoção sem dados de aniversário. Cópias que o usuário tenha exportado para uma agenda pessoal não podem ser removidas remotamente.

## Integrações futuras — não implementadas na v1
- Preferências de lembretes no aplicativo e integração com o Connect, com opt-in e sem dados pessoais no push.
- OAuth para sincronização contínua Google/Microsoft, com tokens no backend, revogação e deduplicação.
- Integração cross-app somente por API de propósito específico autorizada no Hub; jamais liberar query direta à coleção pessoal da igreja.
- Comunicação de aniversário pelo WhatsApp somente com consentimento separado para a finalidade.
- Controle explícito de compartilhamento ao membro mediante portal opcional.

## Comercialização
É viável vender o uso do módulo SaaS de celebrações por organização e recursos de integração. Não vender contatos, cadastros, aniversários ou perfis individualizados. Formalizar controlador/operador, finalidades, retenção e direitos dos titulares.

## Ordem de publicação
O repositório MillionsNest é dono canônico de Rules/índices Firestore. Primeiro revisar, testar e implantar o PR de Rules com revisão independente e testes de emulador. Depois promover frontend NestJourney com npm run check, npm run test:rules e smoke de usuários autorizados/não autorizados. Evitar liberar interface com escrita antes da política do backend estar vigente. Sem migração destrutiva nem serviços pagos adicionais.
