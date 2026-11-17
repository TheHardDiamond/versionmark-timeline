# Versionmark Timeline

**一张用版本号比较 AI、游戏、操作系统和硬件的整活时间线。**

[![打开 Versionmark Timeline](https://img.shields.io/badge/打开网页-Versionmark%20Timeline-216652?style=for-the-badge)](https://theharddiamond.github.io/versionmark-timeline/)

- **选曲线。** 默认显示原版九条。可以按分类搜索、切换预设，或打开 Minecraft 专场。
- **查来源。** 点击节点查看原始版本号、发布日期和来源。纵轴按各系列的编号规则绘制，例如 `1.10` 的绘图值是 `1.1`，标签仍写作 `1.10`。
- **加自己的线。** 用 [CSV 示例](public/example.csv) 在浏览器临时加载数据。每条临时线带星号，刷新后清除。
- **导出图表。** 可自定义标题、显示节点数值，选择横版或竖版 PNG / SVG。导出会保留临时曲线的星号和声明。

[投稿新曲线](https://github.com/TheHardDiamond/versionmark-timeline/issues/new?template=timeline.yml) · [更新已有曲线](https://github.com/TheHardDiamond/versionmark-timeline/issues/new?template=update.yml)

## 数据位置

[data/](data/) 是网页正式数据的来源。每条曲线单独存放在 `data/<曲线ID>.json`，例如 [原神](data/genshin.json)、[Minecraft Java](data/minecraft.json) 和 [GPT](data/gpt.json)。文件里包含版本、日期、绘图值和可核实来源。

## 本地运行

需要 Node.js 22.12 或更新版本。

```sh
npm ci
npm run dev
```

打开 [本地预览](http://127.0.0.1:5173/versionmark-timeline/)。提交改动前运行 `npm run validate:data`、`npm test` 和 `npm run build`。

## 维护与部署

在仓库 Settings → Pages 中将 Source 设为 GitHub Actions。合并到 main 后运行数据检查、构建和部署。

通过 Issue 表单提交 CSV 与来源。待审、退回、暂缓和拒绝分别使用 `review:pending`、`review:changes-requested`、`review:deferred` 和 `review:rejected`。退回和暂缓保留 Open，拒绝以 Not planned 关闭。人工核对并合并数据 PR 后以 Completed 关闭，标记 `review:accepted`。

维护者可在 Actions 手动运行“导入数据投稿”，输入 Issue 编号。开启仓库 Actions 设置中的 Allow GitHub Actions to create and approve pull requests。导入使用内置权限创建数据 PR。来源真实性由维护者核对。无法开启该权限时可在本地运行：

```sh
npm run import:csv -- timeline.csv issue-42 "产品名" games https://example.org/release
```

将生成的 JSON 加到 PR 后走同一审核流程。

发现漏更或错误时，使用「更新已有曲线」Issue。可以直接写版本、日期和来源，也可以附 CSV。核对来源后，维护者在数据 PR 中修改该曲线原有的 JSON 文件，合并后 Pages 会重新构建。普通版本号曲线的 CSV 可用下面的命令合并。同名版本会更新日期和来源，新版本会追加；改名或采用特殊取值规则的节点直接编辑 JSON。

```sh
npm run update:csv -- update.csv genshin
```
