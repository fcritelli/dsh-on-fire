#!/usr/bin/env bash
#
# Instala o graphify e cria o wrapper que injeta a chave do Gemini.
#
# Isto NÃO é um bundle porque não pode ser: a chave é um segredo e o wrapper é um
# arquivo local à máquina. Um pacote não carrega segredo, e o bundle não teria como
# adivinhar onde o binário do graphify caiu nesta máquina.
#
# É idempotente: rodar de novo só reescreve o wrapper. É justamente isso que conserta
# o caso mais comum — `uv tool install|upgrade` sobrescreve o wrapper com um symlink e
# o graphify volta a falhar com "No LLM provider configured".
#
# Uso:  ./install/instalar-graphify.sh
#
set -euo pipefail

GRAPHIFY_VERSION="${GRAPHIFY_VERSION:-0.9.55}"
GRAPHIFY_MODEL="${GRAPHIFY_GEMINI_MODEL:-gemini-flash-latest}"
KEY_FILE="${GRAPHIFY_KEY_FILE:-$HOME/.config/graphify/gemini.key}"
BIN_DIR="$HOME/.local/bin"
DEST="$BIN_DIR/graphify"

if ! command -v uv >/dev/null 2>&1; then
	echo "erro: 'uv' não encontrado no PATH. Instale o uv primeiro." >&2
	exit 1
fi

TOOLS_DIR="$(uv tool dir 2>/dev/null || echo "$HOME/.local/share/uv/tools")"
REAL_BIN="$TOOLS_DIR/graphifyy/bin/graphify"

# ── 1. o pacote, com os DOIS extras ────────────────────────────────────────────
# O extra `mcp` é o que expõe o servidor MCP; `gemini` é o provedor de LLM do CLI.
# Instalar com um extra APAGA o outro — por isso os dois aqui, sempre juntos.
echo "==> instalando graphifyy[mcp,gemini]==$GRAPHIFY_VERSION"
uv tool install "graphifyy[mcp,gemini]==$GRAPHIFY_VERSION" --force

if [ ! -x "$REAL_BIN" ]; then
	echo "erro: esperava o binário em $REAL_BIN e ele não está lá." >&2
	exit 1
fi

# ── 2. a chave, fora do repositório e fora do wrapper ─────────────────────────
if [ ! -r "$KEY_FILE" ]; then
	mkdir -p "$(dirname "$KEY_FILE")"
	printf 'Cole a chave da API do Gemini (fica em %s): ' "$KEY_FILE" >&2
	read -r chave
	if [ -z "$chave" ]; then
		echo "erro: chave vazia." >&2
		exit 1
	fi
	printf '%s' "$chave" >"$KEY_FILE"
	echo "==> chave gravada em $KEY_FILE"
fi
chmod 600 "$KEY_FILE"

# ── 3. o wrapper, sem segredo dentro ──────────────────────────────────────────
# Ele lê a chave em tempo de execução. Um `uv tool install` futuro recria o symlink
# por cima; rodar este script de novo restaura o wrapper.
mkdir -p "$BIN_DIR"
rm -f "$DEST"
cat >"$DEST" <<WRAPPER
#!/usr/bin/env bash
# Wrapper do graphify — gerado por dsh-on-fire/install/instalar-graphify.sh.
# Não edite à mão: \`uv tool install|upgrade graphifyy\` sobrescreve este arquivo.
set -euo pipefail

KEY_FILE="\${GRAPHIFY_KEY_FILE:-$KEY_FILE}"

if [ -z "\${GEMINI_API_KEY:-}" ] && [ -r "\$KEY_FILE" ]; then
  GEMINI_API_KEY="\$(cat "\$KEY_FILE")"
  export GEMINI_API_KEY
fi

: "\${GRAPHIFY_GEMINI_MODEL:=$GRAPHIFY_MODEL}"
export GRAPHIFY_GEMINI_MODEL

exec "$REAL_BIN" "\$@"
WRAPPER
chmod 700 "$DEST"

echo "==> wrapper criado em $DEST"
echo
echo "pronto. Confira com:"
echo "  graphify --version"
echo "  graphify doctor"
