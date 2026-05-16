#!/bin/bash
set -e

BASE_URL="${API_URL:-http://localhost:3000}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

# Helper functions
test_get() {
  local path=$1
  local name=$2
  local status=${3:-200}
  
  echo -n "Testing $name ... "
  
  http_status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}" 2>/dev/null || echo "000")
  
  if [ "$http_status" = "$status" ]; then
    echo -e "${GREEN}OK${NC} ($http_status)"
    ((PASS++))
  else
    echo -e "${RED}FAIL${NC} (expected $status, got $http_status)"
    ((FAIL++))
  fi
}

test_post() {
  local path=$1
  local name=$2
  local data=$3
  local status=${4:-200}
  
  echo -n "Testing $name ... "
  
  http_status=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$data" \
    "${BASE_URL}${path}" 2>/dev/null || echo "000")
  
  if [ "$http_status" = "$status" ]; then
    echo -e "${GREEN}OK${NC} ($http_status)"
    ((PASS++))
  else
    echo -e "${RED}FAIL${NC} (expected $status, got $http_status)"
    ((FAIL++))
  fi
}

echo "===================================="
echo "Memory Forge API Test Suite"
echo "Base URL: $BASE_URL"
echo "===================================="
echo ""

# 1. Health check
test_get "/health" "Health Check" 200

# 2. Register
echo ""
echo "--- Auth Tests ---"
REGISTER_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456","name":"Test User"}' \
  "${BASE_URL}/api/auth/register" 2>/dev/null || echo '{}')

echo -n "Testing Register ... "
if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}OK${NC}"
  ((PASS++))
  TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null || echo "")
else
  echo -e "${YELLOW}WARN${NC} (may already exist)"
  # Try login instead
  LOGIN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test123456"}' \
    "${BASE_URL}/api/auth/login" 2>/dev/null || echo '{}')
  TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null || echo "")
fi

# 3. Login
test_post "/api/auth/login" "Login" '{"email":"test@example.com","password":"test123456"}' 200

# 4. Get me (with auth)
if [ -n "$TOKEN" ]; then
  echo -n "Testing Get Current User ... "
  ME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "${BASE_URL}/api/auth/me" 2>/dev/null || echo "000")
  if [ "$ME_STATUS" = "200" ]; then
    echo -e "${GREEN}OK${NC}"
    ((PASS++))
  else
    echo -e "${RED}FAIL${NC} ($ME_STATUS)"
    ((FAIL++))
  fi
  
  # 5. List personalities
  echo ""
  echo "--- Personality Tests ---"
  echo -n "Testing List Personalities ... "
  PL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "${BASE_URL}/api/personalities" 2>/dev/null || echo "000")
  if [ "$PL_STATUS" = "200" ]; then
    echo -e "${GREEN}OK${NC}"
    ((PASS++))
  else
    echo -e "${RED}FAIL${NC} ($PL_STATUS)"
    ((FAIL++))
  fi
  
  # 6. List templates
  echo ""
  echo "--- Template Tests ---"
  test_get "/api/templates" "List Templates"
fi

# 7. Template list (no auth)
test_get "/api/templates?page=1&limit=5" "Templates Pagination"

echo ""
echo "===================================="
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "===================================="

if [ $FAIL -gt 0 ]; then
  exit 1
fi
