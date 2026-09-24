#!/usr/bin/env bash
# Aplica no GitHub os rulesets de .github/rulesets/, liga o
# delete_branch_on_merge e cria as labels version:* usadas pelo versionamento.
#
# Idempotente: ruleset com o mesmo nome e ATUALIZADO (PUT), nao duplicado.
#
# Uso:
#   bash .github/scripts/provisionar-governanca.sh [owner/repo]
#
# Requisitos: gh autenticado com escopo `repo` e permissão de admin no repo.
#
# Organizacao no plano Free: rulesets so funcionam com o repo publico. Se ele
# voltar a ser privado, a API responde 403 e o script pula os rulesets.
# O bypass fica so com o time mantenedores-site (id no JSON de cada ruleset).
set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"

echo "→ Repositório: $REPO"

if ! gh auth status >/dev/null 2>&1; then
  echo "✗ gh não autenticado. Rode 'gh auth login' (ou exporte GH_TOKEN)." >&2
  exit 1
fi

echo "→ Ligando delete_branch_on_merge..."
gh api --method PATCH "repos/$REPO" -F delete_branch_on_merge=true --silent

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIR_RULESETS="$RAIZ/.github/rulesets"

echo "→ Lendo rulesets existentes..."
if ! existentes_json="$(gh api "repos/$REPO/rulesets" 2>/dev/null)"; then
  echo "  ! rulesets indisponiveis neste plano (HTTP 403). Pulando."
else
  for arquivo in "$DIR_RULESETS"/*.json; do
    nome="$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).name)" "$arquivo")"
    id="$(echo "$existentes_json" | node -e "
      let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
        const r=(JSON.parse(s||'[]')).find(x=>x.name===process.argv[1]);
        process.stdout.write(r?String(r.id):'');
      });" "$nome")"

    if [ -n "$id" ]; then
      echo "  ~ atualizando '$nome' (id $id)"
      gh api --method PUT "repos/$REPO/rulesets/$id" --input "$arquivo" --silent
    else
      echo "  + criando '$nome'"
      gh api --method POST "repos/$REPO/rulesets" --input "$arquivo" --silent
    fi
  done
fi

echo "→ Labels de versão..."
criar_label() {
  gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null
  echo "  • $1"
}
criar_label "version:major" "B60205" "Força bump major no PR para a main, independente do tipo dos commits"
criar_label "version:minor" "0E8A16" "Força bump minor no PR para a main, independente do tipo dos commits"
criar_label "version:patch" "0366D6" "Força bump patch no PR para a main, independente do tipo dos commits"

echo "✓ Governança aplicada em $REPO."
