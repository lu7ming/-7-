# 鹿7铭 · 人生工作台 — 安装与使用说明

## 这是什么

你的人生工作台，已经打包成一个 **PWA（渐进式 Web 应用）**。
它的特点是：

- **离线可用**：打开一次后，断网也能照常使用
- **可安装到桌面**：像原生 App 一样有图标、全屏运行
- **数据全在本机**：所有记录存在你设备的 localStorage + IndexedDB 里，不上传任何服务器
- **终生持有**：这个 zip 就是你的副本，保存好就永远可用

## 文件清单

```
人生工作台-App/
├── life.html              ← 主程序（双击即可在浏览器打开）
├── manifest.json          ← 应用配置（名称、图标、主题色）
├── service-worker.js      ← 离线缓存逻辑
└── icons/                 ← 各尺寸图标
    ├── icon-192.png
    ├── icon-512.png
    ├── icon-maskable-512.png
    ├── apple-touch-icon.png
    ├── favicon-32.png
    └── icon.svg
```

## 怎么用

### 方式一：直接打开（最简单）
解压后双击 `life.html`，浏览器即可使用全部功能。
**缺点**：这种方式下 Service Worker 不生效（file:// 协议限制），无法离线、无法安装到桌面。

### 方式二：本地起服务（推荐，解锁离线 + 可安装）
需要本机有一个静态服务器。任选其一：

**Python（Mac 自带）：**
```bash
cd 解压后的目录
python3 -m http.server 8080
```
然后浏览器打开 `http://localhost:8080/life.html`

**Node：**
```bash
npx serve .
```

打开后，浏览器地址栏会出现「安装」按钮（⊕ 图标），点击即可安装到桌面/启动器。

### 方式三：部署到免费静态托管（可手机访问）
把整个文件夹上传到 GitHub Pages / Vercel / Netlify / Cloudflare Pages，
即可获得一个永久网址，手机 Safari/Chrome 打开后能「添加到主屏幕」。

## 各平台安装方法

| 平台 | 浏览器 | 安装方式 |
|------|--------|----------|
| **Windows / Mac 桌面** | Chrome / Edge | 地址栏右侧 ⊕ 图标 → 安装 |
| **Android** | Chrome | 菜单 ⋮ → 添加到主屏幕 |
| **iPhone / iPad** | Safari | 分享按钮 → 添加到主屏幕 |

安装后会以**独立窗口、全屏**运行，看起来就像原生 App。

## 数据安全

- 所有数据存放在浏览器本地（localStorage 主存 + IndexedDB 备份）
- **换浏览器 / 换设备 / 清缓存会丢数据**，请定期用「数据」按钮导出 JSON 备份
- 工作台每 7 天也会自动导出一份备份到下载文件夹
- 换设备时：旧设备导出 JSON → 新设备导入即可

## 更新

未来如果想更新到新版本，只需用新版 `life.html` 替换旧文件即可。
数据不受影响（存在 localStorage，与文件分离）。
如遇缓存旧版，在浏览器按 `Ctrl+Shift+R`（Mac: `Cmd+Shift+R`）强制刷新一次。

---

祝使用愉快。这个工作台是你的，它会陪你很久。
