// pages/owner/index.js
Page({
  data: {
    userInfo: {
      name: '李老板',
      avatar: '/pages/images/avatar.png',
      phone: '13900139000',
      company: '北京沥青有限公司'
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
        price: '2000元'
      },
      {
        id: 'order004',
        status: '运输中',
        startLocation: '北京市西城区西长安街1号',
        endLocation: '北京市东城区东长安街1号',
        goodsType: '沥青',
        weight: '15吨',
        createTime: '2023-06-01 09:15',
        price: '1500元',
        driverInfo: {
          name: '张师傅',
          phone: '13800138000',
          carNumber: '京A12345'
        }
      },
      {
        id: 'order005',
        status: '已完成',
        startLocation: '北京市丰台区丰台路1号',
        endLocation: '北京市石景山区石景山路1号',
        goodsType: '沥青',
        weight: '18吨',
        createTime: '2023-05-31 14:20',
        price: '1800元',
        completeTime: '2023-05-31 17:45',
        driverInfo: {
          name: '王师傅',
          phone: '13700137000',
          carNumber: '京B54321'
        }
      }
    ],
    statistics: {
      pendingOrders: 1,
      inProgressOrders: 1,
      completedOrders: 1
    }
  },

  onLoad: function(options) {
    // 页面加载时执行
    // 检查用户角色
    const app = getApp();
    if (app.globalData && app.globalData.userRole !== 'owner') {
      wx.showModal({
        title: '提示',
        content: '您不是货主角色，是否切换到角色选择页面？',
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

  // 创建新订单
  createOrder: function() {
    wx.navigateTo({
      url: '/pages/order/create'
    });
  },

  // 查看订单详情
  viewOrderDetail: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order/detail?id=${orderId}&role=owner`
    });
  },

  // 取消订单
  cancelOrder: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认取消',
      content: '确认取消该订单？取消后无法恢复。',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '处理中...',
          });
          
          // 模拟取消订单请求
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({
              title: '订单已取消',
              icon: 'success'
            });
            
            // 更新订单列表
            const orderList = this.data.orderList.filter(item => item.id !== orderId);
            
            this.setData({
              orderList: orderList,
              'statistics.pendingOrders': this.data.statistics.pendingOrders - 1
            });
          }, 1500);
        }
      }
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

  // 确认收货
  confirmReceipt: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认收货',
      content: '确认已收到货物？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '处理中...',
          });
          
          // 模拟确认收货请求
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({
              title: '已确认收货',
              icon: 'success'
            });
            
            // 更新订单状态
            const orderList = this.data.orderList;
            for (let i = 0; i < orderList.length; i++) {
              if (orderList[i].id === orderId) {
                orderList[i].status = '已完成';
                orderList[i].completeTime = this.formatTime(new Date());
                break;
              }
            }
            
            this.setData({
              orderList: orderList,
              'statistics.inProgressOrders': this.data.statistics.inProgressOrders - 1,
              'statistics.completedOrders': this.data.statistics.completedOrders + 1
            });
          }, 1500);
        }
      }
    });
  },
  
  // 格式化时间
  formatTime: function(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    
    return [year, month, day].map(this.formatNumber).join('-') + ' ' + [hour, minute].map(this.formatNumber).join(':');
  },
  
  formatNumber: function(n) {
    n = n.toString();
    return n[1] ? n : '0' + n;
  }
})