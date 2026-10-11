# 本地验收

在此目录运行 `npm install`，再运行 `npm test`。需要Node.js，jsdom只用于开发验收，游戏本体不依赖它。

`node simulation.cjs`：100局固定输入随机策略压力测试。

`node make-fixture.cjs`：生成第5年的独立验收页面review.html，使用内存存档，不影响主游戏进度。

`node classic-check.cjs /path/to/baseline.html`：历史版本对照。本轮修正了利润和天赋，不要求与旧版数值相同。
