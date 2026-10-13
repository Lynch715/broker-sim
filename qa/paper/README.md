# 本地验收

在此目录运行 `npm install`，再运行 `npm test`。需要Node.js，jsdom只用于开发验收，游戏本体不依赖它。

`node simulation.cjs`：100局固定输入随机策略压力测试。

`node make-fixture.cjs`：生成第5年的独立验收页面review.html，使用内存存档，不影响主游戏进度。

`node classic-check.cjs /path/to/baseline.html`：历史版本对照。本轮修正了利润和天赋，不要求与旧版数值相同。

2026-10-13：`node compat.cjs` 检查 ES2019 解析、旧版主题接口、画布缺失、旧档迁移、员工头像稳定性和启动恢复入口。`node make-compat-fixture.cjs` 生成隔离的旧接口开局与第九年读档页面，存档仅存在测试页内存中。
