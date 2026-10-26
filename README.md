# 📡 Synthetic Monitoring — Production Reliability & Probing

> **Robôs de monitoramento sintético contínuo (Playwright + GitHub Actions)** executando probes em produção 2 vezes ao dia (08:00 e 20:00 BRT) em múltiplos apps web reais, detectando indisponibilidade, regressão de latência, erros não capturados no console do navegador e falhas de assets antes dos usuários finais.

<p align="center">
  <img src="docs/demo.gif" alt="Synthetic Monitoring Demo" width="850" />
</p>

---

## 🎯 Por que Synthetic Monitoring?

Diferente de testes E2E executados apenas no momento do deploy em pipelines CI/CD, o **Synthetic Monitoring (Monitoramento Sintético)** roda de forma contínua e autônoma diretamente contra o ambiente de **Produção**:
- **Detecção Pró-Ativa**: Pega quedas de DNS, problemas na borda (CDN/Vercel/Cloudflare) e certificados expirados mesmo sem tráfego de usuários.
- **Anti-White-Screen**: Verifica renderização de elementos vitais do DOM (combate telas brancas e quebras de hidratação React/Vite).
- **Console Sentry/Zero Errors**: Monitora o `console.error` do navegador durante o carregamento de cada aplicação.
- **Double-Fault Policy**: Alertas e abertura de incidentes são disparados apenas após falhas duplas consecutivas, eliminando 100% de ruídos transitórios de rede.
- **Auto-Resolution**: Quando o serviço se recupera, o incidente correspondente no GitHub Issues é automaticamente encerrado com comentário de timestamp de retorno.

---

## 🌐 Aplicações Monitoradas (Alvos Ativos)

| Aplicação | Stack / Hospedagem | Endpoint de Produção | Vital DOM Element | SLA Latência |
| :--- | :--- | :--- | :---: | :---: |
| **QA Playbook** | GitHub Pages / Static HTML | `https://maikonfcosta.github.io/qa-playbook/` | `h1` | `< 3000ms` |
| **Champions HQ** | Next.js / Vercel Edge | `https://champions-hq.vercel.app` | `h1` | `< 3000ms` |
| **Farm Hand Tracker** | React + Vite / Vercel Edge | `https://farm-hand-tool.vercel.app` | `h1` | `< 3000ms` |
| **Rotine** | React + Vite / Vercel Edge | `https://rotine.com.br` | `h1` | `< 3000ms` |

---

## 🏗️ Arquitetura e Anéis de Execução

```
                    ┌─────────────────────────┐
                    │  GitHub Actions Cron    │
                    │  (Scheduler / Runner)   │
                    └────────────┬────────────┘
                                 │
           ┌─────────────────────┴─────────────────────┐
           ▼                                           ▼
┌─────────────────────────┐               ┌─────────────────────────┐
│     @critical Ring      │               │       @full Ring        │
│  (2x/dia: 08h e 20h BRT)│               │  (Diário às 03:00 UTC)  │
├─────────────────────────┤               ├─────────────────────────┤
│ • Status HTTP 200       │               │ • Assets 404 (JS/CSS)   │
│ • SLA Latência (<3s)    │               │ • Broken links crawl    │
│ • DOM Vital visível     │               │ • HTTPS & CDN Headers   │
│ • 0 erros no console    │               │                         │
└──────────┬──────────────┘               └────────────┬────────────┘
           │                                           │
           └─────────────────────┬─────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │   Summary & Incidents   │
                    │ (Step Summary + Issues) │
                    └─────────────────────────┘
```

### 1. Anel Crítico (`@critical`) — Executado 2 vezes ao dia (08:00 e 20:00 BRT)
- **Meta de tempo:** Execução completa em `< 10s` (paralelizado com 4 workers).
- **Critérios de Aceite:**
  1. `HTTP 200 OK` confirmado pela resposta inicial.
  2. Latência de rede (`responseEnd`) dentro do SLA acordado (`< 3000ms`).
  3. Elemento vital do DOM visível (`waitFor({ state: 'visible' })`).
  4. Lista de erros não capturados no console (`pageerror` e `console.error`) vazia (`toHaveLength(0)`).

### 2. Anel Completo (`@full`) — Executado diariamente
- Inspeção profunda de recursos estáticos (`.js`, `.css`, `favicon`, imagens) garantindo que nenhum asset retorne `>= 400`.
- Verificação de cabeçalhos de segurança, protocolo `https://` obrigatório e identificadores de CDN (`server`, `x-vercel-id`, `via`).

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js `>= 20` (recomendado Node 24)
- npm `>= 10`

### Instalação
```bash
npm install
npx playwright install --with-deps chromium
```

### Executar Probes Críticos
```bash
npm run test:critical
```

### Executar Probes Completos (Nightly)
```bash
npm run test:full
```

### Gerar Relatório de Saúde (Markdown Summary)
```bash
npm run summary
```

### Executar Linter e Checagem de Tipos
```bash
npm run lint
npm run typecheck
```

---

## 📊 Automação CI / CD (GitHub Actions)

O projeto inclui duas esteiras pré-configuradas em `.github/workflows/`:
1. `monitoring.yml`: Roda `0 11,23 * * *` (08:00 e 20:00 BRT) com Playwright Chromium, gera resumo detalhado no `$GITHUB_STEP_SUMMARY` e avalia incidentes automáticos.
2. `nightly-full.yml`: Roda diariamente às `03:00 UTC` auditando integridade de assets estáticos e headers de CDN.

---

## 🛡️ Políticas de Engenharia Aplicadas

- **Double-Fault Protection**: Evita alertas falsos decorrentes de cold starts ou oscilações de rota da operadora.
- **Isolamento de Latência Real**: Uso de `request().timing().responseEnd` para medir a latência real de transferência HTTP/borda, sem contaminar métricas com o tempo de inicialização de processo do browser local.
- **Zero Segredos em Código**: Repositório público seguro; utiliza apenas `GITHUB_TOKEN` padrão para gerenciamento de issues.
