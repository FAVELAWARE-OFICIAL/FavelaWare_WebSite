# `.claude/`: fluxo CCMA, agentes e skills

Tudo aqui é **versionado no git**. Ao clonar o repositório em outra máquina, o fluxo vem junto: não há instalação, não há passo manual, não há nada guardado no perfil do usuário.

## O que tem aqui

```
.claude/
├── agents/                 os cinco papéis do CCMA
│   ├── planner.md          entende, mapeia, planeja a menor alteração   (sem escrita)
│   ├── coder.md            implementa o plano, seguro por construção
│   ├── tester.md           roda, cobre, escreve o teste de regressão
│   ├── reviewer.md         revisão adversarial independente             (sem escrita)
│   └── security-auditor.md checklist de segurança, crítica bloqueia     (sem escrita)
└── skills/
    ├── ccma/               orquestra o fluxo, comece por esta
    ├── ponytail/           menos código, mesma qualidade
    ├── code-security/      escrever seguro por construção
    ├── owasp-security/     OWASP Top 10, ASVS e riscos de Agentic AI
    ├── security-review/    revisão de segurança do diff, antes do PR
    ├── audit-codebase/     auditoria do projeto inteiro, periódica
    ├── elkys-padrao-visual/  Design System (específica deste projeto)
    ├── elkys-navegacao/      rotas e navegação (específica deste projeto)
    ├── elkys-perf-web/       performance web (específica deste projeto)
    └── elkys-web-3d/         3D e animação (específica deste projeto)
```

Planner, reviewer e security-auditor **não têm permissão de escrita de propósito**. Quem escreve não aprova, e quem revisa não conserta no meio da revisão. É o que mantém a revisão independente.

## Usar em outra máquina

Nada a fazer. `git clone` e pronto.

## Usar em outro projeto

As seis skills do CCMA e os cinco agentes são **genéricos**: não citam nada deste projeto. As `elkys-*` são específicas e não devem ser copiadas.

```bash
# de dentro do outro projeto
mkdir -p .claude/skills .claude/agents
cp -r /caminho/Elkys_WebSite/.claude/agents/*.md .claude/agents/
for s in ccma ponytail code-security owasp-security security-review audit-codebase; do
  cp -r /caminho/Elkys_WebSite/.claude/skills/$s .claude/skills/
done
```

Depois, copie a seção `## 🔁 CCMA` do `CLAUDE.md` para o `CLAUDE.md` do outro projeto, para o fluxo valer por padrão lá também.

## Usar em todos os projetos de uma máquina

Sem copiar em cada projeto, e sem manter duas cópias que divergem: aponte o perfil do usuário para este repositório com **links** em vez de cópias. Assim, editar aqui atualiza em todos os projetos daquela máquina, e o versionamento continua sendo o do git.

**Windows** (junction, não pede privilégio de administrador):

```powershell
$repo   = "CAMINHO\PARA\Elkys_WebSite\.claude"
$perfil = "$env:USERPROFILE\.claude"
New-Item -ItemType Directory -Force "$perfil\skills" | Out-Null

cmd /c mklink /J "$perfil\agents" "$repo\agents"

foreach ($s in @("ccma","ponytail","code-security","owasp-security","security-review","audit-codebase")) {
  cmd /c mklink /J "$perfil\skills\$s" "$repo\skills\$s"
}
```

**Linux e macOS**:

```bash
repo="/caminho/para/Elkys_WebSite/.claude"
mkdir -p ~/.claude/skills
ln -s "$repo/agents" ~/.claude/agents
for s in ccma ponytail code-security owasp-security security-review audit-codebase; do
  ln -s "$repo/skills/$s" ~/.claude/skills/$s
done
```

Só as seis genéricas entram no perfil. As `elkys-*` ficam de fora de propósito: são específicas deste projeto e não fazem sentido nos outros.

> Não crie cópias além dos links. Se o mesmo nome existir no projeto e no perfil como arquivos independentes, um vence o outro e os dois passam a divergir em silêncio.

## Skills de terceiros

Nenhuma foi instalada. Antes de adotar qualquer uma, verifique origem, manutenção recente, licença e principalmente **o que ela executa**: scripts, hooks instalados, downloads e envio de dado para fora.

- **Trail of Bits** (`trailofbits/skills`): legítimo e bem mantido. Tem `differential-review`, `audit-context-building`, `insecure-defaults`, `sharp-edges`, `fp-check` e geradores de regra Semgrep. Licença **CC-BY-SA-4.0 (copyleft)**, ou seja, copiar o conteúdo para cá obrigaria a relicenciar o derivado sob a mesma licença. Instale pelo marketplace, que não tem esse efeito: `/plugin marketplace add trailofbits/skills`.
- **Security Phoenix** (`Security-Phoenix-demo/security-skills-claude-code`): MIT, mas repositório pequeno de fornecedor comercial, e o `install.sh` **instala hooks que interceptam todo comando Bash**, além de integrar APIs externas. Leia o script e os hooks antes de considerar.
