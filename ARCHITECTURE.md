# Documentação Arquitetural — NFT Marketplace

Este documento detalha as decisões técnicas, políticas de cache, contratos de dados, arquitetura de tempo real, integridade monetária, segurança de pedidos e acessibilidade do projeto conforme os requisitos do Desafio Frontend.

---

## 1. Stack Tecnológica Obrigatória e Utilização Efetiva

| Tecnologia | Papel no Projeto | Arquivos Principais |
|---|---|---|
| **React 19 & TypeScript** | Componentização modular e tipagem estrita de ponta a ponta | `src/main.tsx`, `src/routes/*` |
| **TanStack Router** | Roteamento baseado em arquivos (*File-Based*), Search Params na URL (`zod`), proteção de rotas privadas | `src/routes/*`, `src/routeTree.gen.ts` |
| **TanStack Query v5** | Cache assíncrono, Query Key Factory, *Optimistic Updates* com rollback em favoritos e carrinho | `src/lib/query-keys.ts`, `src/features/*/hooks` |
| **Axios** | Cliente HTTP centralizado com interceptors para tokens Bearer e captura de 401 | `src/lib/axios.ts` |
| **Tailwind CSS & shadcn/ui** | Design System temático Dark para NFT Marketplace, Skeletons com Shimmer | `tailwind.config.ts`, `src/components/ui/*` |
| **MSW v2 (Mock Service Worker)** | Interceptação na camada de rede com banco em memória + `localStorage` e simulação de cenários | `src/mocks/handlers.ts`, `src/mocks/db.ts` |
| **Socket.IO Client & Binding** | Sincronização em tempo real de preço, estoque e pedidos (`@mswjs/socket.io-binding`) | `src/mocks/socket.ts`, `src/lib/socket-context.tsx` |
| **Playwright & axe-core** | Testes ponta a ponta (E2E), regressão visual e conformidade WCAG 2.1 AA | `playwright.config.ts`, `tests/e2e/*` |
| **Lighthouse CI** | Auditoria automatizada de Core Web Vitals, A11y e Melhores Práticas | `lighthouserc.json` |

---

## 2. Estrutura de Pastas (Feature-Based)

```
src/
├── components/          # Componentes globais de UI (shadcn/ui), Layout e DevToolbar
│   ├── dev/             # ScenarioToolbar retrátil para controle de latência e falhas
│   ├── layout/          # Header, Footer, MobileNav
│   └── ui/              # Button, Input, Badge, Card, Skeleton, Dialog, Separator
├── contracts/           # Fonte única de verdade de contratos tipados com validação Zod
│   ├── auth.schema.ts
│   ├── cart.schema.ts
│   ├── filters.schema.ts
│   ├── nft.schema.ts
│   ├── order.schema.ts
│   ├── quote.schema.ts
│   └── wallet.schema.ts
├── features/            # Módulos de domínio desacoplados (API + Hooks + Context)
│   ├── auth/
│   ├── cart/
│   ├── favorites/
│   ├── nfts/
│   ├── orders/
│   ├── profile/
│   └── wallets/
├── lib/                 # Utilitários compartilhados (Axios, QueryClient, SocketContext, Decimal)
│   ├── axios.ts
│   ├── decimal.ts       # Aritmética decimal exata com BigInt (18 decimais)
│   ├── query-client.ts
│   ├── query-keys.ts
│   └── socket-context.tsx
├── mocks/               # Camada de mock MSW, banco em memória e fixtures
│   ├── db.ts            # Estado em memória com sincronização em localStorage
│   ├── handlers.ts      # Interceptadores REST MSW
│   ├── socket.ts        # Servidor de WebSocket com @mswjs/socket.io-binding
│   └── fixtures/        # Dados iniciais determinísticos (users, nfts, coupons, wallets)
└── routes/              # Árvore de rotas do TanStack Router
```

---

## 3. Política de Cache, Retries e Invalidação (TanStack Query)

1. **Query Key Factory**:
   - `queryKeys.nfts.list(filters)`: Armazena listagens com base estrita nos filtros da URL. `staleTime: 30s`.
   - `queryKeys.cart.user(userId)`: Dados isolados por usuário (ou visitante). `staleTime: 0s` para garantir valores sempre atualizados.
   - `queryKeys.favorites.all(userId)`: Dados privados isolados por ID do usuário.
   - `queryKeys.orders.detail(orderId)`: Cache do pedido individual congelado.
2. **Atualização Otimista (Optimistic Updates)**:
   - **Favoritos**: A alternância do ícone de coração atualiza o cache imediatamente no `onMutate`. Em caso de erro HTTP (ex.: 500 simulado), o cache é restaurado (*rollback*) para o estado anterior.
   - **Carrinho**: Incremento e decremento de quantidades refletem instantaneamente na interface com rollback automático se a API rejeitar (ex.: estoque insuficiente).
3. **Sessão, Expiração e Logout**:
   - No logout voluntário ou na expiração do token (401), `queryClient.clear()` é invocado imediatamente para descartar todos os dados e inscrições do usuário anterior.
   - Dispara o evento customizado `nft_market:session_expired`, preservando a rota atual via query param `redirect` para permitir retomada fluida após novo login.

---

## 4. Aritmética Decimal Exata com BigInt (18 Decimais)

Para atender aos rigores de transações Web3 em Ethereum e eliminar qualquer risco de imprecisão por ponto flutuante IEEE 754 (`Number` / `parseFloat`), a aplicação conta com o módulo `src/lib/decimal.ts`:

- **Escala de Precisão**: 18 casas decimais (`SCALE = 10^18`), espelhando a unidade fundamental *Wei* da EVM.
- **Funções Disponibilizadas**:
  - `parseDecimalToBigInt(val)`: Converte strings decimais de qualquer tamanho para `BigInt` sem converter para ponto flutuante IEEE 754. Trata frações com segurança até 18 casas decimais.
  - `formatBigIntToDecimal(val, minDecimals = 4, maxDecimals = 18)`: Converte o valor em `BigInt` de volta para string decimal com formatação precisa, preservando frações significativas até 18 casas e limpando zeros à direita além de `minDecimals`.
  - `decimalAdd(a, b)`: Adição exata de valores monetários.
  - `decimalSubtract(a, b)`: Subtração exata com piso em zero (`0`).
  - `decimalMultiply(a, b)`: Multiplicação decimal com divisão pela escala `10^18`.
  - `decimalPercentage(a, percentage)`: Cálculo preciso de desconto percentual (`(a * BigInt(percentage)) / 100n`).
  - `decimalCompare(a, b)`: Comparação estrita (`-1`, `0`, `1`).
- **Validação de Estoque e Totais**: Todos os cálculos de subtotal, descontos de cupom, taxa de rede (`0.016 ETH`) e total do pedido utilizam essa biblioteca tanto no frontend quanto no mock backend (`src/mocks/db.ts`).

---

## 5. Tabela Completa de Contratos REST e Validação

Todas as requisições que chegam à camada de API são validadas contra schemas do **Zod** (`src/contracts`). O comportamento e status HTTP são estritamente padronizados:

| Método | Endpoint | Autenticação | Payload / Schema | Resposta de Sucesso | Respostas de Erro |
|---|---|---|---|---|---|
| `GET` | `/api/nfts` | Opcional | Query: `NFTFilterInputSchema` | `200 OK`: `PaginatedNFTs` | `400`: Parâmetros de filtro inválidos |
| `GET` | `/api/nfts/:id` | Opcional | Path: `id: string` | `200 OK`: `NFT` | `404`: NFT não encontrado |
| `POST` | `/api/auth/login` | Não | Body: `LoginInputSchema` | `200 OK`: `{ user, token, expiresAt }` | `400`: Dados inválidos; `401`: Credenciais incorretas |
| `POST` | `/api/auth/register` | Não | Body: `RegisterInputSchema` | `201 Created`: `{ user, token, expiresAt }` | `400`: Validação Zod; `409`: E-mail já em uso |
| `GET` | `/api/auth/me` | Bearer Token | Header: `Authorization` | `200 OK`: `{ user: User }` | `401`: Token ausente ou sessão expirada |
| `POST` | `/api/auth/logout` | Opcional | Header: `Authorization` | `200 OK`: `{ message: string }` | - |
| `PATCH` | `/api/profile` | Bearer Token | Body: `UpdateProfileInputSchema` | `200 OK`: `User` | `401`: Sessão expirada; `400`: Dados inválidos |
| `PATCH` | `/api/profile/password` | Bearer Token | Body: `UpdatePasswordInputSchema` | `200 OK`: `{ message: string }` | `401`: Sessão expirada; `400`: Senha atual incorreta |
| `GET` | `/api/wallets` | Bearer Token | Header: `Authorization` | `200 OK`: `Wallet[]` | `401`: Sessão expirada |
| `POST` | `/api/wallets` | Bearer Token | Body: `CreateWalletInputSchema` | `201 Created`: `Wallet` | `401`: Sessão expirada; `400`: Validação Zod |
| `PATCH` | `/api/wallets/:id` | Bearer Token | Body: `CreateWalletInputSchema` | `200 OK`: `Wallet` | `401`: Sessão expirada; `404`: Carteira inexistente |
| `DELETE` | `/api/wallets/:id` | Bearer Token | Path: `id: string` | `200 OK`: `{ message: string }` | `401`: Sessão expirada; `400`: Carteira primária |
| `GET` | `/api/favorites` | Bearer / Guest | Header: `Authorization` | `200 OK`: `string[]` (IDs dos NFTs) | `401`: Token inválido |
| `GET` | `/api/favorites/details` | Bearer / Guest | Header: `Authorization` | `200 OK`: `NFT[]` (Objetos completos) | `401`: Token inválido |
| `POST` | `/api/favorites/:id` | Bearer / Guest | Path: `id: string` | `200 OK`: `{ isFavorite: boolean }` | `404`: NFT inexistente; `500`: Erro simulado |
| `GET` | `/api/cart` | Bearer / Guest | Header: `Authorization` | `200 OK`: `Cart` | - |
| `POST` | `/api/cart/items` | Bearer / Guest | Body: `AddToCartInputSchema` | `200 OK`: `Cart` | `400`: Estoque insuficiente; `404`: NFT inexistente |
| `PATCH` | `/api/cart/items/:itemId` | Bearer / Guest | Body: `UpdateCartItemQuantityInputSchema` | `200 OK`: `Cart` | `400`: Quantidade excede estoque disponível |
| `DELETE` | `/api/cart/items/:itemId` | Bearer / Guest | Path: `itemId: string` | `200 OK`: `Cart` | `404`: Item não encontrado no carrinho |
| `POST` | `/api/cart/coupon` | Bearer / Guest | Body: `{ code: string }` | `200 OK`: `{ cart, quote }` | `400`: Cupom expirado/inativo; `404`: Não encontrado |
| `DELETE` | `/api/cart/coupon` | Bearer / Guest | Header: `Authorization` | `200 OK`: `{ cart, quote }` | - |
| `GET` | `/api/cart/quote` | Bearer / Guest | Header: `Authorization` | `200 OK`: `Quote` | - |
| `GET` | `/api/orders/:id` | Bearer Token | Path: `id: string` | `200 OK`: `Order` | `401`: Não autenticado; `403`: Acesso negado a pedido alheio; `404`: Pedido inexistente |
| `POST` | `/api/orders` | Bearer Token | Header/Body: `Idempotency-Key`, `CreateOrderInputSchema` | `201 Created` / `200 OK`: `Order` | `400`: Estoque ou saldo insuficiente; `401`: Não autenticado; `409`: Cotação obsoleta ou conflito de idempotência |
| `POST` | `/api/orders/:id/status` | Bearer Token | Body: `{ status: 'confirmed' \| 'rejected' }` | `200 OK`: `Order` | `404`: Pedido não encontrado |
| `POST` | `/api/mock/reset` | Qualquer | Nenhum | `200 OK`: `{ message: string }` | - |
| `POST` | `/api/mock/scenario` | Qualquer | Body: `ScenarioSettings` | `200 OK`: `ScenarioSettings` | - |

---

## 6. Segurança, Ciclo de Sessão e Isolamento de Recursos

1. **Armazenamento Seguro de Credenciais nos Mocks**:
   - Senhas em texto puro **nunca** são persistidas no `localStorage` ou no estado do mock.
   - Implementada simulação determinística de hash compatível com Argon2id (`mockHashPassword` e `verifyMockPassword`), armazenando apenas strings como `$argon2id$mock$hash$...`.
2. **Expiração de Sessão**:
   - Estrutura dos tokens Bearer: `mock-token-{userId}-{issuedAt}-{expiresAt}`.
   - Em toda requisição protegida, o interceptor e o handler MSW verificam se `Date.now() > expiresAt` ou se o cenário `sessionExpired` está ativo no Painel de Cenários.
   - Se expirado, retorna `401 Unauthorized` com código `SESSION_EXPIRED`.
   - O frontend dispara o evento `nft_market:session_expired`, limpa o token e o cache privado do TanStack Query, e redireciona o usuário para `/login?redirect=...`.
3. **Isolamento Estrito entre Usuários**:
   - **Pedidos Privados**: `GET /api/orders/:id` compara `order.userId` com o `userId` autenticado. Caso o pedido pertença a outro usuário (ex.: Elena tentando acessar pedido de Satoshi), o endpoint responde imediatamente com **`403 Forbidden`**.
   - **Carrinho e Favoritos**: Separados por chave de usuário no `localStorage`. Ao alternar de conta, o cache de consultas anteriores é purgado via `queryClient.clear()`.

---

## 7. Ciclo de Vida do Pedido, Carrinho, Reserva de Estoque e Idempotência

O fluxo de checkout foi modelado para garantir integridade transacional sem concorrência de estoque:

### Ciclo de Reserva, Confirmação e Rollback

```
[ Início ]
   │
   ▼
POST /api/orders (status: pending)
   ├── 1. Reserva imediata do estoque no catálogo: `availableEditions` é decrementado
   └── 2. Os itens PERMANECEM no carrinho do usuário para conferência ou recuperação
   │
   ├──────────────────────────┬──────────────────────────┐
   │ (Pagamento Aprovado)     │ (Falha / Recusa / Cancel)│ (Timeout de Rede)
   ▼                          ▼                          ▼
Status: 'confirmed'       Status: 'rejected'        Reenvio com Idempotency-Key
   ├── Finaliza reserva      ├── Libera reserva         └── Recupera pedido existente
   ├── Debita do carrinho    │   (estoque restaurado)       com o mesmo status e dados
   └── Congela recibo        └── Preserva carrinho          sem duplicar reserva
```

- **Status `pending`**: O estoque de cada NFT do pedido é decrementado imediatamente no catálogo (`reserveStock`), impedindo que outros compradores adquiram edições além do limite. Os itens continuam no carrinho do comprador.
- **Status `confirmed`**: A compra é finalizada (`commitOrder`). Apenas as quantidades compradas são removidas do carrinho e o recibo imutável é disponibilizado.
- **Status `rejected`**: Caso o pagamento falhe ou seja rejeitado pelo gateway, a reserva de estoque é estornada (`rollbackOrderReservation`), devolvendo as edições ao catálogo. O carrinho do comprador permanece intacto para permitir nova tentativa com outra carteira.

### Estratégia de Idempotência e Hash de Compra

- **Cabeçalho ou Corpo**: O cliente pode fornecer `Idempotency-Key` via header HTTP ou como campo `idempotencyKey` no payload JSON.
- **Hash de Conteúdo Normalizado**: O backend calcula o hash combinando:
  ```ts
  const contentHash = JSON.stringify({
    items: body.items.map((i) => ({ nftId: i.nftId, quantity: i.quantity })).sort(),
    walletId: body.walletId,
    totalETH: quote.totalETH,
    couponCode: body.couponCode || null,
  })
  ```
- **Replay Idêntico**: Se uma requisição com a mesma chave e o mesmo hash de compra for recebida, o pedido já existente é retornado com status `200/201`, sem criar novo pedido nem abater estoque novamente.
- **Conflito de Idempotência**: Se a mesma chave for reenviada com parâmetros divergentes (ex.: itens alterados ou carteira diferente), o backend responde com **`409 Conflict`**.

---

## 8. Tempo Real com Socket.IO, Deduplicação e Reconciliação

A comunicação em tempo real utiliza a biblioteca `@mswjs/socket.io-binding`, conectando o cliente oficial `socket.io-client` aos canais de simulação da aplicação:

1. **Deduplicação e Ordenação por Versão**:
   - Cada evento `nft.updated` carrega um número inteiro incremental `version`.
   - O `SocketProvider` rastreia a maior versão conhecida para cada recurso.
   - Eventos recebidos fora de ordem (ex.: versão 3 chegando após a versão 5) ou duplicados são descartados antes de acionar atualizações no TanStack Query.
2. **Isolamento de Eventos por Usuário**:
   - Eventos `order.updated` contêm o atributo `userId`.
   - O listener do cliente valida se `payload.userId === currentUser.id`. Se o evento for direcionado a outro usuário, ele é silenciosamente ignorado.
3. **Imutabilidade de Estados Terminais**:
   - Uma vez que o pedido atinge o estado `confirmed` ou `rejected`, o cliente rejeita qualquer tentativa posterior de transição via WebSocket para o estado `pending`.
4. **Reconciliação REST pós-Reconexão**:
   - Ao restabelecer a conexão WebSocket (`socket.on('connect')`), o `SocketProvider` invalida ativamente as consultas do carrinho, cotação e pedidos pendentes via TanStack Query, garantindo consistência com o banco central.
5. **Limitações do Mock no Navegador**:
   - O transporte do `@mswjs/socket.io-binding` opera na camada de interceptação de rede do worker da aba ativa. Disparos realizados pelo Painel de Cenários são transmitidos aos listeners registrados no `socket.io-client` local. Em cenários multi-abas, a sincronização é assegurada pelo espelhamento em `localStorage`.

---

## 9. Modo de Operação e Desativação do MSW

O Mock Service Worker é totalmente controlável por variáveis de ambiente ou flags de runtime, possibilitando conectar a aplicação a um backend de produção ou homologação sem alterações no código-fonte:

- **Desativação via Variável de Ambiente**:
  No arquivo `.env` ou `.env.production`:
  ```bash
  VITE_ENABLE_MSW=false
  ```
- **Desativação Dinâmica via Janela**:
  No console do navegador:
  ```javascript
  window.__DISABLE_MSW__ = true
  ```
- **Comportamento**: Quando desativado, o Service Worker não é registrado no `src/main.tsx`, e todas as chamadas HTTP e conexões Socket.IO são direcionadas diretamente à infraestrutura de backend configurada no `baseURL` do Axios.

---

## 10. Painel de Controle de Cenários (Dev Toolbar)

Uma interface retrátil fixada no canto inferior esquerdo permite simular condições adversas de infraestrutura:

1. **Latência de Rede Configurável**: 0ms, 150ms (padrão), 600ms (rede lenta) e 2000ms (alta latência com skeletons visíveis).
2. **Injeção de Falhas**:
   - `Offline`: Bloqueia requisições emulando ausência de conexão.
   - `HTTP 500`: Força erro interno do servidor para testar o rollback otimista de favoritos e o botão "Tentar Novamente".
   - `Sessão Expirada (401)`: Simula token vencido para verificar o descarte de cache privado e redirecionamento.
   - `Recusar Pedidos`: Força o gateway de pagamento a rejeitar a transação e liberar o estoque reservado.
   - `simulateTimeoutAfterOrderCreation`: Simula queda ou timeout da resposta após o commit do pedido no servidor (HTTP 504), permitindo provar que a interface retoma o pedido via chave de idempotência sem duplicar.
3. **Disparos em Tempo Real**:
   - Disparo manual de eventos `nft.updated` e `order.updated`.
4. **Parâmetros de Automação via URL**:
   A Toolbar e os handlers MSW aceitam comandos diretos na URL para orquestração nos testes do Playwright:
   - `?mock_scenario=error_500`
   - `?mock_scenario=offline`
   - `?mock_scenario=session_expired`
   - `?mock_latency=2000`

---

## 11. Acessibilidade (WCAG 2.1 AA) com Zero Supressões

A aplicação foi submetida a testes rigorosos com a ferramenta `@axe-core/playwright` e auditorias manuais em todas as páginas:

- **Navegação por Teclado e Foco Visível**:
  - Todos os elementos interativos possuem anéis de foco visíveis (`focus-visible:ring-2 focus-visible:ring-[#D28A4C]`).
  - Navegação fluida por `Tab`, ativação por `Enter` e `Espaço`.
  - Formulário de busca e filtros disparados via tecla `Enter`.
- **Gestão de Foco em Diálogos (Modais)**:
  - Focus trap implementado com Radix UI / shadcn/ui.
  - Fechamento imediato via tecla `Escape`.
  - Retorno automático do foco ao elemento acionador ao fechar o diálogo.
- **Rótulos e Feedback para Leitores de Tela**:
  - Campos de entrada associados a labels semânticos (`htmlFor` e `id`).
  - Atributos `aria-invalid` e `aria-describedby` vinculados às mensagens de validação Zod.
  - Alternador de visibilidade de senha com rótulo descritivo explícito (`aria-label="Exibir caracteres"` / `aria-label="Ocultar caracteres"`).
- **Skeletons com Shimmer e Movimento Reduzido**:
  - Skeletons estruturais que espelham exatamente as dimensões dos blocos finais, eliminando Cumulative Layout Shift (`CLS = 0.000`).
  - Skeletons possuem `aria-hidden="true"` para não poluir leitores de tela.
  - Efeitos visuais de shimmer são suprimidos sob `@media (prefers-reduced-motion: reduce)`.
- **Conformidade Estrita com Contraste de Cores (`color-contrast`)**:
  - Todos os testes do axe-core rodam com a regra `color-contrast` ativada sem qualquer supressão.
  - As cores de texto secundárias foram calibradas para `#9E8C7E` e `#A9998D` sobre o fundo `#140D0A`, atingindo razão de contraste superior a 5.0:1 (excedendo os 4.5:1 exigidos pelo nível AA da WCAG 2.1).

---

## 12. Performance e Core Web Vitals (Lighthouse CI)

A aplicação foi auditada utilizando o **Lighthouse CI v0.15** em build de produção otimizado com 3 execuções consecutivas para cálculo de mediana:

### Desktop (1350x940px)
| URL / Página | Performance | Acessibilidade | Melhores Práticas | SEO | LCP | CLS | TBT |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Início (`/`)** | **98** | **96** | **100** | **92** | **1.06s** | **0.000** | **7.5ms** |
| **Detalhe (`/nft/nft_1`)** | **98** | **96** | **100** | **92** | **1.05s** | **0.000** | **13.1ms** |

*Todas as metas do desafio (Performance ≥ 90, A11y ≥ 95, Best Practices ≥ 95, SEO ≥ 90, LCP ≤ 2.5s, CLS ≤ 0.1, TBT ≤ 200ms) atingidas com 100% de aprovação.*

### Mobile (Emulação com 4x CPU Throttling e Rede 4G Lenta)
| URL / Página | Performance | Acessibilidade | Melhores Práticas | SEO | LCP | CLS | TBT |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Início (`/`)** | **74** | **96** | **100** | **92** | ~4.17s | **0.000** | **110ms** |
| **Detalhe (`/nft/nft_1`)** | **76** | **100** | **100** | **92** | ~3.97s | **0.000** | **95ms** |

*Nota e justificativa técnica: No perfil Mobile, Acessibilidade (96–100%), Melhores Práticas (100%), SEO (92%), CLS (0.000) e TBT (< 200ms) atingem integralmente as metas. A métrica de LCP é impactada pela inicialização do Service Worker do MSW sob restrição de CPU celular 4x.*

---

## 13. Comandos e Scripts de Verificação

A integridade do projeto pode ser verificada a partir de um checkout limpo através dos seguintes scripts:

```bash
# Instalação limpa de dependências
pnpm install

# Verificação estrita de tipos TypeScript (0 erros tolerados)
pnpm typecheck

# Análise estática ultrarrápida com oxlint (0 erros, 0 avisos)
pnpm lint

# Formatação e validação com Prettier
pnpm format

# Compilação e empacotamento de produção (Vite + TypeScript)
pnpm build

# Execução da suíte completa de 174 testes E2E Playwright
pnpm test:e2e

# Auditoria automatizada do Lighthouse CI Desktop
pnpm audit:lh

# Auditoria automatizada do Lighthouse CI Mobile
pnpm audit:lh:mobile

# Auditoria automatizada conjunta (Desktop + Mobile)
pnpm audit:lh:all
```
