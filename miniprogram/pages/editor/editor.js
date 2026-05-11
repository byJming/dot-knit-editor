const { DotRenderer, drawBuiltinMaterial } = require('../../utils/canvas')
const { getCategories, getMaterialsByCategory, getMaterialById, saveUserMaterial, removeUserMaterial } = require('../../utils/materials')

Page({
  data: {
    // 画布尺寸
    canvasWidth: 375,
    canvasHeight: 375,

    // 当前工具
    currentTool: 'dot',

    // 图片相关
    imageSrc: '',
    hasImage: false,

    // 拼接布局配置
    layoutConfig: {
      enabled: false,
      directionIndex: 0
    },
    layoutDirections: ['left_right', 'right_left', 'top_bottom', 'bottom_top'],
    layoutDirectionLabels: ['主图在左', '主图在右', '主图在上', '主图在下'],

    // 波点配置
    dotConfig: {
      shapeIndex: 0,
      density: 5,
      distributionIndex: 0,
      size: 15,
      variance: 30
    },
    dotShapes: ['circle', 'square', 'star', 'drop', 'snowflake', 'char'],
    shapeLabels: ['圆形', '方形', '星形', '水滴', '雪花', '字符'],
    distributionLabels: ['随机', '网格'],
    distributionValues: ['random', 'grid'],
    dots: [],
    hasDots: false,

    // 针织素材
    categories: [],
    currentCategory: 'demo',
    currentMaterials: [],
    selectedMaterial: '',
    placedMaterials: [],
    selectedPlacedMaterial: null,

    // 画笔配置
    brushConfig: {
      typeIndex: 0,
      width: 5,
      colorIndex: 0
    },
    brushTypeLabels: ['线条', '表情', '树叶', '粉线'],
    brushStrokes: [],

    // 背景配置
    backgroundConfig: {
      typeIndex: 0,
      color: '#E8E0D8',
      stripeColor1: '#FFB6C1',
      stripeColor2: '#87CEEB',
      stripeWidth: 20,
      imageSrc: ''
    },
    backgroundLabels: ['纯色', '条纹', '照片'],

    // 调色板
    palette: [
      { name: 'white', color: '#FFFFFF' },
      { name: 'black', color: '#000000' },
      { name: 'purple', color: '#9B59B6' },
      { name: 'sky', color: '#87CEEB' },
      { name: 'pink', color: '#FFB6C1' },
      { name: 'cyan', color: '#00CED1' },
      { name: 'yellow', color: '#FFD700' },
      { name: 'coral', color: '#FF7F50' },
      { name: 'orange', color: '#FF8C00' },
      { name: 'blue', color: '#4169E1' }
    ],

    // 触摸状态
    isDrawing: false,

    // 颜色选择器
    showColorPicker: false,
    colorPickerTarget: '',
    customColor: '#FFFFFF'
  },

  canvas: null,
  ctx: null,
  mainImage: null,
  bgImage: null,
  materialImages: {},
  _redrawTimer: null,

  onLoad() {
    this.setData({
      categories: getCategories(),
      currentMaterials: getMaterialsByCategory('demo')
    })
  },

  onReady() {
    this.initCanvas()
  },

  // 初始化画布
  initCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#mainCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')

        this.canvas = canvas
        this.ctx = ctx

        const dpr = wx.getWindowInfo().pixelRatio || 2
        const width = this.data.canvasWidth
        const height = this.data.canvasHeight

        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)

        this.redraw()
      })
  },

  // 重绘画布
  redraw() {
    if (!this.ctx) return

    const { canvasWidth, canvasHeight, hasDots, dots, layoutConfig } = this.data
    const ctx = this.ctx

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // 1. 绘制背景
    this.drawBackground()

    // 2. 图片/波点层
    if (layoutConfig.enabled && this.mainImage) {
      this.drawSplitLayout()
    } else if (hasDots && dots && dots.length > 0 && this.mainImage) {
      this.drawDotOverlay()
    } else {
      this.drawImage()
    }

    // 3. 绘制已放置的素材
    this.drawPlacedMaterials()

    // 4. 绘制画笔笔触
    this.drawBrushStrokes()
  },

  _scheduleRedraw() {
    if (this._redrawTimer) return
    this._redrawTimer = setTimeout(() => {
      this._redrawTimer = null
      this.redraw()
    }, 16)
  },

  // 绘制背景
  drawBackground() {
    const { backgroundConfig, canvasWidth, canvasHeight } = this.data
    const ctx = this.ctx

    ctx.save()

    switch (backgroundConfig.typeIndex) {
      case 0: // 纯色
        ctx.fillStyle = backgroundConfig.color
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)
        break

      case 1: // 条纹
        const stripeWidth = backgroundConfig.stripeWidth
        ctx.fillStyle = backgroundConfig.stripeColor1
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        ctx.fillStyle = backgroundConfig.stripeColor2
        for (let i = -canvasHeight; i < canvasWidth + canvasHeight; i += stripeWidth * 2) {
          ctx.beginPath()
          ctx.moveTo(i, 0)
          ctx.lineTo(i - canvasHeight, canvasHeight)
          ctx.lineTo(i - canvasHeight + stripeWidth, canvasHeight)
          ctx.lineTo(i + stripeWidth, 0)
          ctx.closePath()
          ctx.fill()
        }
        break

      case 2: // 照片
        if (this.bgImage) {
          ctx.drawImage(this.bgImage, 0, 0, canvasWidth, canvasHeight)
        } else {
          ctx.fillStyle = '#F0F0F0'
          ctx.fillRect(0, 0, canvasWidth, canvasHeight)
        }
        break
    }

    ctx.restore()
  },

  // 绘制图片
  drawImage() {
    if (!this.mainImage) return

    const ctx = this.ctx
    const { canvasWidth, canvasHeight } = this.data
    const img = this.mainImage

    const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height) * 0.95
    const width = img.width * scale
    const height = img.height * scale
    const x = (canvasWidth - width) / 2
    const y = (canvasHeight - height) / 2

    ctx.save()
    ctx.drawImage(img, x, y, width, height)
    ctx.restore()
  },

  // 绘制波点遮罩效果（拼接效果）
  drawDotOverlay() {
    const { dots, canvasWidth, canvasHeight } = this.data
    if (!dots || dots.length === 0 || !this.mainImage) return

    const ctx = this.ctx
    const img = this.mainImage

    const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height) * 0.95
    const width = img.width * scale
    const height = img.height * scale
    const x = (canvasWidth - width) / 2
    const y = (canvasHeight - height) / 2

    DotRenderer.drawDotMask(ctx, dots, canvasWidth, canvasHeight, img, x, y, width, height)
  },

  // 绘制拼接布局（主图 + 拓展各占一半，无分割比例）
  drawSplitLayout() {
    const { layoutConfig, dots, canvasWidth, canvasHeight } = this.data
    const ctx = this.ctx
    const img = this.mainImage
    const dir = layoutConfig.directionIndex

    const SPLIT = 0.5
    const dotCoverColor = '#E8E0D8'

    let imageRegion, extendRegion, mainMaxW, mainMaxH

    switch (dir) {
      case 0: // 主图在左，拓展在右
        mainMaxW = canvasWidth * SPLIT
        mainMaxH = canvasHeight
        imageRegion = { x: 0, y: 0, w: mainMaxW, h: canvasHeight }
        extendRegion = { x: mainMaxW, y: 0, w: canvasWidth * SPLIT, h: canvasHeight }
        break
      case 1: // 主图在右，拓展在左
        mainMaxW = canvasWidth * SPLIT
        mainMaxH = canvasHeight
        extendRegion = { x: 0, y: 0, w: canvasWidth * SPLIT, h: canvasHeight }
        imageRegion = { x: canvasWidth * SPLIT, y: 0, w: mainMaxW, h: canvasHeight }
        break
      case 2: // 主图在上，拓展在下
        mainMaxW = canvasWidth
        mainMaxH = canvasHeight * SPLIT
        imageRegion = { x: 0, y: 0, w: canvasWidth, h: mainMaxH }
        extendRegion = { x: 0, y: mainMaxH, w: canvasWidth, h: canvasHeight * SPLIT }
        break
      case 3: // 主图在下，拓展在上
        mainMaxW = canvasWidth
        mainMaxH = canvasHeight * SPLIT
        extendRegion = { x: 0, y: 0, w: canvasWidth, h: canvasHeight * SPLIT }
        imageRegion = { x: 0, y: canvasHeight * SPLIT, w: canvasWidth, h: mainMaxH }
        break
    }

    // 图片适配主图区域
    const imgScale = Math.min(mainMaxW / img.width, mainMaxH / img.height) * 0.9
    const imgW = img.width * imgScale
    const imgH = img.height * imgScale
    const imgBaseX = (mainMaxW - imgW) / 2
    const imgBaseY = (mainMaxH - imgH) / 2
    const imgX = imageRegion.x + imgBaseX
    const imgY = imageRegion.y + imgBaseY
    const extImgX = extendRegion.x + imgBaseX
    const extImgY = extendRegion.y + imgBaseY

    // === 主图区域：完整原图 + 波点纯色覆盖 ===
    ctx.save()
    ctx.beginPath()
    ctx.rect(imageRegion.x, imageRegion.y, imageRegion.w, imageRegion.h)
    ctx.clip()
    ctx.drawImage(img, imgX, imgY, imgW, imgH)

    if (dots && dots.length > 0) {
      const imageDots = DotRenderer.filterDotsInRegion(
        dots, canvasWidth, canvasHeight,
        imageRegion.x, imageRegion.y, imageRegion.w, imageRegion.h
      )
      if (imageDots.length > 0) {
        ctx.save()
        ctx.beginPath()
        imageDots.forEach(dot => {
          const dx = dot.x * canvasWidth
          const dy = dot.y * canvasHeight
          DotRenderer._drawShapePath(ctx, dot.shape, dx, dy, Math.max(2, dot.size))
        })
        ctx.clip()
        ctx.fillStyle = dotCoverColor
        ctx.fillRect(imageRegion.x, imageRegion.y, imageRegion.w, imageRegion.h)
        ctx.restore()
      }
    }
    ctx.restore()

    // === 拓展区域：波点窗口 ===
    if (dots && dots.length > 0) {
      const extendDots = DotRenderer.filterDotsInRegion(
        dots, canvasWidth, canvasHeight,
        extendRegion.x, extendRegion.y, extendRegion.w, extendRegion.h
      )
      if (extendDots.length > 0) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(extendRegion.x, extendRegion.y, extendRegion.w, extendRegion.h)
        ctx.clip()
        DotRenderer.drawDotMask(ctx, extendDots, canvasWidth, canvasHeight, img, extImgX, extImgY, imgW, imgH)
        ctx.restore()
      }
    } else if (img) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(extendRegion.x, extendRegion.y, extendRegion.w, extendRegion.h)
      ctx.clip()
      ctx.drawImage(img, extImgX, extImgY, imgW, imgH)
      ctx.restore()
    }
  },

  // 绘制已放置的素材
  drawPlacedMaterials() {
    const { placedMaterials, canvasWidth, canvasHeight } = this.data
    if (!placedMaterials || placedMaterials.length === 0) return

    const ctx = this.ctx

    placedMaterials.forEach(material => {
      const assetInfo = getMaterialById(material.assetId)
      const isBuiltin = assetInfo && assetInfo.isBuiltin
      const image = this.materialImages[material.assetId]

      if (isBuiltin || image) {
        ctx.save()

        const x = material.centerXRatio * canvasWidth
        const y = material.centerYRatio * canvasHeight
        const size = material.sizeRatio * Math.min(canvasWidth, canvasHeight)

        ctx.translate(x, y)
        ctx.rotate((material.rotationDegrees * Math.PI) / 180)

        if (isBuiltin) {
          drawBuiltinMaterial(ctx, material.assetId, 0, 0, size, material.color || '#333333')
        } else {
          ctx.drawImage(image, -size / 2, -size / 2, size, size)
        }

        if (this.data.selectedPlacedMaterial && material.id === this.data.selectedPlacedMaterial.id) {
          ctx.strokeStyle = '#eae3d9'
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.strokeRect(-size / 2 - 5, -size / 2 - 5, size + 10, size + 10)
        }

        ctx.restore()
      }
    })
  },

  // 绘制画笔笔触
  drawBrushStrokes() {
    const { brushStrokes } = this.data
    if (!brushStrokes || brushStrokes.length === 0) return

    const ctx = this.ctx

    brushStrokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length < 2) return

      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      switch (stroke.type) {
        case 'line':
          ctx.strokeStyle = stroke.color
          ctx.lineWidth = stroke.width
          ctx.beginPath()
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
          }
          ctx.stroke()
          break

        case 'emoji':
          ctx.fillStyle = stroke.color
          ctx.font = `${stroke.width * 3}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          for (let i = 0; i < stroke.points.length; i += Math.max(1, Math.floor(stroke.width / 2))) {
            const pt = stroke.points[i]
            ctx.fillText('⭐', pt.x, pt.y)
          }
          break

        case 'leaf':
          ctx.fillStyle = stroke.color
          for (let i = 0; i < stroke.points.length; i += Math.max(1, Math.floor(stroke.width / 2))) {
            const pt = stroke.points[i]
            this._drawLeafShape(ctx, pt.x, pt.y, stroke.width * 2.5)
          }
          break

        case 'pink_thread':
          ctx.strokeStyle = stroke.color
          ctx.lineWidth = stroke.width * 1.5
          ctx.globalAlpha = 0.6
          ctx.beginPath()
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
          }
          ctx.stroke()
          break

        default:
          ctx.strokeStyle = stroke.color
          ctx.lineWidth = stroke.width
          ctx.beginPath()
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
          }
          ctx.stroke()
      }

      ctx.restore()
    })
  },

  // 画叶子形状
  _drawLeafShape(ctx, x, y, size) {
    ctx.beginPath()
    ctx.moveTo(x, y - size)
    ctx.bezierCurveTo(
      x + size * 0.5, y - size * 0.4,
      x + size * 0.5, y + size * 0.4,
      x, y + size
    )
    ctx.bezierCurveTo(
      x - size * 0.5, y + size * 0.4,
      x - size * 0.5, y - size * 0.4,
      x, y - size
    )
    ctx.closePath()
    ctx.fill()
  },

  // ========== 工具切换 ==========
  switchTool(e) {
    const tool = e.currentTarget.dataset.tool
    this.setData({ currentTool: tool })
  },

  // ========== 图片选择 ==========
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const src = res.tempFiles[0].tempFilePath
        // 导入新图片时重置所有设置为默认值
        this.mainImage = null
        this.bgImage = null
        this.materialImages = {}
        this.setData({
          imageSrc: src,
          hasImage: true,
          dots: [],
          hasDots: false,
          dotConfig: { shapeIndex: 0, density: 5, distributionIndex: 0, size: 15, variance: 30 },
          layoutConfig: { enabled: false, directionIndex: 0 },
          brushConfig: { typeIndex: 0, width: 5, colorIndex: 0 },
          backgroundConfig: { typeIndex: 0, color: '#E8E0D8', stripeColor1: '#FFB6C1', stripeColor2: '#87CEEB', stripeWidth: 20, imageSrc: '' },
          placedMaterials: [],
          selectedPlacedMaterial: null,
          brushStrokes: [],
          currentTool: 'dot'
        })

        if (!this.canvas) {
          wx.showToast({ title: '画布未就绪，请稍后重试', icon: 'none' })
          return
        }
        const img = this.canvas.createImage()
        img.onload = () => {
          this.mainImage = img
          this.redraw()
        }
        img.onerror = () => {
          wx.showToast({ title: '图片加载失败', icon: 'none' })
        }
        img.src = src
      }
    })
  },

  // ========== 拼接布局相关 ==========
  onLayoutToggle(e) {
    this.setData({ 'layoutConfig.enabled': e.detail.value })
    this.redraw()
  },

  onLayoutDirectionChange(e) {
    this.setData({ 'layoutConfig.directionIndex': parseInt(e.detail.value) })
    this.redraw()
  },

  // ========== 波点相关 ==========
  onDotShapeChange(e) {
    this.setData({ 'dotConfig.shapeIndex': parseInt(e.detail.value) })
  },

  onDotDensityChange(e) {
    this.setData({ 'dotConfig.density': parseInt(e.detail.value) })
  },

  onDotDistributionChange(e) {
    this.setData({ 'dotConfig.distributionIndex': parseInt(e.detail.value) })
  },

  onDotSizeChange(e) {
    this.setData({ 'dotConfig.size': parseInt(e.detail.value) })
  },

  onDotVarianceChange(e) {
    this.setData({ 'dotConfig.variance': parseInt(e.detail.value) })
  },

  // 密度 → 实际数量映射
  mapDensityToCount(density, canvasWidth, canvasHeight) {
    const area = canvasWidth * canvasHeight
    const baseCount = area / 2500
    const multiplier = density / 5
    return Math.max(5, Math.round(baseCount * multiplier))
  },

  generateDots() {
    if (!this.mainImage) {
      wx.showToast({ title: '请先选择图片', icon: 'none' })
      return
    }

    const { dotConfig, dotShapes, canvasWidth, canvasHeight, distributionValues } = this.data
    const count = this.mapDensityToCount(dotConfig.density, canvasWidth, canvasHeight)

    const config = {
      count,
      shape: dotShapes[dotConfig.shapeIndex],
      size: dotConfig.size,
      variance: dotConfig.variance,
      distribution: distributionValues[dotConfig.distributionIndex]
    }

    wx.showLoading({ title: '生成中...' })

    setTimeout(() => {
      const dots = DotRenderer.generateDots(config, canvasWidth, canvasHeight)
      this.setData({ dots, hasDots: dots.length > 0 })
      this.redraw()
      wx.hideLoading()
      wx.showToast({ title: '已生成波点', icon: 'success', duration: 1200 })
    }, 50)
  },

  shuffleDots() {
    const { dots, canvasWidth, canvasHeight } = this.data
    if (!dots || dots.length === 0) return

    const shuffled = DotRenderer.shuffleDots(dots)
    this.setData({ dots: shuffled })
    this.redraw()
    wx.showToast({ title: '已随机重排', icon: 'success', duration: 1000 })
  },

  clearDots() {
    this.setData({ dots: [], hasDots: false })
    this.redraw()
  },

  // ========== 针织素材相关 ==========
  switchCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      currentCategory: category,
      currentMaterials: getMaterialsByCategory(category),
      selectedMaterial: ''
    })
  },

  // 用户上传素材
  uploadUserMaterial() {
    const that = this
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success(res) {
        const tempPath = res.tempFiles[0].tempFilePath
        const fs = wx.getFileSystemManager()
        const fileName = `stamp_${Date.now()}.png`
        const savePath = `${wx.env.USER_DATA_PATH}/${fileName}`

        fs.copyFile({
          srcPath: tempPath,
          destPath: savePath,
          success() {
            const material = {
              id: `user_${Date.now()}`,
              category: 'user',
              name: '自上传',
              path: savePath,
              defaultSize: 0.16,
              isBuiltin: false
            }
            saveUserMaterial(material)
            that.refreshCategories()
            that.setData({
              currentCategory: 'user',
              currentMaterials: getMaterialsByCategory('user')
            })
            wx.showToast({ title: '素材已保存', icon: 'success' })
          },
          fail() {
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        })
      }
    })
  },

  // 长按删除自上传素材
  deleteUserMaterial(e) {
    const id = e.currentTarget.dataset.id
    const material = getMaterialById(id)
    if (!material || material.isBuiltin) return

    wx.showModal({
      title: '删除素材',
      content: '确定删除该素材？',
      success: (res) => {
        if (res.confirm) {
          removeUserMaterial(id)
          // 清除已缓存的图片
          if (this.materialImages[id]) {
            delete this.materialImages[id]
          }
          this.refreshCategories()
          this.setData({
            currentMaterials: getMaterialsByCategory(this.data.currentCategory),
            selectedMaterial: '',
            placedMaterials: this.data.placedMaterials.filter(m => m.assetId !== id),
            selectedPlacedMaterial: null
          })
          this.redraw()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  // 刷新分类列表
  refreshCategories() {
    this.setData({ categories: getCategories() })
  },

  selectMaterial(e) {
    const id = e.currentTarget.dataset.id
    const material = getMaterialById(id)

    if (!material) return

    this.setData({ selectedMaterial: id })
    this.loadMaterialImage(material)
  },

  loadMaterialImage(material) {
    if (material.isBuiltin) {
      this.addMaterialToCanvas(material)
      return
    }

    if (!material.path) {
      wx.showToast({ title: '请先添加素材图片', icon: 'none' })
      return
    }

    if (this.materialImages[material.id]) {
      this.addMaterialToCanvas(material)
      return
    }

    if (!this.canvas) {
      wx.showToast({ title: '画布未就绪，请稍后重试', icon: 'none' })
      return
    }
    const img = this.canvas.createImage()
    img.onload = () => {
      this.materialImages[material.id] = img
      this.addMaterialToCanvas(material)
    }
    img.onerror = () => {
      wx.showToast({ title: '素材加载失败', icon: 'none' })
    }
    img.src = material.path
  },

  addMaterialToCanvas(material) {
    const { placedMaterials } = this.data

    const newMaterial = {
      id: `placed_${Date.now()}`,
      assetId: material.id,
      centerXRatio: 0.3 + Math.random() * 0.4,
      centerYRatio: 0.3 + Math.random() * 0.4,
      sizeRatio: material.defaultSize,
      rotationDegrees: 0,
      color: '#333333'
    }

    this.setData({
      placedMaterials: [...placedMaterials, newMaterial],
      selectedPlacedMaterial: newMaterial
    })

    this.redraw()
    wx.showToast({ title: '已添加素材', icon: 'success' })
  },

  onMaterialSizeChange(e) {
    this.updateSelectedMaterial({ sizeRatio: parseInt(e.detail.value) / 100 })
  },

  onMaterialRotationChange(e) {
    this.updateSelectedMaterial({ rotationDegrees: parseInt(e.detail.value) })
  },

  updateSelectedMaterial(updates) {
    const { selectedPlacedMaterial, placedMaterials } = this.data
    if (!selectedPlacedMaterial) return

    const index = placedMaterials.findIndex(m => m.id === selectedPlacedMaterial.id)
    if (index === -1) return

    const updated = { ...placedMaterials[index], ...updates }
    const newMaterials = [...placedMaterials]
    newMaterials[index] = updated

    this.setData({
      placedMaterials: newMaterials,
      selectedPlacedMaterial: updated
    })

    this._scheduleRedraw()
  },

  deleteSelectedMaterial() {
    const { selectedPlacedMaterial, placedMaterials } = this.data
    if (!selectedPlacedMaterial) return

    this.setData({
      placedMaterials: placedMaterials.filter(m => m.id !== selectedPlacedMaterial.id),
      selectedPlacedMaterial: null
    })

    this.redraw()
  },

  clearMaterials() {
    this.setData({ placedMaterials: [], selectedPlacedMaterial: null })
    this.redraw()
  },

  // ========== 画笔相关 ==========
  onBrushTypeChange(e) {
    this.setData({ 'brushConfig.typeIndex': parseInt(e.detail.value) })
  },

  onBrushWidthChange(e) {
    this.setData({ 'brushConfig.width': parseInt(e.detail.value) })
  },

  selectBrushColor(e) {
    this.setData({ 'brushConfig.colorIndex': parseInt(e.currentTarget.dataset.index) })
  },

  undoBrush() {
    const { brushStrokes } = this.data
    if (brushStrokes.length > 0) {
      this.setData({ brushStrokes: brushStrokes.slice(0, -1) })
      this.redraw()
    }
  },

  clearBrush() {
    this.setData({ brushStrokes: [] })
    this.redraw()
  },

  // ========== 背景相关 ==========
  onBackgroundTypeChange(e) {
    this.setData({ 'backgroundConfig.typeIndex': parseInt(e.detail.value) })
    this.redraw()
  },

  onBgColorChange(e) {
    this.setData({ 'backgroundConfig.color': e.detail.color })
    this.redraw()
  },

  onStripeColor1Change(e) {
    this.setData({ 'backgroundConfig.stripeColor1': e.detail.color })
    this.redraw()
  },

  onStripeColor2Change(e) {
    this.setData({ 'backgroundConfig.stripeColor2': e.detail.color })
    this.redraw()
  },

  onStripeWidthChange(e) {
    this.setData({ 'backgroundConfig.stripeWidth': parseInt(e.detail.value) })
    this.redraw()
  },

  chooseBackgroundImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const src = res.tempFiles[0].tempFilePath
        if (!this.canvas) {
          wx.showToast({ title: '画布未就绪，请稍后重试', icon: 'none' })
          return
        }
        const img = this.canvas.createImage()
        img.onload = () => {
          this.bgImage = img
          this.setData({ 'backgroundConfig.imageSrc': src })
          this.redraw()
        }
        img.src = src
      }
    })
  },

  // ========== 触摸事件 ==========
  onTouchStart(e) {
    if (!this.canvas) return

    const touch = e.touches[0]
    const x = touch.x
    const y = touch.y

    this.setData({ isDrawing: true })

    if (this.data.currentTool === 'brush') {
      const { brushConfig, palette } = this.data
      const color = palette[brushConfig.colorIndex].color

      this.setData({
        brushStrokes: [...this.data.brushStrokes, {
          type: ['line', 'emoji', 'leaf', 'pink_thread'][brushConfig.typeIndex],
          color,
          width: brushConfig.width,
          points: [{ x, y }]
        }]
      })
    } else if (this.data.currentTool === 'knit') {
      this.checkMaterialSelection(x, y)
    }
  },

  onTouchMove(e) {
    if (!this.data.isDrawing || !this.canvas) return

    const touch = e.touches[0]
    const x = touch.x
    const y = touch.y

    if (this.data.currentTool === 'brush') {
      const { brushStrokes } = this.data
      if (brushStrokes.length > 0) {
        const lastStroke = { ...brushStrokes[brushStrokes.length - 1] }
        lastStroke.points = [...lastStroke.points, { x, y }]

        const newStrokes = [...brushStrokes]
        newStrokes[newStrokes.length - 1] = lastStroke

        this.setData({ brushStrokes: newStrokes })
        this.redraw()
      }
    } else if (this.data.currentTool === 'knit' && this.data.selectedPlacedMaterial) {
      const { canvasWidth, canvasHeight } = this.data
      this.updateSelectedMaterial({
        centerXRatio: x / canvasWidth,
        centerYRatio: y / canvasHeight
      })
    }
  },

  onTouchEnd() {
    this.setData({ isDrawing: false })
  },

  checkMaterialSelection(x, y) {
    const { placedMaterials, canvasWidth, canvasHeight } = this.data
    let selected = null

    for (let i = placedMaterials.length - 1; i >= 0; i--) {
      const m = placedMaterials[i]
      const mx = m.centerXRatio * canvasWidth
      const my = m.centerYRatio * canvasHeight
      const size = m.sizeRatio * Math.min(canvasWidth, canvasHeight) / 2

      if (Math.abs(x - mx) < size && Math.abs(y - my) < size) {
        selected = m
        break
      }
    }

    this.setData({ selectedPlacedMaterial: selected })
    this.redraw()
  },

  // ========== 颜色选择器 ==========
  showBgColorPicker() {
    this.setData({ showColorPicker: true, colorPickerTarget: 'bg', customColor: this.data.backgroundConfig.color })
  },

  showStripeColor1Picker() {
    this.setData({ showColorPicker: true, colorPickerTarget: 'stripe1', customColor: this.data.backgroundConfig.stripeColor1 })
  },

  showStripeColor2Picker() {
    this.setData({ showColorPicker: true, colorPickerTarget: 'stripe2', customColor: this.data.backgroundConfig.stripeColor2 })
  },

  hideColorPicker() {
    this.setData({ showColorPicker: false, colorPickerTarget: '' })
  },

  selectPresetColor(e) {
    this.applyColor(e.currentTarget.dataset.color)
  },

  onCustomColorInput(e) {
    this.setData({ customColor: e.detail.value })
  },

  applyCustomColor() {
    let color = this.data.customColor.trim()
    if (!color.startsWith('#')) color = '#' + color
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      this.applyColor(color)
    } else {
      wx.showToast({ title: '颜色格式错误', icon: 'none' })
    }
  },

  applyColor(color) {
    const { colorPickerTarget } = this.data

    switch (colorPickerTarget) {
      case 'bg':
        this.setData({ 'backgroundConfig.color': color })
        break
      case 'stripe1':
        this.setData({ 'backgroundConfig.stripeColor1': color })
        break
      case 'stripe2':
        this.setData({ 'backgroundConfig.stripeColor2': color })
        break
    }

    this.hideColorPicker()
    this.redraw()
  },

  // ========== 导出 ==========
  exportImage() {
    if (!this.canvas) {
      wx.showToast({ title: '画布未初始化', icon: 'none' })
      return
    }

    wx.showLoading({ title: '导出中...' })

    const dpr = wx.getWindowInfo().pixelRatio || 2
    const w = this.data.canvasWidth
    const h = this.data.canvasHeight

    // 导出整个画布，使用高 DPR 确保清晰度
    wx.canvasToTempFilePath({
      canvas: this.canvas,
      x: 0,
      y: 0,
      width: Math.round(w * dpr),
      height: Math.round(h * dpr),
      destWidth: Math.round(w * dpr),
      destHeight: Math.round(h * dpr),
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading()
            wx.showToast({ title: '已保存到相册', icon: 'success' })
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        })
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '导出失败', icon: 'none' })
      }
    })
  },

  // 重置画布
  resetCanvas() {
    this.mainImage = null
    this.bgImage = null
    this.materialImages = {}
    this.setData({
      imageSrc: '',
      hasImage: false,
      dots: [],
      hasDots: false,
      placedMaterials: [],
      selectedPlacedMaterial: null,
      brushStrokes: []
    })
    this.redraw()
    wx.showToast({ title: '已重置', icon: 'success' })
  }
})
