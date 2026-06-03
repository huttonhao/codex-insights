export const securityMessages = {
  "security.finding.method": "Security 按 secret handling、input validation、auth boundary、dependency scan、audit trail、policy docs 和 tests 判断。",
  "security.finding.coverage": "{count}/{total} 个项目有安全证据；缺 secret/ACL/test 的项目不能承接生产级 AI 能力。",
  "security.architecture.rationale.secret": "secret 和权限边界必须先于平台化复用。",
  "security.architecture.rationale.audit": "dependency scan 和 audit trail 是可运营安全能力。",
  "security.architecture.rationale.tests": "安全测试必须进入质量门禁。"
} as const;
