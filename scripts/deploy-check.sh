#!/bin/bash
# ── Deploy Check Script ──
# Valideert omgevingsvariabelen en projectconfiguratie voor deployment.
# Gebruik: bash scripts/deploy-check.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo "🕌 Moskee Master Template — Deploy Check"
echo "========================================="
echo ""

# ── 1. Controleer verplichte env vars ──
echo "1. Omgevingsvariabelen controleren..."

check_env() {
  local var_name=$1
  local required=$2
  local value="${!var_name}"

  if [ -z "$value" ]; then
    if [ "$required" = "required" ]; then
      echo -e "   ${RED}✗ $var_name is niet ingesteld (VERPLICHT)${NC}"
      ERRORS=$((ERRORS + 1))
    else
      echo -e "   ${YELLOW}⚠ $var_name is niet ingesteld (optioneel)${NC}"
      WARNINGS=$((WARNINGS + 1))
    fi
  else
    # Check for placeholder values
    if [[ "$value" == *"xxxxxxxxxxxx"* ]] || [[ "$value" == *"your-"* ]]; then
      echo -e "   ${YELLOW}⚠ $var_name bevat een placeholder waarde${NC}"
      WARNINGS=$((WARNINGS + 1))
    else
      echo -e "   ${GREEN}✓ $var_name${NC}"
    fi
  fi
}

check_env "PUBLIC_SANITY_PROJECT_ID" "required"
check_env "PUBLIC_SANITY_DATASET" "required"
check_env "SANITY_API_TOKEN" "required"
check_env "MOLLIE_API_KEY" "optional"
check_env "RESEND_API_KEY" "optional"
check_env "UPSTASH_REDIS_REST_URL" "optional"
check_env "UPSTASH_REDIS_REST_TOKEN" "optional"

echo ""

# ── 2. Controleer package.json ──
echo "2. Dependencies controleren..."

if [ -f "package.json" ]; then
  echo -e "   ${GREEN}✓ package.json gevonden${NC}"
else
  echo -e "   ${RED}✗ package.json niet gevonden${NC}"
  ERRORS=$((ERRORS + 1))
fi

if [ -d "node_modules" ]; then
  echo -e "   ${GREEN}✓ node_modules geïnstalleerd${NC}"
else
  echo -e "   ${YELLOW}⚠ node_modules niet gevonden — voer 'npm install' uit${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ── 3. Controleer kritieke bestanden ──
echo "3. Kritieke bestanden controleren..."

check_file() {
  local file_path=$1
  if [ -f "$file_path" ]; then
    echo -e "   ${GREEN}✓ $file_path${NC}"
  else
    echo -e "   ${RED}✗ $file_path ontbreekt${NC}"
    ERRORS=$((ERRORS + 1))
  fi
}

check_file "astro.config.mjs"
check_file "src/lib/sanity.ts"
check_file "src/layouts/BaseLayout.astro"
check_file "src/pages/index.astro"
check_file "src/pages/404.astro"
check_file "src/pages/privacy.astro"
check_file "public/favicon.svg"

echo ""

# ── 4. Controleer fonts ──
echo "4. Self-hosted fonts controleren..."

FONT_DIR="public/fonts"
if [ -d "$FONT_DIR" ]; then
  FONT_COUNT=$(find "$FONT_DIR" -name "*.woff2" | wc -l)
  if [ "$FONT_COUNT" -ge 3 ]; then
    echo -e "   ${GREEN}✓ $FONT_COUNT woff2 fonts gevonden${NC}"
  else
    echo -e "   ${YELLOW}⚠ Slechts $FONT_COUNT fonts — verwacht min. 3 (Philosopher, Lato, Amiri)${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi
else
  echo -e "   ${RED}✗ Fonts directory ontbreekt (public/fonts/)${NC}"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# ── 5. Build test ──
echo "5. Build test..."

if command -v npx &> /dev/null; then
  if npx astro check 2>/dev/null; then
    echo -e "   ${GREEN}✓ Astro check geslaagd${NC}"
  else
    echo -e "   ${YELLOW}⚠ Astro check niet beschikbaar of fouten gevonden${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi
else
  echo -e "   ${YELLOW}⚠ npx niet beschikbaar — skip build check${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ── Resultaat ──
echo "========================================="
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}✗ NIET KLAAR VOOR DEPLOY: $ERRORS fouten, $WARNINGS waarschuwingen${NC}"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠ DEPLOY MOGELIJK: 0 fouten, $WARNINGS waarschuwingen${NC}"
  exit 0
else
  echo -e "${GREEN}✓ KLAAR VOOR DEPLOY: Alle checks geslaagd!${NC}"
  exit 0
fi
