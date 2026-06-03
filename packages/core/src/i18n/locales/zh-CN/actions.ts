export const actionsMessages = {
  "actions.prompt.quality.title": "补齐 {project} 的测试/CI 证据",
  "actions.prompt.quality.body": "请进入 {project}，先运行静态检查：git status --short、git diff --stat、rg --files、grep 检查不完整实现。然后识别当前项目的测试框架和 CI 入口，补齐最小 test script、测试文件和 CI workflow。完成后运行对应 test/build 命令，并把失败原因、修复动作和复跑结果写入总结。",
  "actions.prompt.rag.title": "收敛 RAG 平台化路线",
  "actions.prompt.rag.body": "请基于本报告的 RAG 项目级成熟度表，选择 {project} 作为 reference candidate。先不要重写业务逻辑；先输出公共模块边界：connector、normalization、chunking、embedding、vector index、retrieval、reranking、citation verification、evaluation、observability、ACL。然后列出三阶段迁移计划，并明确哪些业务项目应停止重复建设。",
  "actions.prompt.agentGateway.title": "收敛 Agent / LLM Gateway 能力边界",
  "actions.prompt.agentGateway.body": "请根据本报告的 Agent / LLM Gateway 专题，分别梳理 planner、tool registry、memory、state machine、human approval、eval、tracing，以及 provider abstraction、model routing、pricing、rate limit、fallback、retry、safety、usage logging、OpenAI compatible API。输出哪些能力应该平台化、哪些留在业务项目，并给出第一轮最小改造 PR 清单。",
  "actions.prompt.dataQuality.title": "修复报告数据缺口",
  "actions.prompt.dataQuality.body": "请先阅读本报告的数据质量与可信度章节。不要新增业务功能，先修复数据缺口：确认 Codex sessions dir、减少未识别项目、校准 generated/vendor/build/log 排除规则、提高 evidence snippet 覆盖率。完成后重新生成报告并对比数据质量变化。",
  "actions.prompt.unknownResolution.title": "诊断并修复报告 unknown",
  "actions.prompt.unknownResolution.body": "请作为 Codex Insights 的数据质量调试者工作。不要猜测缺失指标，也不要把 unknown 改写成确定事实。请检查下面的 unknown 记录、attemptedSources、可疑指标和现有 evidence。对每一项说明为什么不可用、应该修改哪个 collector/parser/config、先运行哪些静态检查命令、用什么命令验证修复。完成修改后重新运行同一条报告命令；只有拿到新 evidence 后，字段才能从 unknown 变成 known。\n\nUnknown 记录：\n{unknowns}\n\n可疑指标：\n{anomalies}\n\n相关项目：\n{projects}",
  "actions.prompt.unknownResolution.evidence": "该 prompt 来自 dataQuality 记录和 anomaly detector 输出；它是修复建议入口，不是事实替代数据。",
  "actions.prompt.default.title": "建立下一轮质量门禁",
  "actions.prompt.default.body": "请基于本报告，先列出当前 repo/workspace 的静态检查命令，再列出 test/build 命令，然后补齐最小 AGENTS.md 规则，确保下一轮 Codex 修改先静态检查、再测试构建。",
  "actions.prompt.defaultEvidence": "当前证据没有生成更紧急的项目级 prompt。"
} as const;
