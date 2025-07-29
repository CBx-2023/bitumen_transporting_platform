// pages/supervisor/index.js
Page({
  data: {
    userInfo: {
      name: '张监管',
      avatar: '/pages/images/avatar.png',
      phone: '13600136000',
      department: '交通运输监管部门'
    },
    orderList: [
      {
        id: 'order003',
        status: '待接单',
        startLocation: '北京市朝阳区建国路88号',
        endLocation: '北京市海淀区中关村大街1号',
        goodsType: '沥青',
        weight: '20吨',
        createTime: '2023-06-01 10:30',
        ownerInfo: {
          name: '李老板',
          phone: '13900139000',
          company: '北京沥青有限公司'
        }
      },
      {
        id: 'order004',
        status: '运输中',
        startLocation: '北京市西城区西长安街1号',
        endLocation: '北京市东城区东长安街1号',
        goodsType: '沥青',
        weight: '15吨',
        createTime: '2023-06-01 09:15',
        ownerInfo: {
          name: '李老板',
          phone: '13900139000',
          company: '北京沥青有限公司'
        },
        driverInfo: {
          name: '张师傅',
          phone: '13800138000',
          carNumber: '京A12345'
        }
      }
    ],
    statistics: {
      totalOrders: 128,
      activeDrivers: 45,
      activeOwners: 23
    }
  },

  onLoad: function(options) {
    // 页面加载时执行
    // 检查用户角色
    const app = getApp();
    if (app.globalData && app.globalData.userRole !== 'supervisor') {
      wx.showModal({
        title: '提示',
        content: '您不是监管角色，是否切换到角色选择页面？',
        success: function(res) {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/role-select/index'
            });
          }
        }
      });
    }
  },

  // 查看订单详情
  viewOrderDetail: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order/detail?id=${orderId}&role=supervisor`
    });
  },

  // 联系司机
  contactDriver: function(e) {
    const phone = e.currentTarget.dataset.phone;
    wx.makePhoneCall({
      phoneNumber: phone,
      fail: function() {
        wx.showToast({
          title: '拨打电话失败',
          icon: 'none'
        });
      }
    });
  },

  // 联系货主
  contactOwner: function(e) {
    const phone = e.currentTarget.dataset.phone;
    wx.makePhoneCall({
      phoneNumber: phone,
      fail: function() {
        wx.showToast({
          title: '拨打电话失败',
          icon: 'none'
        });
      }
    });
  },

  // 查看轨迹
  viewTrack: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showToast({
      title: '轨迹查看功能开发中',
      icon: 'none'
    });
  }
})