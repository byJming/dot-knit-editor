App({
  globalData: {
    // 素材库配置
    materials: {
      ocean: { label: '海洋', count: 10, defaultSize: 0.16 },
      food: { label: '食物', count: 12, defaultSize: 0.16 },
      star: { label: '星星', count: 12, defaultSize: 0.16 },
      gem: { label: '宝石', count: 27, defaultSize: 0.12 }
    },
    // 调色板
    palette: [
      { name: 'purple', color: '#9B59B6' },
      { name: 'sky', color: '#87CEEB' },
      { name: 'lavender', color: '#E6E6FA' },
      { name: 'pink', color: '#FFB6C1' },
      { name: 'cyan', color: '#00CED1' },
      { name: 'yellow', color: '#FFD700' },
      { name: 'coral', color: '#FF7F50' },
      { name: 'orange', color: '#FF8C00' },
      { name: 'blue', color: '#4169E1' }
    ],
    // 波点形状
    dotShapes: ['circle', 'square', 'star', 'drop', 'snowflake', 'char'],
    // 分布模式
    distributionModes: ['random', 'manual_unpaired', 'manual_paired'],
    // 布局方向
    layoutDirections: ['left_right', 'right_left', 'top_bottom', 'bottom_top'],
    // 画笔类型
    brushTypes: ['line', 'emoji', 'leaf', 'pink_thread'],
    // 背景类型
    backgroundTypes: ['solid', 'stripes', 'photo']
  }
})
