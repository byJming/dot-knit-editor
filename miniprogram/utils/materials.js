/**
 * 素材配置 - 针织素材库 + 用户自上传素材管理
 */

const USER_MATERIALS_KEY = 'user_materials'

// 内置素材
const builtinMaterials = [
  { id: 'demo_circle', category: 'demo', name: '圆形', path: '', defaultSize: 0.16, isBuiltin: true },
  { id: 'demo_square', category: 'demo', name: '方形', path: '', defaultSize: 0.16, isBuiltin: true },
  { id: 'demo_star', category: 'demo', name: '星形', path: '', defaultSize: 0.16, isBuiltin: true },
]

// 获取用户自上传素材列表
function getUserMaterials() {
  try {
    const data = wx.getStorageSync(USER_MATERIALS_KEY)
    return data || []
  } catch (e) {
    return []
  }
}

// 保存用户素材到本地
function saveUserMaterial(material) {
  const list = getUserMaterials()
  list.push(material)
  try {
    wx.setStorageSync(USER_MATERIALS_KEY, list)
  } catch (e) {
    wx.showToast({ title: '存储空间不足', icon: 'none' })
  }
  return list
}

// 删除用户素材
function removeUserMaterial(id) {
  let list = getUserMaterials()
  const item = list.find(m => m.id === id)
  if (item && item.path) {
    try {
      const fs = wx.getFileSystemManager()
      fs.unlinkSync(item.path)
    } catch (e) { /* 文件可能已不存在 */ }
  }
  list = list.filter(m => m.id !== id)
  try {
    wx.setStorageSync(USER_MATERIALS_KEY, list)
  } catch (e) {}
  return list
}

// 合并内置 + 用户素材
function getAllMaterials() {
  return [...builtinMaterials, ...getUserMaterials()]
}

// 获取分类列表（包含用户分类）
function getCategories() {
  const all = getAllMaterials()
  const categoriesMap = {}
  all.forEach(m => {
    if (!categoriesMap[m.category]) {
      categoriesMap[m.category] = {
        id: m.category,
        label: getCategoryLabel(m.category),
        count: 0
      }
    }
    categoriesMap[m.category].count++
  })

  const categories = Object.values(categoriesMap)
  categories.sort((a, b) => {
    if (a.id === 'demo') return -1
    if (b.id === 'demo') return 1
    if (a.id === 'user') return 1
    if (b.id === 'user') return -1
    return 0
  })
  return categories
}

function getCategoryLabel(category) {
  const labels = {
    demo: '示例',
    user: '我的',
    ocean: '海洋',
    food: '食物',
    star: '星星',
    gem: '宝石'
  }
  return labels[category] || category
}

function getMaterialsByCategory(category) {
  return getAllMaterials().filter(m => m.category === category)
}

function getMaterialById(id) {
  return getAllMaterials().find(m => m.id === id)
}

module.exports = {
  materials: getAllMaterials(),
  getCategories,
  getMaterialsByCategory,
  getMaterialById,
  getUserMaterials,
  saveUserMaterial,
  removeUserMaterial,
  USER_MATERIALS_KEY
}
