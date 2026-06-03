export const agentsRulesMessages = {
  "agentsRules.staticFirst.title": "先做静态检查，再运行测试和构建",
  "agentsRules.staticFirst.text": "验收代码改动时，先运行静态检查：rg、rg --files、grep、git diff、git show、find、tree。静态检查通过后，再运行项目对应的 test/build 命令。",
  "agentsRules.staticFirst.reason": "这种顺序更容易先发现误改、缺文件、残留不完整实现和不符合规则的文本，再进入成本更高的测试构建。",
  "agentsRules.commandFailure.title": "失败命令必须记录修复动作",
  "agentsRules.commandFailure.text": "如果命令失败，必须记录失败命令、错误分类、修复动作和复跑结果；不能只说已修复。",
  "agentsRules.commandFailure.reason": "session history 已出现失败命令证据，规则化记录能减少重复排查。",
  "agentsRules.default.title": "先静态检查，再测试构建",
  "agentsRules.default.text": "验收代码改动时，先运行 git status --short、git diff --stat、find、grep；静态检查通过后，再运行项目对应的 test/build 命令。",
  "agentsRules.default.reason": "当前报告需要可重复的质量证据，静态检查能先发现误改和残留不完整实现。",
  "agentsRules.default.evidence": "报告级证据：workspace scan 和 command evidence 表明这条规则有价值。",
  "agentsRules.copy.single": "单条 copy：复制任一规则文本。",
  "agentsRules.copy.all": "Copy all：复制本节所有规则文本。"
} as const;
