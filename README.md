# Versionmark Timeline

跨 AI、游戏、系统和硬件的版本号时间线。图上的值按各系列的编号口径计算，仅供整活。点选节点可查看发布来源。

## 本地运行

需要 Node.js 22.12 或更新版本。

```sh
npm ci
npm run dev
npm run validate:data
npm test
npm run build
```

本地页面路径为 `/versionmark-timeline/`。临时 CSV 仅保留在当前页面内存。示例见 [example.csv](public/example.csv)。导出可选择横版或竖版 PNG / SVG，临时曲线的星号与声明会保留。

## 维护与部署

在仓库 Settings → Pages 中将 Source 设为 GitHub Actions。合并到 main 后运行数据检查、构建和部署。

通过 Issue 表单提交 CSV 与来源。待审、退回、暂缓和拒绝分别使用 `review:pending`、`review:changes-requested`、`review:deferred` 和 `review:rejected`。退回和暂缓保留 Open，拒绝以 Not planned 关闭。人工核对并合并数据 PR 后以 Completed 关闭，标记 `review:accepted`。

维护者可在 Actions 手动运行“导入数据投稿”，输入 Issue 编号。开启仓库 Actions 设置中的 Allow GitHub Actions to create and approve pull requests。导入使用内置权限创建数据 PR。来源真实性由维护者核对。无法开启该权限时可在本地运行：

```sh
npm run import:csv -- timeline.csv issue-42 "产品名" games https://example.org/release
```

将生成的 JSON 加到 PR 后走同一审核流程。
