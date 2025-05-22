### Sprite Generator CLI 🖼️

一个强大的命令行工具，用于将多个图片自动组合成精灵图，并生成对应的位置信息 JSON 文件。

### 一. 功能特性 ✨

自动布局：智能计算最优宫格布局(1x1, 2x2, 3x3...)

多格式支持：支持 PNG、JPG、WebP、GIF 等多种图片格式

实时进度：显示处理进度和详细日志

元数据输出：生成包含每张图片精确位置信息的 JSON 文件

灵活配置：可调整间距、最大尺寸等参数

美观输出：彩色控制台输出，增强可读性

### 二. 安装 📦

```bash
npm install sprite-tools -g
```

### 三. 使用说明 🚀

基本用法

```bash
sprite -i ./images -o ./output
```

完整选项

```bash
sprite
-i ./images     # 输入目录(必须)
-o ./sprites    # 输出目录(默认: ./output)
-n my-sprite    # 输出文件名(默认: sprite)
-p 10           # 图片间距(默认: 0)
-m 2048         # 最大尺寸限制(默认: 4096)
```

查看帮助

```bash
sprite -h
```

### 四. 输出文件 📄

工具会生成两个文件：

[name].png - 合成的精灵图

[name].json - 包含每张图片位置信息的元数据

JSON 格式示例：

```json
{
  "spriteWidth": 1024,
  "spriteHeight": 1024,
  "gridSize": 3,
  "imageCount": 7,
  "images": {
    "icon1.png": {
      "x": 0,
      "y": 0,
      "width": 300,
      "height": 200
    },
    "icon2.jpg": {
      "x": 300,
      "y": 0,
      "width": 250,
      "height": 400
    }
  }
}
```
