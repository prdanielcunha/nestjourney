# NestJourney — protocolo de release P0 (sem perda de dados)
> Estado: **NÃO AUTORIZADO PARA PRODUÇÃO**. Este roteiro não comprova exportação do banco nem teste de produção.
>
> Contrato de origem: \`NestJourney_Auditoria_Estrutura_Mestre_UX_UI_2026-10-11.docx\`, capítulos 14–18.

## Invariantes que não podem ser quebradas
1. Não substituir, truncar, mover nem apagar \`organizations/{orgId}/products/raiz_e_mesa\`. O nome do namespace é **alias legado**; nome público do produto é NestJourney.
2. Não gerar novo ID para pessoas históricas. \`personId\` é chave organizacional. Vínculos/fatos referenciam o registro canônico.
3. Identidade, billing e membership pertencem ao MillionsNest Hub; não alterar contratos de MusicScale, Connect ou NestFinance neste release.
4. Falta de verificação **não** é ausência; alteração de presença gera fato novo auditado. Famílias, status e importação não criam consentimento.
5. Voluntário não pode ler pastoral confidencial, relação familiar sem privilégio, nem dados de outra organização.
6. Novos recursos aditivos não fazem migração destrutiva; não ativar integrações de contato sem verificação no momento do envio **e dos retries**.
7. \`main\` é integração, \`production\` é a versão pública; qualquer divergência precisa de reconciliação revisada antes de deploy.
8. Nunca usar \`git push --force\`, \`git reset --hard\` na branch pública, \`firebase firestore:delete\` ou limpeza generalizada de coleções.

## Escopo aditivo da branch de trabalho
- \`people\`: campos opcionais \`preferredName\`, \`communityStatus\`, \`profileRevision\`, \`profileUpdatedAt/By\`, \`profileAuditId\`, \`importBatchId\` (sem sobrescrever histórico).
- \`families\` e \`familyEvents\`: declarações e alterações append-only sob autorização de administrador da igreja.
- \`presenceSessions\`: novos registros podem conter \`eligibilityVersion=1\`, \`eligiblePersonIds\` e \`eventTypeId\`; antigos seguem legíveis, mas não fornecem denominador individual verificável.
- \`audit\`: metadados de importação e edição de perfil sem nomes, números, mensagens ou notas privadas.
- \`care\`: rechecagem ao abrir o Connect; isso **não substitui** a checagem no serviço remetente a cada tentativa.

## Gate A — inventário, branches e backup comprovado
1. Em ambiente de trabalho autorizado: \`git fetch --no-tags origin main production\`.
2. Conferir \`git log --left-right --cherry-pick --oneline origin/production...origin/main\` e \`git diff --stat origin/production..origin/main\`; classificar cada commit exclusivo. **A última checagem mostrou as duas refs divergentes.**
3. Registrar SHAs de \`main\`, \`production\`, das Rules atuais e dos índices. Verificar configurações de Hosting, usuários e claims do Hub.
4. Administrador credenciado executa **exportação gerenciada do Firestore** para bucket privado com controle de acesso e retenção; documenta referência da operação, escopo e hora. Este passo exige acesso de infraestrutura e NÃO foi executado pelo assistente.
5. **Restaurar em projeto separado de homologação, com dados sintéticos/desidentificados quando cabível**, e comprovar leitura de pessoas, vínculos, sessões, care e aliases. Não usar produção para testar import/rollback.
6. Conferir \`firestore.rules\`, \`firestore.indexes.json\`, \`firebase.json\`, \`package-lock.json\` e políticas de acesso em commit imutável.

## Gate B — validação automática e revisão humana
- \`npm ci\`
- \`npm run check\` — lint, unit tests, TypeScript e bundle
- \`npm run test:rules\` — Firestore Emulator, tenant, permissões, auditorias e preservação de fatos
- \`npm run release:preflight\` — valida **somente** refs Git, worktree e referências de evidências; nenhum comando modifica branches ou banco
- QA com conta real de cada papel permitido: recepção, presença, cuidado, pastor, admin, CEO *sem vínculo com igreja*, org com e sem Raiz e Mesa e org sem assinatura.
- PWA iPhone pequeno/Android/desktop, PT/EN/ES, teclado, VoiceOver/TalkBack, sessão expirada, duas organizações, queda de conexão e retentativa.
- CRM manual: revogação antes de abrir Connect e antes de processar qualquer retry; validação **no Connect** é um bloqueador de lançamento de envios automatizados.
- Congelar a matriz de teste no PR com SHA, horário, ambiente, papéis, resultado e evidência. Revisão independente das Firestore Rules.

## Gate C — reconciliação e promoção
1. Abrir PR de reconciliação explicitando commits únicos das duas refs. Resolver conflitos preservando as duas linhas de mudança — **não usar force push**.
2. Fazer revisão de segurança, QA, regressões Hub e aprovar PR para \`main\`.
3. Revalidar SHA alvo. Preparar plano de reversão do bundle de Hosting e das Rules **separadamente**; Rules novas não devem depender de migração de dados.
4. Somente responsável autorizado promove para \`production\` após sucesso de Gates A/B e aceites explícitos; conferir SHA de deploy, erros, permissões, Firestore e console. Não habilitar migrações que apaguem dados.
5. Em incidente, restaurar o bundle/Rules anteriores compatíveis; **não substituir dados por backup antigo sobre dados novos**, pois isso pode apagar registros gerados após o backup. Recuperação granular exige procedimento de dados próprio.

## Checklist de impedimentos (bloqueiam release)
- [ ] Backup de dados e restauração de teste com evidência verificável.
- [ ] Reconciliação \`main\` x \`production\`, sem commits perdidos.
- [ ] QA autenticado real de perfis, mobile, idioma, offline e fluxo Raiz e Mesa antigo.
- [ ] Revisão independente da segurança e privacidade familiar/pastoral.
- [ ] Verificação de opt-out no serviço Connect no momento de **todo envio e retry**.
- [ ] Revisão LGPD jurídica antes de qualquer automação de contato, perfil religioso sensível, menores ou IA.
- [ ] Aceite operacional da igreja piloto e monitoramento pós-release.
- [ ] Evidências mínimas registradas no PR. Sem elas, não marcar “pronto para produção”.

## Preflight sem escrita
\`\`\`bash
git fetch --no-tags origin main production
NJ_BACKUP_REFERENCE="link-ou-id-do-backup-com-restauracao-testada" \
NJ_RULES_REVIEW_REFERENCE="link-da-revisao-independente" \
NJ_QA_REFERENCE="link-da-matriz-assinada" \
NJ_HUB_REGRESSION_REFERENCE="link-do-relatorio-hub" \
NJ_ROLLBACK_REFERENCE="link-do-ensaio-de-rollback" \
npm run release:preflight
\`\`\`
Referências são declarações do operador, **não verificação automatizada do conteúdo**. O script nunca promove produção.
