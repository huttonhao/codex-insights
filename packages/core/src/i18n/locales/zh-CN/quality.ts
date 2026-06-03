export const qualityMessages = {
  "quality.finding.matrix": "Quality 专题直接来自 workspace quality matrix，不依赖关键词。",
  "quality.finding.reference": "{projects} 具备较完整质量门禁候选。",
  "quality.finding.noReference": "当前没有项目具备较完整质量门禁候选。",
  "quality.risk.missing": "质量门禁缺少 {dimension}。",
  "quality.action.add": "优先补齐 {dimension}，再提升业务实现。",
  "quality.platform.reason": "质量门禁适合形成 workspace 级模板和 AGENTS.md 规则。",
  "quality.platform.plan.patch": "先补缺 test script/CI 的项目。",
  "quality.platform.plan.template": "抽取通用 CI 模板。",
  "quality.platform.plan.rules": "把静态检查写入 AGENTS.md。",
  "quality.architecture.rationale.staticFirst": "先静态检查，再测试构建，符合当前验收偏好。",
  "quality.architecture.rationale.ci": "CI required checks 是跨项目质量一致性的最低门槛。",
  "quality.architecture.rationale.failureEvidence": "失败命令必须沉淀 evidence，避免重复排查。"
} as const;
