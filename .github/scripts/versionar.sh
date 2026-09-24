#!/usr/bin/env bash
# Calcula e aplica a proxima versao semantica em package.json a partir dos
# commits acumulados desde a ultima tag de producao.
#
# Padrao da organizacao (mesmo script dos repositorios Elkys).
#
# Prioridade de decisao:
#   1. Label version:major|minor|patch no PR desta branch para a main.
#   2. Sem label: varre os commits desde a ultima tag:
#        "!" apos o tipo (fix!:) ou "BREAKING CHANGE" no corpo -> major
#        "feat:"                                               -> minor
#        qualquer outro tipo                                   -> patch
#
# A base do incremento e SEMPRE a ultima tag de producao, nunca o valor atual
# do package.json (que pode ter sido tocado a mao e estar dessincronizado).
#
# Protecao contra loop: se o commit mais recente ja for um bump nosso, para.
# Sem isso, e sem tag ainda, "desde a ultima tag" vira "desde o inicio do
# historico" e o mesmo commit seria reencontrado a cada rodada.
#
# Ambiente: checkout com fetch-depth: 0, GH_TOKEN (secret de um admin ou o
# github.token, para empurrar o bump e consultar a label pelo gh) e BRANCH_NOME.
# BRANCH_NOME vem explicito do workflow: em pull_request, GITHUB_REF_NAME
# chega como "123/merge" (ref sintetica do PR), nao o nome da branch.
set -euo pipefail

MANIFESTO="package.json"
BRANCH="${BRANCH_NOME:?defina BRANCH_NOME com o nome da branch}"

# Nada de token no ~/.gitconfig. O gitconfig
# global aponta para um arquivo temporario e a credencial e lida do env na
# hora do push, sem nunca ser gravada em disco. 
#
# Quando o chamador (workflow) ja definiu GIT_CONFIG_GLOBAL, usamos o dele
# (ele cuida de criar e apagar). Quando ninguem definiu — ex.: script rodado
# fora do workflow — criamos o nosso proprio, dentro do RUNNER_TEMP do job
# (ou um diretorio temporario, fora dele) e removemos no exit via trap.
if [ -z "${GIT_CONFIG_GLOBAL:-}" ]; then
  _versionar_tmp_dir="${RUNNER_TEMP:-$(mktemp -d)}"
  GIT_CONFIG_GLOBAL="$(mktemp "${_versionar_tmp_dir}/gitconfig.XXXXXX")"
  export GIT_CONFIG_GLOBAL
  trap 'rm -f "$GIT_CONFIG_GLOBAL"' EXIT
else
  export GIT_CONFIG_GLOBAL
fi

# `credential.helper ''` ANTES do `--add` limpa qualquer helper herdado de
# config de sistema do runner (ex.: credential.helper=store em
# /etc/gitconfig). Sem isso, o `store` tambem recebe o token no "approve" e o
# persiste em disco — exatamente o que o gitconfig temporario existe para
# evitar.
git config --global credential.helper ''
# shellcheck disable=SC2016
git config --global --add credential.helper '!f() { echo username=x-access-token; echo "password=${GH_TOKEN}"; }; f'
git config --global user.name "versionamento-bot"
git config --global user.email "actions@github.com"

git fetch origin main --tags --quiet

ultima_tag=$(git tag --list 'v*' | sort -V | tail -1 || true)
atual=$(node -p "require('./$MANIFESTO').version")

if git log -1 --format=%s | grep -qE '^chore: versiona [0-9]+\.[0-9]+\.[0-9]+'; then
  echo "Commit mais recente ja e um bump de versao (evita loop) - nada a fazer."
  exit 0
fi

nivel=""

# `gh` ausente nao pode virar "sem PR, sem label" silencioso: o comando abaixo
# tem `2>/dev/null || true` porque tolera a AUSENCIA DE PR/LABEL (cenario
# legitimo), nao a ausencia da propria ferramenta.
command -v gh >/dev/null || { echo "::error::gh ausente no runner"; exit 1; }

pr_numero=$(gh pr list --head "$BRANCH" --base main --state open --json number --jq '.[0].number // empty' 2>/dev/null || true)
if [ -n "$pr_numero" ]; then
  label=$(gh pr view "$pr_numero" --json labels --jq '.labels[].name' 2>/dev/null | grep -m1 '^version:' || true)
  if [ -n "$label" ]; then
    nivel="${label#version:}"
    echo "Sobrescrita por label no PR #$pr_numero: $label"
  fi
fi

if [ -z "$nivel" ]; then
  if [ -n "$ultima_tag" ]; then
    corpo=$(git log "$ultima_tag..HEAD" --format=%B || true)
    if echo "$corpo" | grep -qE '^[a-z]+(\([a-z0-9._/-]+\))?!:' || echo "$corpo" | grep -q 'BREAKING CHANGE'; then
      nivel="major"
    elif echo "$corpo" | grep -qE '^feat(\([a-z0-9._/-]+\))?:'; then
      nivel="minor"
    else
      nivel="patch"
    fi
    echo "Nivel detectado pelos commits desde $ultima_tag: $nivel"
  else
    nivel="none"
    echo "Nenhuma tag de producao ainda - mantendo $atual como alvo do primeiro release."
  fi
fi

base="${ultima_tag:+${ultima_tag#v}}"
base="${base:-$atual}"
major=$(echo "$base" | cut -d. -f1)
minor=$(echo "$base" | cut -d. -f2)
patch=$(echo "$base" | cut -d. -f3)

case "$nivel" in
  major) major=$((major + 1)); minor=0; patch=0 ;;
  minor) minor=$((minor + 1)); patch=0 ;;
  patch) patch=$((patch + 1)) ;;
  none)  : ;;
  *)     echo "::error::nivel invalido: '$nivel'"; exit 1 ;;
esac

nova="$major.$minor.$patch"

if [ "$atual" = "$nova" ]; then
  echo "Versao ja esta correta ($atual), nada a fazer."
  exit 0
fi

# `npm version` sem tag/commit: mexe so no manifesto, preservando a formatacao
# que o npm ja usa. Um sed no JSON arriscaria casar outro campo "version".
npm version "$nova" --no-git-tag-version --allow-same-version >/dev/null

git add "$MANIFESTO" package-lock.json
git commit -m "chore: versiona $nova (desde ${ultima_tag:-o inicio do historico})"
git push origin "HEAD:$BRANCH"
echo "Versao atualizada: $atual -> $nova"
