# Auditoria do roadmap — Raiz e Mesa

Data da revisão: 2 de setembro de 2026.

## Escopo revisado

Esta matriz compara o produto com o Blueprint do Aplicativo, Manual Mestre, Manual de Implantação em 7 Semanas e os manuais de Presença, Mesa Aberta, Cuidado e Conexão, Casa de Paz e Raiz. Também incorpora as decisões da conversa: SaaS vendável, repositório público, multi-tenant, integração com o ecossistema MillionsNest/Firebase e identidade dark baseada na marca Raiz e Mesa.

## Matriz de cobertura

| Área | Requisito consolidado | Evidência no produto | Situação |
|---|---|---|---|
| SaaS | Qualquer igreja, unidades e nomes próprios | Organização, congregações, cores e nomenclaturas configuráveis | Implementado |
| Ecossistema | Conta e organização compartilhadas no MillionsNest | Namespace `organizations/{orgId}/products/raiz_e_mesa`, associações canônicas e entitlement do app | Preparado; ativação depende do Firebase compartilhado |
| Implantação | Ciclo completo de 7 semanas | 7 semanas, tarefas, prática real, ritmo de 40–45 min e progresso persistido | Implementado |
| Presença | Primeira visita, retorno e anfitrião de vínculo | Registro rápido e histórico por pessoa, data, tipo, unidade, anfitrião e Mesa | Implementado |
| Mesa Aberta | Convite sem pressão e participação simples | Indicadores de convite/participação, linguagem de hospitalidade e ausência de avaliação subjetiva | Implementado |
| Pessoas | Cadastro mínimo, unidade, primeira visita, responsável e próximo passo | Cadastro com consentimento opcional, jornada, filtros, busca e painel individual | Implementado |
| Cuidado | Contato em aproximadamente 24h, máximo 48h | Pendências, prazo, responsável, conclusão e próxima ação | Implementado |
| Cuidado | Scripts e revisão semanal de 20 min | Quatro scripts oficiais, agenda 0–20 min e alerta de encaminhamento imediato | Implementado |
| Segurança humana | Encaminhar risco, violência, abuso e emergência | Alerta explícito sem campo para detalhes íntimos | Implementado |
| Casas | Líder, anfitrião, aprendiz, bairro, dia, hora e capacidade | Cartões de Casa com composição completa e alerta de capacidade | Implementado |
| Casas | Ideal 6–10, máximo 12 | Políticas de capacidade, alertas e testes automatizados | Implementado |
| Casas | Pedidos de entrada | Fila, situação e conexão à Casa | Implementado |
| Casas | Relatório mínimo de encontro | Data, presentes, novos, autorizações, marcador pastoral e nota operacional | Implementado |
| Raiz | Relação 1:1, sete encontros e próximo encontro | Acompanhamentos, mapa dos 7 temas, progresso e conclusão | Implementado |
| Raiz | Ideal 2, máximo inicial 3 por discipulador | Painel de carga e teste de política | Implementado |
| Pastoral | Saúde sem ranking ou “nível espiritual” | Indicadores agregados, atenção, encaminhamentos restritos e carga de cuidado | Implementado |
| Perfis | Pastor, coordenação, cuidado, Casa, discipulador e dados | Navegação por papel, escopo por congregação e regras RBAC | Implementado |
| LGPD | Minimização e consentimento revogável | Contato omitido sem consentimento, revogação com limpeza do telefone e trilha de ação | Implementado |
| LGPD | Correção, exclusão e retenção | Solicitações administrativas com estados e auditoria | Implementado |
| Auditoria | Histórico imutável e marcador pastoral restrito | Eventos na interface; regras Firestore impedem alteração/remoção e restringem pastoral | Implementado |
| Alertas | Prazos, capacidade e sobrecarga | Notificações discretas, cartões de atenção e painéis de carga | Implementado |
| PWA | Mobile-first e instalável | Manifesto, service worker, ícones de marca e layouts responsivos | Implementado |
| Marca | Interface dark com ouro/oliva da logo | Tokens dark, marca nas áreas principais, favicon e ícone PWA | Implementado |
| Qualidade | Proteção contra regressões | Lint, TypeScript, build, testes de domínio e testes de Firestore Rules | Implementado |

## Deliberações de produto preservadas

O MVP não inclui finanças, streaming, chat interno, rede social, gamificação, pontuação de espiritualidade, aconselhamento por IA nem prontuário com confissão, trauma ou saúde. Essas exclusões são intencionais e seguem o blueprint.

## Única dependência externa pendente

O app funciona publicamente em modo de demonstração com dados fictícios e persistência local. Para operar com igrejas e pessoas reais é necessário autorizar e configurar o projeto Firebase compartilhado do MillionsNest, suas variáveis na Vercel e as associações/entitlements das organizações. As regras e a arquitetura para isso já estão prontas; nenhuma credencial deve entrar no repositório público.
