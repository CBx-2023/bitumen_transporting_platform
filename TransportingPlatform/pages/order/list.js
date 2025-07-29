// pages/order/list.js
Page({
  data: {
    userRole: '', // 用户角色：driver, owner, supervisor
    activeTab: 0, // 当前激活的标签页：0-全部，1-待接单，2-运输中，3-已完成
    orderList: [
      {
        id: 'order001',
        status: '待接单',
        startLocation: '北京市朝阳区建国路88号',
        endLocation: '北京市海淀区中关村大街1号',
        goodsType: '沥青',
        weight: '20吨',
        createTime: '2023-06-01 10:30',
        price: '2000元',
        ownerInfo: {
          name: '李老板',
          phone: '13900139000',
          company: '北京沥青有限公司'
        }
      },
      {
        id: 'order002',
        status: '运输中',
        startLocation: '北京市西城区西长安街1号',
        endLocation: '北京市东城区东长安街1号',
        goodsType: '沥青',
        weight: '15吨',
        createTime: '2023-06-01 09:15',
        price: '1500元',
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
      },
      {
        id: 'order003',
        status: '已完成',
        startLocation: '北京市丰台区丰台路1号',
        endLocation: '北京市石景山区石景山路1号',
        goodsType: '沥青',
        weight: '18吨',
        createTime: '2023-05-31 14:20',
        price: '1800元',
        completeTime: '2023-05-31 17:45',
        ownerInfo: {
          name: '李老板',
          phone: '13900139000',
          company: '北京沥青有限公司'
        },
        driverInfo: {
          name: '王师傅',
          phone: '13700137000',
          carNumber: '京B54321'
        }
      }
    ],
    filteredOrders: [] // 根据标签页筛选后的订单列表
  },

  onLoad: function(options) {
    // 获取用户角色
    const app = getApp();
    const userRole = app.globalData && app.globalData.userRole ? app.globalData.userRole : 'driver';
    
    this.setData({
      userRole: userRole
    });
    
    // 初始化筛选订单
    this.filterOrders(0);
  },
  
  // 切换标签页
  switchTab: function(e) {
    const tabIndex = e.currentTarget.dataset.index;
    this.setData({
      activeTab: tabIndex
    });
    
    this.filterOrders(tabIndex);
  },
  
  // 根据标签页筛选订单
  filterOrders: function(tabIndex) {
    let filteredOrders = [];
    
    switch(tabIndex) {
      case 0: // 全部
        filteredOrders = this.data.orderList;
        break;
      case 1: // 待接单
        filteredOrders = this.data.orderList.filter(item => item.status === '待接单');
        break;
      case 2: // 运输中
        filteredOrders = this.data.orderList.filter(item => item.status === '运输中');
        break;
      case 3: // 已完成
        filteredOrders = this.data.orderList.filter(item => item.status === '已完成');
        break;
    }
    
    this.setData({
      filteredOrders: filteredOrders
    });
  },

  // 查看订单详情
  viewOrderDetail: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order/detail?id=${orderId}&role=${this.data.userRole}`
    });
  },

  // 接单（司机）
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
          orderList[i].driverInfo = {
            name: '张师傅',
            phone: '13800138000',
            carNumber: '京A12345'
          };
          break;
        }
      }
      
      this.setData({
        orderList: orderList
      });
      
      // 重新筛选订单
      this.filterOrders(this.data.activeTab);
    }, 1500);
  },

  // 取消订单（货主）
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
              orderList: orderList
            });
            
            // 重新筛选订单
            this.filterOrders(this.data.activeTab);
          }, 1500);
        }
      }
    });
  },

  // 完成订单（司机）
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
              orderList: orderList
            });
            
            // 重新筛选订单
            this.filterOrders(this.data.activeTab);
          }, 1500);
        }
      }
    });
  },
  
  // 确认收货（货主）
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
              orderList: orderList
            });
            
            // 重新筛选订单
            this.filterOrders(this.data.activeTab);
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