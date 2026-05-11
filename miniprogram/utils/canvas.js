/**
 * Canvas 工具类 - 波点、针织素材、画笔绘制
 */

// 波点绘制器
const DotRenderer = {
  // 生成波点
  // distribution: 'random' (精确 count 个随机位置) | 'grid' (行列均匀分布)
  generateDots(config, canvasWidth, canvasHeight) {
    const dots = []
    const { count, size, variance } = config
    const shape = config.shape || 'circle'
    const distribution = config.distribution || 'random'

    const minSize = 5
    const maxSize = Math.min(canvasWidth, canvasHeight) / 8

    if (distribution === 'grid') {
      const aspectRatio = canvasWidth / canvasHeight
      const cols = Math.max(1, Math.round(Math.sqrt(count * aspectRatio)))
      const rows = Math.max(1, Math.ceil(count / cols))
      const spacingX = canvasWidth / cols
      const spacingY = canvasHeight / rows

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const offsetX = (Math.random() - 0.5) * spacingX * 0.4
          const offsetY = (Math.random() - 0.5) * spacingY * 0.4
          const x = col * spacingX + spacingX / 2 + offsetX
          const y = row * spacingY + spacingY / 2 + offsetY

          if (x >= 0 && x <= canvasWidth && y >= 0 && y <= canvasHeight) {
            dots.push(this._makeDot(x, y, canvasWidth, canvasHeight, size, variance, shape, minSize, maxSize))
          }
        }
      }
    } else {
      // random: 精确生成 count 个点
      for (let i = 0; i < count; i++) {
        const x = Math.random() * canvasWidth
        const y = Math.random() * canvasHeight
        dots.push(this._makeDot(x, y, canvasWidth, canvasHeight, size, variance, shape, minSize, maxSize))
      }
    }

    return dots
  },

  // 构造单个波点
  _makeDot(x, y, canvasWidth, canvasHeight, size, variance, shape, minSize, maxSize) {
    let sizeVariation = size + (Math.random() - 0.5) * variance * size * 0.02
    sizeVariation = Math.max(minSize, Math.min(maxSize, sizeVariation))
    return {
      x: x / canvasWidth,
      y: y / canvasHeight,
      size: sizeVariation,
      shape: shape || 'circle'
    }
  },

  // 随机重排所有波点位置
  shuffleDots(dots) {
    return dots.map(dot => ({
      ...dot,
      x: Math.random(),
      y: Math.random()
    }))
  },

  // 筛选指定区域内的波点
  filterDotsInRegion(dots, canvasWidth, canvasHeight, regionX, regionY, regionW, regionH) {
    return dots.filter(dot => {
      const dx = dot.x * canvasWidth
      const dy = dot.y * canvasHeight
      return dx >= regionX && dx <= regionX + regionW &&
             dy >= regionY && dy <= regionY + regionH
    })
  },

  // 绘制单个波点形状路径
  _drawShapePath(ctx, shape, x, y, size) {
    switch (shape) {
      case 'circle':
        ctx.moveTo(x + size, y)
        ctx.arc(x, y, size, 0, Math.PI * 2)
        break
      case 'square':
        ctx.moveTo(x - size, y - size)
        ctx.rect(x - size, y - size, size * 2, size * 2)
        break
      case 'star':
        this.drawStarPath(ctx, x, y, 5, size, size * 0.5)
        break
      case 'drop':
        this.drawDropPath(ctx, x, y, size)
        break
      case 'snowflake':
        this.drawSnowflakePath(ctx, x, y, size)
        break
      case 'char':
        // 字符波点：用圆形作为裁剪路径，字符绘制在 text overlay 层
        ctx.moveTo(x + size, y)
        ctx.arc(x, y, size, 0, Math.PI * 2)
        break
      default:
        ctx.moveTo(x + size, y)
        ctx.arc(x, y, size, 0, Math.PI * 2)
    }
  },

  // 绘制波点拼接效果
  // 背景完整显示，波点区域显示原图
  drawDotMask(ctx, dots, canvasWidth, canvasHeight, image, imageX, imageY, imageWidth, imageHeight) {
    if (!dots || dots.length === 0 || !image) return

    ctx.save()

    // 1. 建立裁剪路径：所有波点形状合并
    ctx.beginPath()
    dots.forEach(dot => {
      const x = dot.x * canvasWidth
      const y = dot.y * canvasHeight
      const size = Math.max(2, dot.size)
      this._drawShapePath(ctx, dot.shape, x, y, size)
    })

    // 2. 裁剪：只在波点区域内可见
    ctx.clip()

    // 3. 在裁剪区域内绘制原图
    ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight)

    ctx.restore()
  },

  // 绘制星形路径
  drawStarPath(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3
    let step = Math.PI / spikes

    ctx.moveTo(cx, cy - outerRadius)

    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(
        cx + Math.cos(rot) * outerRadius,
        cy + Math.sin(rot) * outerRadius
      )
      rot += step
      ctx.lineTo(
        cx + Math.cos(rot) * innerRadius,
        cy + Math.sin(rot) * innerRadius
      )
      rot += step
    }

    ctx.lineTo(cx, cy - outerRadius)
    ctx.closePath()
  },

  // 绘制水滴路径
  drawDropPath(ctx, x, y, size) {
    ctx.moveTo(x, y - size)
    ctx.bezierCurveTo(
      x + size, y - size * 0.5,
      x + size, y + size * 0.5,
      x, y + size
    )
    ctx.bezierCurveTo(
      x - size, y + size * 0.5,
      x - size, y - size * 0.5,
      x, y - size
    )
    ctx.closePath()
  },

  // 绘制雪花路径
  drawSnowflakePath(ctx, x, y, size) {
    const arms = 6
    const lineWidth = size * 0.15

    for (let i = 0; i < arms; i++) {
      const angle = (i / arms) * Math.PI * 2
      const endX = x + Math.cos(angle) * size
      const endY = y + Math.sin(angle) * size
      const perpX = Math.cos(angle + Math.PI / 2) * lineWidth
      const perpY = Math.sin(angle + Math.PI / 2) * lineWidth

      ctx.moveTo(x + perpX, y + perpY)
      ctx.lineTo(endX + perpX, endY + perpY)
      ctx.lineTo(endX - perpX, endY - perpY)
      ctx.lineTo(x - perpX, y - perpY)
      ctx.closePath()
    }
  }
}

// 绘制内置素材
function drawBuiltinMaterial(ctx, materialId, x, y, size, color) {
  ctx.save()
  ctx.fillStyle = color || '#333333'

  switch (materialId) {
    case 'demo_circle':
      ctx.beginPath()
      ctx.arc(x, y, size / 2, 0, Math.PI * 2)
      ctx.fill()
      break

    case 'demo_square':
      ctx.fillRect(x - size / 2, y - size / 2, size, size)
      break

    case 'demo_star':
      drawStarShape(ctx, x, y, 5, size / 2, size / 4)
      break
  }

  ctx.restore()
}

// 绘制星形
function drawStarShape(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = Math.PI / 2 * 3
  let step = Math.PI / spikes

  ctx.beginPath()
  ctx.moveTo(cx, cy - outerRadius)

  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(
      cx + Math.cos(rot) * outerRadius,
      cy + Math.sin(rot) * outerRadius
    )
    rot += step
    ctx.lineTo(
      cx + Math.cos(rot) * innerRadius,
      cy + Math.sin(rot) * innerRadius
    )
    rot += step
  }

  ctx.lineTo(cx, cy - outerRadius)
  ctx.closePath()
  ctx.fill()
}

module.exports = {
  DotRenderer,
  drawBuiltinMaterial
}
