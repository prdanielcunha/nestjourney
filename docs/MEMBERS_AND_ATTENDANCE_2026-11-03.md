# Members and attendance — delivery contract

## Operational flow

1. Open People and register a member with a name and optional phone, without creating a login. A preferred name is optional.
2. Import up to 75 rows per reviewed batch: `Nome;Telefone;Nome preferido`. Existing name/preferred-name imports remain supported. Nothing marks attendance or authorizes messaging automatically.
3. Open Presence, review the expected roster and start the service. Recognize a person by photo, preferred/full name or initials and mark Present. Mark Absent only after actual checking. Unchecked always remains unknown.
4. Filter Everyone / To check / Present / Absent. Search ignores accents and also searches preferred names. Corrections retain the existing reason and immutable evidence flow.
5. Close only after the scoped checks loaded successfully. History can be read by selecting a previous service. A historical view cannot start a second service while one remains open.
6. Account linkage, unlinkage and recoverable removal use the Hub's authenticated organization people-directory API. The account first joins the organization through the existing invitation/join flow. Identity linkage grants no app permission.

## Shared ownership

The Hub owns the canonical directory, identity reconciliation, membership and authorization. Journey member/visitor registration and Hub manual registration use `/api/v1/organizations/:organizationId/people-directory`. No second people database or Auth merge was introduced. See the Hub repository's `docs/CENTRAL_PEOPLE_DIRECTORY.md` for the audited contract.

`src/packages/attendance` is a reusable UI and projection module with no Firebase, auth or Journey repository import. Its host supplies authorized people, a scoped event snapshot, checks and a mutation callback. React and lucide-react are peer dependencies; the CSS uses the existing `--nj-*` tokens. Future apps can reuse this module and the canonical directory, supplying their authorized event adapter rather than reconstructing the interface or identity service.

Attendance evidence still belongs to Journey's existing domain (`organizations/{org}/products/raiz_e_mesa`); this change does not advertise a second, generic attendance backend. The Hub directory links to the actual Journey attendance surface. Unrelated app event types must preserve explicit eligibility and event scope, and may not infer absence from missing activity.

Archived central identities are hidden from new default rosters and active People views. A frozen existing roster or a recorded check retains the archived person for factual history. Restore keeps the same IDs and does not reset phone, consent or attendance.

## Resilience and validation

Optional playbook/history read failures no longer prevent congregation/people loading and minimal registration. Unavailable historical counts are hidden and explicitly described as unavailable. This is not an authorization bypass: all existing backend/Rules boundaries remain mandatory.

Async results validate desired organization/unit plus request sequence; disposed live callbacks cannot publish an old scope. Attendance writes and closing are disabled until scoped checks have loaded, while offline, or during another operation.

The core member import is now available to authorized directory managers without a visibility flag; the existing backend remains the authorization boundary. Other rollout flags remain unchanged.

Validation uses synthetic data only. No real members were created, linked or marked present by the automated UI inspection. Runtime smoke must verify exact serving releases and People / Presence navigation after publication. Code recovery uses the captured preceding commits and normal pipeline rollback; person removal is restored through the audited directory API.


## Correção de presença — 04/11/2026

A carga principal inclui somente pessoas, cultos e registros de presença. A consulta
opcional de encaminhamentos ao Cuidado ocorre separadamente após cultos encerrados;
negação ou timeout dessa consulta mantém os encaminhamentos indisponíveis e não
bloqueia a chamada. Falhas nas leituras principais invalidam a lista e oferecem nova
tentativa. Respostas antigas são descartadas ao trocar congregação/culto ou recarregar.

Cultos comuns incluem automaticamente todas as pessoas ativas da congregação.
A seleção de público permanece somente para encontros de jovens ou especiais.
No celular, a abertura ocupa a tela inteira, com erros no próprio formulário;
resumo de cobertura fica recolhido para priorizar nomes e marcação.

O encerramento grava apenas `status`, `closedAt` e `closedBy`, conforme a política
canônica do Hub. Cobertura continua calculada dos registros imutáveis de presença.
A regra central do Hub permanece a autoridade; Rules locais não são publicadas.

Regressões cobertas por `presenceScope.test.ts` e `presenceCloseContract.test.ts`.
O teste sintético contra as Rules canônicas também verificou abrir, carregar,
marcar e encerrar com CEO e membro autorizado, além da negação a terceiros.
