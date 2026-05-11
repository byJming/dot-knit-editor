# 素材目录

此目录用于存放针织素材图片。

## 素材要求

- 格式：PNG（支持透明背景）
- 建议尺寸：128x128 或 256x256 像素
- 命名规则：`{category}_{number}.png`

## 素材分类

项目支持以下 4 类素材：

| 分类 | 前缀 | 数量 | 说明 |
|-----|------|------|------|
| 海洋 | ocean | 10 | 海洋主题元素 |
| 食物 | food | 12 | 美食主题元素 |
| 星星 | star | 12 | 星空主题元素 |
| 宝石 | gem | 27 | 宝石主题元素 |

## 添加素材

1. 准备 PNG 格式的素材图片
2. 按命名规则重命名，例如：`ocean_01.png`、`food_01.png`
3. 放入此目录
4. 修改 `utils/materials.js` 中的素材配置

## 示例

```
stamps/
├── ocean_01.png
├── ocean_02.png
├── food_01.png
├── food_02.png
├── star_01.png
├── star_02.png
├── gem_01.png
├── gem_02.png
└── README.md
```
