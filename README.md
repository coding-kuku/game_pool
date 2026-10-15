# 小游戏合集

收集可以直接在手机浏览器试玩的小游戏。每个游戏独立放在 `games/` 下；有共用资源时再添加 `shared/`。

当前仓库收录 2 款游戏。

## 游戏列表

| 游戏 | 玩法 | 入口 |
| --- | --- | --- |
| [鲨牙危机](./games/shark-snap/README.md) | 聚会轮流按鲨鱼的 18 颗牙，随机一颗会触发咬合；每局随机展示 5 种主题之一。 | [游戏页面](./games/shark-snap/index.html) |
| [盲选小鱼](./games/fish-blind-pick/README.md) | 两人轮流盲选 8 条鱼，全部选完后逐条揭晓长度并计算总分。 | [游戏页面](./games/fish-blind-pick/index.html) |

鲨牙危机的小红书「小工具」离线包见[下载 ZIP](./games/shark-snap/dist/鲨牙危机-小红书小工具.zip)。其余 H5 站点包和小程序 `web-view` 接入包也放在游戏目录的 `dist/` 下，使用方式见[游戏说明](./games/shark-snap/README.md)。

盲选小鱼的小红书「小工具」离线包见[下载 ZIP](./games/fish-blind-pick/release/fish-blind-pick.zip)，使用与验证说明见[游戏说明](./games/fish-blind-pick/README.md)。

## 试玩

下载或克隆仓库后，用手机浏览器打开任一游戏目录中的 `index.html`，或者将仓库部署为静态网站。若在 GitHub 仓库设置中启用 Pages（`main` 分支、根目录），在线地址分别为：

- `https://coding-kuku.github.io/game_pool/games/shark-snap/`
- `https://coding-kuku.github.io/game_pool/games/fish-blind-pick/`

## 目录

```text
games/
├── fish-blind-pick/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── src/                    # 可测试的游戏核心逻辑
│   ├── tests/                  # Node.js 逻辑测试
│   ├── docs/                   # 验证记录、设计稿与实机画面
│   └── release/                # 小工具离线 ZIP 与游戏图标
└── shark-snap/
    ├── index.html
    ├── style.css
    ├── game.js
    ├── README.md
    ├── dist/                   # 小工具离线 ZIP 与其他部署包
    └── xhs-miniapp-template/   # 小红书 web-view 接入模板
```
