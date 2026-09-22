# 小红书小程序接入模板

这个目录是承载 H5 游戏的 `web-view` 页面模板，**不是可直接审核发布的完整小程序项目**。小红书开发者工具会按你的账号与小程序 ID 生成项目配置；请在工具中创建项目后，把这里的 `app.js`、`app.json` 和 `pages/` 复制进去。

1. 将上一级游戏目录中的 `index.html`、`style.css`、`game.js` 原样部署到自己的 HTTPS 站点，同一目录下可访问。
2. 在小红书开放平台为这个小程序配置 H5 所在的业务域名，按后台要求在域名根目录放置验证文件。
3. 将 `pages/index/index.js` 的 `gameUrl` 改为实际的 HTTPS 游戏地址。
4. 用小红书开发者工具创建项目并填入自己的小程序 ID，再导入本模板文件，编译并在真机上检查页面、音效、触摸和安全区域。
5. 确认账号可用类目、备案及审核材料后，再按后台流程提交审核。

当前模板没有真实域名、小程序 ID 或平台生成的 `project.config.json`。占位域名无法加载游戏。普通 H5 与 `web-view` 接入形式，也不等同于原生小游戏代码包；若后台要求原生小游戏，需要将玩法移植到对应运行环境。

参考：[小红书小程序介绍](https://miniapp.xiaohongshu.com/doc/DC137160)、[业务域名与 web-view 说明](https://miniapp.xiaohongshu.com/doc/DC508424)、[小游戏配置](https://miniapp.xiaohongshu.com/doc/DC519814)。
