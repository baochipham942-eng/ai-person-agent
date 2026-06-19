#!/usr/bin/env bash
# 下载 24 家公司高清 logo（GitHub 组织头像）到 public/logos/{key}.png。
# 每个 key 给候选 org 列表，取第一个返回有效 PNG（>800B）的。失败的保留 favicon 兜底。
set -u
cd "$(dirname "$0")/../.." || exit 1
DEST=public/logos
mkdir -p "$DEST"

# key|候选org1,候选org2,...
ENTRIES=(
  "anthropic|anthropics"
  "openai|openai"
  "xai|xai-org"
  "alibaba-damo-academy|alibaba,QwenLM"
  "apple|apple"
  "cloudflare|cloudflare"
  "deepseek|deepseek-ai"
  "google|google"
  "hugging-face|huggingface"
  "minimax|MiniMax-AI,MiniMaxAI"
  "mistral-ai|mistralai"
  "nvidia|NVIDIA"
  "meta|facebookresearch,facebook"
  "microsoft|microsoft"
  "cohere|cohere-ai"
  "perplexity|perplexityai,ppl-ai"
  "anysphere|anysphere,getcursor"
  "thinking-machines-lab|thinking-machines-lab"
  "amazon|amzn,aws"
  "moonshot-ai|MoonshotAI"
  "baidu|baidu,PaddlePaddle"
  "zhipu-ai|zai-org,THUDM,zhipuai"
  "tencent|Tencent"
  "bytedance|bytedance"
)

ok=0; fail=0; failed_keys=""
for entry in "${ENTRIES[@]}"; do
  key="${entry%%|*}"; orgs="${entry#*|}"
  got=""
  IFS=',' read -ra cand <<< "$orgs"
  for org in "${cand[@]}"; do
    tmp="/tmp/logo_$key.png"
    code=$(curl -sL -m 15 -o "$tmp" -w "%{http_code}" "https://github.com/$org.png?size=400" 2>/dev/null)
    sz=$(wc -c < "$tmp" 2>/dev/null || echo 0)
    magic=$(head -c 4 "$tmp" 2>/dev/null | od -An -tx1 | tr -d ' ')
    # PNG magic = 89504e47, 要求 >800B
    if [ "$code" = "200" ] && [ "$magic" = "89504e47" ] && [ "$sz" -gt 800 ]; then
      cp "$tmp" "$DEST/$key.png"
      echo "✅ $key <- github/$org (${sz}B)"
      got="$org"; ok=$((ok+1)); break
    fi
  done
  if [ -z "$got" ]; then
    echo "❌ $key (候选: $orgs 全失败，保留 favicon)"
    fail=$((fail+1)); failed_keys="$failed_keys $key"
  fi
done
echo ""
echo "完成: 成功 $ok / 失败 $fail"
[ -n "$failed_keys" ] && echo "失败 key:$failed_keys"
