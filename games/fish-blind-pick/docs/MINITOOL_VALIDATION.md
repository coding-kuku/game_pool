# 小红书小工具打包校验

- 日期：2026-09-22
- 规范：`.codex/minitool-zip-builder` 1.6.0
- 产物：`release/fish-blind-pick.zip`（11,630 字节）

## 修复

- 将转场遮罩的 `inset: 0` 改为 `top/right/bottom/left: 0`，为 Chrome 61 提供基础定位。
- 转场期间将背景按钮移出键盘 Tab 顺序，补足旧内核不支持 `inert` 时的交互回退。

## 校验结果

- ZIP 根目录直接包含唯一 `index.html`；其余只有 `app.js`、`styles.css`、`src/game.js`，均为允许的文件类型，没有外层目录。
- HTML 使用中文语言、UTF-8、规定的 viewport 和相对资源路径；脚本为包内经典脚本，无内联脚本、外链或被禁用的 Web API。
- 没有 Base64 静态资源、WebGL 或 JSBridge 调用。Web Audio 音效在运行时先检测能力，不可用时游戏仍可继续。
- 对干净的运行目录执行 `audit_artifact.mjs`：`PASS: 4 file(s), 0 warning(s)`。
- 对最终 ZIP 执行同一审计脚本：`PASS: 1 file(s), 0 warning(s)`；ZIP 内 4 个文件的 SHA-256 均与项目运行文件一致。
- `node --check` 检查两个 JS 文件通过；`node --test tests/game.test.js`：5 项通过。

## 尚未实测

Chrome 61 / Android 8.1 的运行与 CSS 兼容性、小红书 PC 模拟器和真机表现、加载耗时及帧率均未实测。以上结果是静态门禁及本地测试结果。
