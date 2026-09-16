#!/usr/bin/env bash
#
# Grava, na SUA camada de patch do DSH home, os caminhos absolutos que o bundle
# `dsh-on-fire` não pode adivinhar.
#
# Por que isto existe: o bundle traz `command: graphify-mcp` e `command: npx`, que são
# portáveis mas dependem do PATH. O PATH do host do DSH costuma ser mínimo e pode não
# conter `~/.local/bin` nem os shims do mise — e aí o servidor MCP não sobe. Como o
# bundle usa `failOnStartupError: false`, ele falharia em silêncio.
#
# Este script detecta os caminhos reais desta máquina e escreve um override por id na
# camada do usuário, que é aplicada DEPOIS do bundle e portanto vence.
#
# Lembrete: um patch por id substitui a `config` INTEIRA da row, não faz merge. Por isso
# os blocos abaixo repetem o conteúdo completo, em vez de trocar só o `command`.
#
# É idempotente: rodar de novo substitui o bloco gerenciado e não toca no resto do arquivo.
#
# Uso:  ./install/ajustar-caminhos.sh
#
set -euo pipefail

DSH_HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
PATCH="$DSH_HOME_DIR/cordis.patch.yml"
INICIO="# >>> dsh-on-fire: caminhos desta máquina (gerado por install/ajustar-caminhos.sh)"
FIM="# <<< dsh-on-fire: fim"

# ── detecção ──────────────────────────────────────────────────────────────────
# Preferimos os caminhos ESTÁVEIS: `~/.local/bin/graphify-mcp` é um symlink que o uv
# mantém apontando para a versão instalada, e o shim do mise sobrevive a upgrades do
# node. Um caminho versionado (…/installs/node/26.8.1/bin/npx) quebra no próximo upgrade.
detectar_estavel() {
	local preferido="$1" variavel="$2"
	if [ -n "${!variavel:-}" ]; then
		printf '%s' "${!variavel}"
	elif [ -x "$preferido" ]; then
		printf '%s' "$preferido"
	else
		command -v "$(basename "$preferido")" 2>/dev/null || true
	fi
}

GRAPHIFY_MCP="$(detectar_estavel "$HOME/.local/bin/graphify-mcp" GRAPHIFY_MCP)"
NPX_BIN="$(detectar_estavel "$HOME/.local/share/mise/shims/npx" NPX_BIN)"

if [ -z "$GRAPHIFY_MCP" ]; then
	echo "aviso: 'graphify-mcp' não está no PATH — a row do graphify fica com o default do bundle." >&2
fi
if [ -z "$NPX_BIN" ]; then
	echo "aviso: 'npx' não está no PATH — a row do lgpd fica com o default do bundle." >&2
fi

if [ ! -f "$PATCH" ]; then
	mkdir -p "$DSH_HOME_DIR"
	printf '%s\n' \
		"# Camada de patch do usuário (DSH home), aplicada DEPOIS do layer de cada profile." \
		"# O bloco gerenciado no fim vem de dsh-on-fire/install/ajustar-caminhos.sh." \
		>"$PATCH"
fi

# backup antes de mexer
cp "$PATCH" "$PATCH.bak-$(date +%Y%m%d-%H%M%S)"

# ── remove o bloco gerenciado anterior ────────────────────────────────────────
# Ancorado no início da linha (^) para não casar com menção dentro de outro comentário.
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
awk -v inicio="$INICIO" -v fim="$FIM" '
	$0 == inicio { pulando = 1; next }
	$0 == fim    { pulando = 0; next }
	!pulando     { print }
' "$PATCH" >"$TMP"
# tira linhas em branco sobrando no fim
awk 'BEGIN { n = 0 } { linhas[NR] = $0 } END {
	while (n < NR && linhas[NR - n] ~ /^[[:space:]]*$/) n++
	for (i = 1; i <= NR - n; i++) print linhas[i]
}' "$TMP" >"$TMP.limpo"
mv "$TMP.limpo" "$TMP"

# ── escreve o bloco novo ──────────────────────────────────────────────────────
{
	echo
	echo "$INICIO"
	echo "#"
	echo "# Gerado a partir dos caminhos desta máquina. Rode de novo depois de mover"
	echo "# o graphify ou trocar de versão do node — e depois de qualquer reinstall do bundle."
	if [ -n "$GRAPHIFY_MCP" ]; then
		cat <<YAML

- id: mcp-graphify
  config:
    serverName: graphify
    transport: stdio
    command: '$GRAPHIFY_MCP'
    args: ['--transport', 'stdio']
    cwd: '$DSH_HOME_DIR'
    toolCallTimeoutMs: 120000
    failOnStartupError: false
YAML
	fi
	if [ -n "$NPX_BIN" ]; then
		cat <<YAML

- id: mcp-lgpd
  config:
    serverName: lgpd
    transport: stdio
    command: '$NPX_BIN'
    args: ['-y', '@lordmendes/lgpd-mcp']
    cwd: '$DSH_HOME_DIR'
    toolCallTimeoutMs: 60000
    failOnStartupError: false
YAML
	fi
	echo "$FIM"
} >>"$TMP"
mv "$TMP" "$PATCH"
trap - EXIT

echo "==> bloco gerenciado escrito em $PATCH"
[ -n "$GRAPHIFY_MCP" ] && echo "    graphify-mcp: $GRAPHIFY_MCP"
[ -n "$NPX_BIN" ] && echo "    npx:          $NPX_BIN"
echo
echo "Reinicie o DSH e confira as tools mcp__graphify__* e mcp__lgpd__*."
