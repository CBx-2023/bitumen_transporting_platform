// pages/driver/index.js
Page({
  data: {
    userInfo: {
      name: '张师傅',
      avatar: '/pages/images/avatar.png',
      phone: '13800138000',
      carNumber: '京A12345',
      status: '空闲中' // 可选值：空闲中、运输中
    },
    orderList: [
      {
        id: 'order001',
        status: '待接单',
        startLocation: '北京市朝阳区建国路88号',
        endLocation: '北京市海淀区中关村大街1号',
        goodsType: '沥青',
        weight: '20吨',
        createTime: '2023-06-01 10:30',
        price: '2000元'
      },
      {
        id: 'order002',
        status: '运输中',
        startLocation: '北京市西城区西长安街1号',
        endLocation: '北京市东城区东长安街1号',
        goodsType: '沥青',
        weight: '15吨',
        createTime: '2023-06-01 09:15',
        price: '1500元'
      }
    ],
    statistics: {
      todayOrders: 2,
      monthOrders: 15,
      totalOrders: 128
    }
  },

  onLoad: function(options) {
    // 页面加载时执行
    // 检查用户角色
    const app = getApp();
    if (app.globalData && app.globalData.userRole !== 'driver') {
      wx.showModal({
        title: '提示',
        content: '您不是司机角色，是否切换到角色选择页面？',
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

  // 接单
  takeOrder: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showLoading({
      title: '接单中...',
    });
    
    // 模拟接单请求
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '接单成功',
        icon: 'success'
      });
      
      // 更新订单状态
      const orderList = this.data.orderList;
      for (let i = 0; i < orderList.length; i++) {
        if (orderList[i].id === orderId) {
          orderList[i].status = '运输中';
          break;
        }
      }
      
      this.setData({
        orderList: orderList,
        'userInfo.status': '运输中'
      });
    }, 1500);
  },

  // 查看订单详情
  viewOrderDetail: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order/detail?id=${orderId}&role=driver`
    });
  },

  // 开始导航
  startNavigation: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showToast({
      title: '导航功能开发中',
      icon: 'none'
    });
  },

  // 完成订单
  completeOrder: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认完成',
      content: '确认已完成该订单的运输任务？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '处理中...',
          });
          
          // 模拟完成订单请求
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({
              title: '订单已完成',
              icon: 'success'
            });
            
            // 更新订单列表
            const orderList = this.data.orderList.filter(item => item.id !== orderId);
            
            this.setData({
              orderList: orderList,
              'userInfo.status': orderList.some(item => item.status === '运输中') ? '运输中' : '空闲中',
              'statistics.todayOrders': this.data.statistics.todayOrders + 1
            });
          }, 1500);
        }
      }
    });
  }
})