Component({
  properties: {
    color: {
      type: String,
      value: '#000000'
    }
  },

  data: {
    showPicker: false,
    hue: 0,
    saturation: 100,
    brightness: 100,
    hexColor: '#000000'
  },

  observers: {
    'color': function (newColor) {
      if (newColor) {
        const hsv = this.hexToHsv(newColor)
        this.setData({
          hue: hsv.h,
          saturation: hsv.s,
          brightness: hsv.v,
          hexColor: newColor
        })
      }
    }
  },

  methods: {
    onTap() {
      // 打开选择器时从当前 color 初始化滑块
      const hsv = this.hexToHsv(this.data.hexColor)
      this.setData({
        showPicker: !this.data.showPicker,
        hue: hsv.h,
        saturation: hsv.s,
        brightness: hsv.v
      })
    },

    onHueChange(e) {
      this.setData({ hue: parseInt(e.detail.value) })
      this.updateColor()
    },

    onSaturationChange(e) {
      this.setData({ saturation: parseInt(e.detail.value) })
      this.updateColor()
    },

    onBrightnessChange(e) {
      this.setData({ brightness: parseInt(e.detail.value) })
      this.updateColor()
    },

    updateColor() {
      const { hue, saturation, brightness } = this.data
      const color = this.hsvToHex(hue, saturation, brightness)
      this.setData({ hexColor: color })
      this.triggerEvent('change', { color })
    },

    hexToHsv(hex) {
      hex = hex.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16) / 255
      const g = parseInt(hex.substring(2, 4), 16) / 255
      const b = parseInt(hex.substring(4, 6), 16) / 255

      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const delta = max - min

      let h = 0
      if (delta !== 0) {
        if (max === r) {
          h = ((g - b) / delta) % 6
        } else if (max === g) {
          h = (b - r) / delta + 2
        } else {
          h = (r - g) / delta + 4
        }
      }
      h = Math.round(h * 60)
      if (h < 0) h += 360

      const s = max === 0 ? 0 : Math.round((delta / max) * 100)
      const v = Math.round(max * 100)

      return { h, s, v }
    },

    hsvToHex(h, s, v) {
      s = s / 100
      v = v / 100

      const c = v * s
      const x = c * (1 - Math.abs((h / 60) % 2 - 1))
      const m = v - c

      let r, g, b

      if (h < 60) {
        r = c; g = x; b = 0
      } else if (h < 120) {
        r = x; g = c; b = 0
      } else if (h < 180) {
        r = 0; g = c; b = x
      } else if (h < 240) {
        r = 0; g = x; b = c
      } else if (h < 300) {
        r = x; g = 0; b = c
      } else {
        r = c; g = 0; b = x
      }

      r = Math.round((r + m) * 255)
      g = Math.round((g + m) * 255)
      b = Math.round((b + m) * 255)

      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    },

    onConfirm() {
      this.setData({ showPicker: false })
      this.triggerEvent('confirm', { color: this.data.hexColor })
    },

    onCancel() {
      this.setData({ showPicker: false })
      this.triggerEvent('cancel')
    }
  }
})
