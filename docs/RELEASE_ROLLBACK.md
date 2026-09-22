# Release & Rollback — NestJourney

## Regra de promoção

1. desenvolvimento e revisão em branch.
2. PR para `main`.
3. obrigatoriamente passam `npm run check` e `npm run test:rules`.
4. PR de `main` para `production`.
5. `production` dispara autenticação Google Cloud, Quality e Firebase Hosting Deploy.
6. Firestore Rules são promovidas antes do frontend que depende delas.
7. o workflow só termina após smoke no host Firebase e em `https://nestjourney.millionsnest.com`.

## Rollback de frontend

O rollback deve usar o último commit de `production` conhecido como saudável. Criar uma branch a partir de `production`, reverter o merge problemático por commit, passar novamente todos os gates e promover o revert por PR.

Nunca corrigir produção por edição manual do Hosting.

## Rollback de Firestore Rules

As regras são versionadas junto ao aplicativo. Se uma regra bloquear um fluxo válido:
- restaurar a versão anterior de `firestore.rules` por revert;
- executar os testes positivos e negativos;
- promover a regra pelo mesmo workflow;
- não “resolver” incidentes abrindo leitura/escrita genérica ou removendo isolamento de tenant.

Mudanças de schema são aditivas e os eventos canônicos são append-only; rollback nunca apaga fatos.

## Checklist pós-release

- login direto e pelo Hub;
- CEO abre organizações sem membership local;
- troca de unidade mantém contexto;
- membro comum não abre diretório de Pessoas;
- Presença → Mesa → Cuidado → Casas → Raiz;
- Minha Jornada e Pulse;
- Safe Voice com identidade protegida;
- Intelligence sem insight sem evidência;
- PT-BR / EN / ES;
- mobile e desktop;
- domínio oficial retorna NestJourney e carrega Firebase config válida.

## Break-glass

Safe Voice usa capabilities separadas:
- `canManageSafeVoice`
- `canRevealSafeVoiceIdentity`

Revelação de identidade não é consequência de ser owner/admin comum. Superadmin/ecosystem owner funciona como break-glass e deve ser usado apenas quando a governança exigir.
