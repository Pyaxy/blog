+++
title = "【教程】Cloudflare 免费版 Bot Fight Mode 如何添加 IP 白名单（踩坑实录）"
date = "2026-08-28"
draft = false
description = ""
summary = "WAF 自定义规则无法跳过免费版 Bot Fight Mode 时，可以通过 IP Access Rule 放行固定出口 IP。"
tags = ["Cloudflare", "Bot Fight Mode", "WAF", "Komari"]
categories = ["Networking"]
series = []

[params]
  showTableOfContents = true
  showReadingTime = true
+++

## 问题起因

最近我又买了一台 VPS。部署 Komari Agent 后，探针页面中的节点却一直没有上线。查看 Agent 日志，可以看到：

```text
Failed to connect to WebSocket: 403 Forbidden
...
Error uploading basic info: status code: 403
<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title>
```

很明显，我在探针服务前套的 Cloudflare 直接在边缘节点拦截了请求。在 Cloudflare 的安全事件中，也能看到一堆来自 Agent IP 的拦截记录。

![Cloudflare 拦截了来自 Komari Agent 的请求](20260828152208073.png)

## 第一次尝试：添加 WAF 白名单

我先创建了一条 WAF 自定义规则，用 Agent 的固定出口 IP 作为匹配条件：

```text
ip.src eq 203.0.113.10
```

> `203.0.113.10` 只是示例，请替换成 Agent 的真实出口 IP。

Action 选择 `Skip`。页面上还可以选择跳过：

```text
Managed WAF
Custom Rules
Browser Integrity Check
Security Level
Super Bot Fight Mode
...
```

![创建针对 Agent IP 的 WAF Skip 规则](20260828152720256.png)

![WAF Skip 规则可跳过的安全组件](20260828153127482.png)

按照常识理解：

> 我都按 IP Skip 了，这台 Agent 总该放行了吧？

结果还是 `403`，后台日志依然显示请求被 Bot Fight Mode 拦截。

## 第一个坑：免费版 Bot Fight Mode 不受 WAF Skip 规则控制

查阅 Cloudflare 的 [Bot Fight Mode 文档](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/#rules) 后，原因就很清楚了：

- 普通 WAF 组件运行在 Ruleset Engine 中，自定义规则的 `Skip` 可以让请求跳过指定的后续组件。
- 免费版 Bot Fight Mode 不运行在 Ruleset Engine 中，而是走独立的评估流程。因此 WAF 自定义规则中的 `Skip`、`Bypass` 和 `Allow` 对它都无效。
- Super Bot Fight Mode 运行在 Ruleset Engine 中，支持使用 `Skip` 创建例外，但需要付费套餐。

这就是最容易踩坑的地方：Cloudflare 页面明明给了一个 `Skip` 按钮，但免费版 Bot Fight Mode 根本不认这条规则。

难道只能二选一？

- 关闭 Bot Fight Mode；
- 保留防护，但让 Agent 一直断线。

## 转机：IP Access Rules

同一份文档还提到：Bot Fight Mode 仍可能在配置 IP Access Rules 时触发，**但如果请求先匹配到一条 IP Access Rule，Bot Fight Mode 就不会再触发**。

也就是说，WAF 自定义规则不能给免费版 Bot Fight Mode 开白名单，但 IP Access Rule 可以。

## 第二个坑：IP Access Rules 到底在哪？

官方文档说有 IP Access Rules，但我翻遍 Dashboard 也没有找到入口。最后在 [创建 IP Access Rule 的文档](https://developers.cloudflare.com/waf/tools/ip-access-rules/create/) 中看到了这条说明：

> 只有已经配置过至少一条 IP Access Rule，Dashboard 才会显示 IP Access Rules 选项。

对于从未创建过此类规则的 Zone，新版 Dashboard 不会直接显示入口。这就形成了一个很怪的死循环：**想在页面里创建第一条规则，必须先已经有一条规则。**

## 解决方案：用 API 创建第一条 IP Access Rule

Cloudflare 几乎把所有配置能力都 API 化了，Dashboard 更像是 API 之上的管理界面。既然功能本身仍然存在，而 UI 又没有入口，直接调用 API 反而最省事。

Cloudflare 提供了 [创建 IP Access Rule 的 API](https://developers.cloudflare.com/api/resources/firewall/subresources/access_rules/methods/create/)，下面直接开始操作。

### 1. 获取 Zone ID

进入 `Cloudflare Dashboard → Domain → Overview`，在页面右侧的 API 区域复制 `Zone ID`。

![在 Cloudflare Dashboard 中获取 Zone ID](20260828161648999.png)

### 2. 创建 API Token

进入 `Cloudflare Dashboard → Manage account → Account API tokens → Create Token`。

![进入 Cloudflare 的 API Token 创建页面](20260828162328699.png)

![创建用于写入规则的 API Token](20260828163644734.png)

> [!WARNING] 权限与密钥安全
> 截图中为了快速验证选择了 `Write all resources`，这个权限过大，不建议长期使用。更稳妥的做法是创建自定义 Token，只授予 API 文档要求的 `Account Firewall Access Rules Write` 权限，并把资源范围限制到目标账户。Cloudflare 只会完整显示 Token 一次，请妥善保存；规则创建完成后，建议立即删除或撤销这个临时 Token。

### 3. 调用 API 创建白名单

在自己的电脑或 VPS 上设置环境变量：

```bash
export CF_ZONE_ID='你的 Zone ID'
export CF_API_TOKEN='你的 API Token'
```

然后为需要放行的 IP 创建规则：

```bash
curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/firewall/access_rules/rules" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "mode": "whitelist",
    "configuration": {
      "target": "ip",
      "value": "需要白名单的 IP"
    },
    "notes": "Komari agent - alibabahk"
  }'
```

其中：

```json
"mode": "whitelist"
```

对应 IP Access Rules 中的 `Allow`（白名单）。Cloudflare 的 API schema 明确支持 `whitelist`。

创建成功后，应该看到类似响应：

```json
{
  "result": {
    "id": "xxxxxxxxxxxxxxxx",
    "mode": "whitelist",
    "configuration": {
      "target": "ip",
      "value": "你的 IP"
    }
  },
  "success": true,
  "errors": [],
  "messages": []
}
```

再次进入 Cloudflare Dashboard，你会发现 `IP access rules` 的入口已经出现，以后就可以直接在页面中管理白名单了。

![第一条规则创建后，Dashboard 中出现 IP Access Rules 入口](20260828164858449.png)

与此同时，VPS 上的 Komari Agent 也能正常发起请求，节点正式上线。

## 总结

这套方案适用于出口 IP 固定、需要绕过免费版 Bot Fight Mode 的可信服务：

**优点：**

- 不需要关闭整个 Zone 的 Bot Fight Mode；
- 不影响 Bot Fight Mode 对其他来源请求的拦截；
- 免费。

**缺点：**

- IP Access Rule 的 `Allow` 会让匹配的访问者跳过 WAF、Browser Integrity Check、Under Attack Mode 等安全检查，放行范围比单纯绕过 Bot Fight Mode 更大；
- 不能按 Host 或 Path 做精确匹配，只适合整个出口 IP 都可信的情况；
- IP 变化后必须及时更新规则，因此不适合使用动态出口 IP 的 Agent。

这次问题本身并不复杂，核心方案就是给被拦截的固定 IP 添加 IP Access Rule。真正让排查变复杂的，是 Cloudflare 把不同时期、运行在不同评估流程中的安全机制放进了同一个 Dashboard，看起来相似，实际却不遵循同一套跳过逻辑。
