#!/bin/bash

echo "🚀 DEPLOYMENT VALIDATION CHECKLIST"
echo "=================================="

BASE_URL="http://localhost:5000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass_count=0
warn_count=0
fail_count=0

check_pass() {
    echo -e "  ${GREEN}✅ $1${NC}"
    ((pass_count++))
}

check_warn() {
    echo -e "  ${YELLOW}⚠️ $1${NC}"
    ((warn_count++))
}

check_fail() {
    echo -e "  ${RED}❌ $1${NC}"
    ((fail_count++))
}

echo ""
echo "1. ENVIRONMENT VARIABLES"
echo "------------------------"

# Check critical environment variables
if [ ! -z "$SUPABASE_URL" ]; then
    check_pass "SUPABASE_URL: Set"
else
    check_fail "SUPABASE_URL: Missing"
fi

if [ ! -z "$SUPABASE_ANON_KEY" ]; then
    check_pass "SUPABASE_ANON_KEY: Set"
else
    check_fail "SUPABASE_ANON_KEY: Missing"
fi

if [ ! -z "$SUPABASE_SERVICE_KEY" ]; then
    check_pass "SUPABASE_SERVICE_KEY: Set"
else
    check_fail "SUPABASE_SERVICE_KEY: Missing"
fi

if [ ! -z "$DATABASE_URL" ]; then
    check_pass "DATABASE_URL: Set"
else
    check_fail "DATABASE_URL: Missing"
fi

if [ ! -z "$SESSION_SECRET" ]; then
    check_pass "SESSION_SECRET: Set"
else
    check_fail "SESSION_SECRET: Missing"
fi

if [ "$NODE_ENV" = "production" ]; then
    check_pass "NODE_ENV: production"
else
    check_warn "NODE_ENV: $NODE_ENV (should be 'production' for deployment)"
fi

echo ""
echo "2. HEALTH ENDPOINTS"
echo "-------------------"

# Test health endpoint
health_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
if [ "$health_status" = "200" ]; then
    check_pass "Health endpoint: Working (200)"
else
    check_fail "Health endpoint: Failed ($health_status)"
fi

# Test readiness endpoint  
ready_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/ready")
if [ "$ready_status" = "200" ]; then
    check_pass "Readiness endpoint: Working (200)"
else
    check_fail "Readiness endpoint: Failed ($ready_status)"
fi

echo ""
echo "3. AUTHENTICATION ENDPOINTS"
echo "---------------------------"

# Test auth/me endpoint (should return 401 when not authenticated)
auth_me_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/me")
if [ "$auth_me_status" = "401" ]; then
    check_pass "Auth protection: Working (401 for unauthenticated)"
else
    check_warn "Auth protection: Unexpected status ($auth_me_status)"
fi

# Test login endpoint exists
login_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"test","password":"test"}')
if [ "$login_status" = "401" ] || [ "$login_status" = "400" ]; then
    check_pass "Login endpoint: Exists and validates credentials ($login_status)"
else
    check_warn "Login endpoint: Unexpected status ($login_status)"
fi

echo ""
echo "4. API ENDPOINTS"
echo "----------------"

# Test protected API endpoints
endpoints=("/api/catalog-options/categories" "/api/catalog-options/sports" "/api/catalog" "/api/customers" "/api/users")

for endpoint in "${endpoints[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
    if [ "$status" = "401" ] || [ "$status" = "403" ]; then
        check_pass "$endpoint: Protected (requires auth) ($status)"
    elif [ "$status" = "200" ]; then
        check_pass "$endpoint: Accessible ($status)"
    else
        check_warn "$endpoint: Status $status"
    fi
done

echo ""
echo "5. FILE UPLOAD SECURITY"
echo "------------------------"

# Check uploads directory protection
uploads_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/uploads/")
if [ "$uploads_status" = "404" ] || [ "$uploads_status" = "403" ]; then
    check_pass "Uploads directory: Protected from listing ($uploads_status)"
else
    check_warn "Uploads directory: May be publicly accessible ($uploads_status)"
fi

echo ""
echo "6. SECURITY HEADERS"
echo "-------------------"

# Check for security headers
headers_response=$(curl -s -I "$BASE_URL/api/health")

if echo "$headers_response" | grep -i "x-frame-options" > /dev/null; then
    check_pass "X-Frame-Options header: Present"
else
    check_fail "X-Frame-Options header: Missing"
fi

if echo "$headers_response" | grep -i "x-content-type-options" > /dev/null; then
    check_pass "X-Content-Type-Options header: Present"
else
    check_fail "X-Content-Type-Options header: Missing"
fi

if echo "$headers_response" | grep -i "strict-transport-security" > /dev/null; then
    check_pass "Strict-Transport-Security header: Present"
else
    check_warn "Strict-Transport-Security header: Missing (HTTPS needed)"
fi

echo ""
echo "7. PERFORMANCE"
echo "--------------"

# Test response time
start_time=$(date +%s%3N)
curl -s "$BASE_URL/api/health" > /dev/null
end_time=$(date +%s%3N)
response_time=$((end_time - start_time))

if [ "$response_time" -lt 1000 ]; then
    check_pass "Health endpoint response time: ${response_time}ms"
else
    check_warn "Health endpoint response time: ${response_time}ms (slow)"
fi

echo ""
echo "=================================="
echo "📊 SUMMARY"
echo "=================================="
total_checks=$((pass_count + warn_count + fail_count))
echo "Total Checks: $total_checks"
echo -e "${GREEN}✅ Passed: $pass_count${NC}"
echo -e "${YELLOW}⚠️ Warnings: $warn_count${NC}"
echo -e "${RED}❌ Failed: $fail_count${NC}"

if [ "$total_checks" -gt 0 ]; then
    readiness_score=$(( (pass_count * 100) / total_checks ))
    echo ""
    echo "🎯 Deployment Readiness: ${readiness_score}%"
    
    if [ "$readiness_score" -ge 90 ]; then
        echo -e "${GREEN}🎉 EXCELLENT - Ready for deployment!${NC}"
    elif [ "$readiness_score" -ge 75 ]; then
        echo -e "${GREEN}✅ GOOD - Minor issues to address before deployment${NC}"
    elif [ "$readiness_score" -ge 50 ]; then
        echo -e "${YELLOW}⚠️ FAIR - Several issues need attention${NC}"
    else
        echo -e "${RED}❌ POOR - Critical issues must be fixed before deployment${NC}"
    fi
fi

echo ""