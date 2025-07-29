// pages/order/create.js
Page({
  data: {
    formData: {
      startLocation: '',
      endLocation: '',
      goodsType: '沥青',
      weight: '',
      price: '',
      remark: ''
    },
    goodsTypes: ['沥青', '水泥', '砂石', '钢材', '其他'],
    showGoodsTypePicker: false,
    isSubmitting: false
  },

  onLoad: function(options) {
    // 检查用户角色
    const app = getApp();
    if (app.globalData && app.globalData.userRole !== 'owner') {
      wx.showModal({
        title: '提示',
        content: '只有货主才能创建订单',
        showCancel: false,
        success: function(res) {
          wx.navigateBack();
        }
      });
    }
  },

  // 输入起点
  inputStartLocation: function(e) {
    this.setData({
      'formData.startLocation': e.detail.value
    });
  },

  // 输入终点
  inputEndLocation: function(e) {
    this.setData({
      'formData.endLocation': e.detail.value
    });
  },

  // 选择货物类型
  showGoodsTypePicker: function() {
    this.setData({
      showGoodsTypePicker: true
    });
  },

  // 确认货物类型选择
  confirmGoodsType: function(e) {
    this.setData({
      'formData.goodsType': this.data.goodsTypes[e.detail.value],
      showGoodsTypePicker: false
    });
  },

  // 取消货物类型选择
  cancelGoodsType: function() {
    this.setData({
      showGoodsTypePicker: false
    });
  },

  // 输入重量
  inputWeight: function(e) {
    this.setData({
      'formData.weight': e.detail.value
    });
  },

  // 输入运费
  inputPrice: function(e) {
    this.setData({
      'formData.price': e.detail.value
    });
  },

  // 输入备注
  inputRemark: function(e) {
    this.setData({
      'formData.remark': e.detail.value
    });
  },

  // 选择起点位置
  chooseStartLocation: function() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          'formData.startLocation': res.address
        });
      },
      fail: () => {
        wx.showToast({
          title: '位置选择失败',
          icon: 'none'
        });
      }
    });
  },

  // 选择终点位置
  chooseEndLocation: function() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          'formData.endLocation': res.address
        });
      },
      fail: () => {
        wx.showToast({
          title: '位置选择失败',
          icon: 'none'
        });
      }
    });
  },

  // 提交表单
  submitForm: function() {
    const { startLocation, endLocation, goodsType, weight, price } = this.data.formData;
    
    // 表单验证
    if (!startLocation) {
      wx.showToast({
        title: '请输入起点',
        icon: 'none'
      });
      return;
    }
    
    if (!endLocation) {
      wx.showToast({
        title: '请输入终点',
        icon: 'none'
      });
      return;
    }
    
    if (!weight) {
      wx.showToast({
        title: '请输入重量',
        icon: 'none'
      });
      return;
    }
    
    if (!price) {
      wx.showToast({
        title: '请输入运费',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      isSubmitting: true
    });
    
    // 模拟提交请求
    setTimeout(() => {
      this.setData({
        isSubmitting: false
      });
      
      wx.showToast({
        title: '订单创建成功',
        icon: 'success'
      });
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }, 2000);
  }
})