#!/usr/bin/env bash
# ACTTOLOG deploy chain — GitHub (STEP 6/26/99). Runs fully automated once a
# writable token is provided via ATL_GH_TOKEN env var. Token is never stored
# in the repo, never committed, removed from git config at the end.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${ATL_GH_TOKEN:?Set ATL_GH_TOKEN to a writable GitHub token}"

echo "==> [1/5] Authenticating"
curl_ok() { node -e "
const https=require('https');
const t=process.env.ATL_GH_TOKEN;
const [method,path,body]=process.argv.slice(1);
const data=body||'';
const q=https.request({host:'api.github.com',path,method,headers:{'User-Agent':'acttolog','Authorization':'Bearer '+t,'Accept':'application/vnd.github+json','Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}},res=>{let b='';res.on('data',d=>b+=d);res.on('end',()=>{console.log(res.statusCode);process.stdout.write(b)})});
q.on('error',e=>{console.log(0);process.stdout.write(e.message)});q.end(data);" "$@"; }

ME=$(curl_ok GET /user)
ME_CODE=$(echo "$ME" | head -1)
[ "$ME_CODE" = "200" ] || { echo "AUTH FAILED ($ME_CODE)"; exit 1; }
LOGIN=$(echo "$ME" | tail -n +2 | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).login))")
echo "    authenticated as: $LOGIN"

echo "==> [2/5] Ensuring repository ${LOGIN}/acttolog exists"
CHK=$(curl_ok GET "/repos/${LOGIN}/acttolog")
CHK_CODE=$(echo "$CHK" | head -1)
if [ "$CHK_CODE" != "200" ]; then
  CREATE=$(curl_ok POST /user/repos '{"name":"acttolog","description":"ACTTOLOG — Welcome to Acttolog World. Production website of the Acttolog digital ecosystem.","private":true,"auto_init":false,"has_issues":false,"has_wiki":false}')
  CREATE_CODE=$(echo "$CREATE" | head -1)
  [ "$CREATE_CODE" = "201" ] || { echo "REPO CREATE FAILED ($CREATE_CODE): $(echo "$CREATE" | tail -n +2 | head -c 200)"; exit 1; }
  echo "    created: ${LOGIN}/acttolog (private)"
else
  echo "    already exists: ${LOGIN}/acttolog"
fi

echo "==> [3/5] Pushing all commits (branch: main)"
git remote set-url origin "https://github.com/${LOGIN}/acttolog.git" 2>/dev/null || git remote add origin "https://github.com/${LOGIN}/acttolog.git"
git config --local credential.helper "!f(){ echo username=x-access-token; echo password=\$ATL_GH_TOKEN; }; f"
git push -u origin main --force
git config --local --unset credential.helper

echo "==> [4/5] GitHub verification (§99)"
V=$(curl_ok GET "/repos/${LOGIN}/acttolog")
echo "$V" | tail -n +2 | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
  const j=JSON.parse(s);
  console.log('    repo:', j.full_name);
  console.log('    default branch:', j.default_branch);
  console.log('    private:', j.private);
  console.log('    url:', j.html_url);
});"
LOCAL_HEAD=$(git rev-parse HEAD)
REMOTE_HEAD=$(git ls-remote origin refs/heads/main | cut -f1)
[ "$LOCAL_HEAD" = "$REMOTE_HEAD" ] && echo "    head matches remote: ${LOCAL_HEAD:0:7} ✓" || { echo "    HEAD MISMATCH"; exit 1; }

echo "==> [5/5] Secret scan on pushed tree"
git grep -InE "sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16}|-----BEGIN" HEAD -- . && { echo "    SECRET FOUND IN TREE"; exit 1; } || echo "    no secrets in pushed tree ✓"
git grep -In "pramod" HEAD -- src prisma tools messages public README.md && { echo "    OWNER EMAIL LEAK"; exit 1; } || echo "    no private owner email ✓"

echo ""
echo "✅ GITHUB COMPLETE: https://github.com/${LOGIN}/acttolog"
