# `.claude/`: padrão CCMA, agentes e skills

Padrão de desenvolvimento genérico, o mesmo em todos os repositórios: o fluxo **CCMA** (Planner → Coder → Tester → Reviewer → Security Auditor) com um subagente por etapa, mais skills de apoio. A skill `ccma` orquestra o fluxo; comece por ela.

## Onde mora

- **Fonte da verdade: `~/.claude/` (global).** Vale para todos os repositórios desta máquina. Mudança no padrão se faz lá.
- **Cópia idêntica neste repositório**, para quem clonar sem ter o padrão no perfil. Com o mesmo nome nos dois níveis, só um é carregado; por isso a cópia fica byte a byte igual ao global.
- **Específica deste projeto, só aqui:** `skills/favelaware-padrao-visual/`. Não vai para o global nem para outros repositórios.

## O que tem aqui

```
.claude/
├── agents/
│   ├── planner.md             etapa 1: entende e planeja a menor alteração     (sem escrita)
│   ├── coder.md               etapa 2: implementa o plano
│   ├── tester.md              etapa 3: roda, cobre, escreve o teste de regressão
│   ├── reviewer.md            etapa 4: revisão adversarial independente        (sem escrita)
│   ├── security-auditor.md    etapa 5: checklist de segurança, crítica bloqueia (sem escrita)
│   └── auditor-de-padroes.md  fora do PR: distância até o padrão, plano em ondas (sem escrita)
└── skills/
    ├── ccma/                  orquestra o fluxo
    ├── boas-praticas/         diretrizes de código, obrigatória em todas as etapas
    ├── ponytail/              menos código, mesma qualidade
    ├── code-security/         escrever seguro por construção
    ├── owasp-security/        OWASP Top 10, ASVS e riscos de Agentic AI
    ├── security-review/       revisão de segurança do diff, antes do PR
    ├── audit-codebase/        auditoria do projeto inteiro, periódica
    ├── navegacao-web/         rotas, menus e arquitetura de informação
    ├── performance-web/       LCP, Core Web Vitals, bundle e build
    ├── web-3d/                3D e WebGL
    └── favelaware-padrao-visual/  padrão visual (específica deste projeto)
```

Os agentes sem escrita não têm Edit nem Write de propósito: quem escreve não aprova, e quem revisa não conserta no meio da revisão.

Skill de projeto complementa a genérica e manda no detalhe: a genérica diz como pensar, a do projeto diz quais arquivos, números e decisões valem aqui.

## Sincronizar depois de mudar o global

Rode na raiz do repositório; sobrescreve a cópia com o global.

PowerShell:

```powershell
$g = "$HOME\.claude"
foreach ($s in 'audit-codebase','boas-praticas','ccma','code-security','navegacao-web','owasp-security','performance-web','ponytail','security-review','web-3d') {
  Copy-Item -Recurse -Force "$g\skills\$s" .claude\skills\
}
Copy-Item -Force "$g\agents\*.md" .claude\agents\
```

bash:

```bash
g=~/.claude
for s in audit-codebase boas-praticas ccma code-security navegacao-web owasp-security performance-web ponytail security-review web-3d; do
  cp -r "$g/skills/$s" .claude/skills/
done
cp "$g"/agents/*.md .claude/agents/
```

Arquivo apagado ou skill renomeada no global não some daqui sozinha: apague à mão e atualize a lista acima. Conferência: `diff -r ~/.claude/agents .claude/agents` sem saída significa cópia igual.

## Skills de terceiros

O padrão não inclui nenhuma. Antes de adotar uma, verifique origem, manutenção recente, licença e principalmente **o que ela executa**: scripts, hooks instalados, downloads e envio de dado para fora.

- **Trail of Bits** (`trailofbits/skills`): legítimo e bem mantido (`differential-review`, `insecure-defaults`, `sharp-edges`, `fp-check`, geradores de regra Semgrep). Licença **CC-BY-SA-4.0 (copyleft)**: copiar o conteúdo para cá obrigaria a relicenciar o derivado. Instale pelo marketplace, que não tem esse efeito: `/plugin marketplace add trailofbits/skills`.
- **Security Phoenix** (`Security-Phoenix-demo/security-skills-claude-code`): MIT, mas o `install.sh` **instala hooks que interceptam todo comando Bash** e integra APIs externas. Leia o script e os hooks antes de considerar.
