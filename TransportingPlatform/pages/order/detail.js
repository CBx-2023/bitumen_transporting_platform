// pages/order/detail.js
Page({
  data: {
    orderId: '',
    userRole: '', // driver, owner, supervisor
    orderDetail: null,
    isLoading: true
  },

  onLoad: function(options) {
    const { id, role } = options;
    
    this.setData({
      orderId: id,
      userRole: role || 'driver'
    });
    
    // 加载订单详情
    this.loadOrderDetail();
  },
  
  // 加载订单详情
  loadOrderDetail: function() {
    // 模拟加载数据
    setTimeout(() => {
      // 模拟订单数据
      const orderDetail = {
        id: this.data.orderId,
        status: '运输中',
        startLocation: '北京市朝阳区建国路88号',
        endLocation: '北京市海淀区中关村大街1号',
        goodsType: '沥青',
        weight: '20吨',
        createTime: '2023-06-01 10:30',
        price: '2000元',
        remark: '请小心运输，避免颠簸。',
        ownerInfo: {
          name: '李老板',
          phone: '13900139000',
          company: '北京沥青有限公司'
        },
        driverInfo: {
          name: '张师傅',
          phone: '13800138000',
          carNumber: '京A12345'
        },
        timeline: [
          {
            time: '2023-06-01 10:30',
            event: '订单创建',
            operator: '李老板'
          },
          {
            time: '2023-06-01 11:15',
            event: '司机接单',
            operator: '张师傅'
          },
          {
            time: '2023-06-01 11:45',
            event: '开始运输',
            operator: '张师傅'
          }
        ]
      };
      
      this.setData({
        orderDetail: orderDetail,
        isLoading: false
      });
    }, 1500);
  },

  // 接单（司机）
  takeOrder: function() {
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
      const orderDetail = this.data.orderDetail;
      orderDetail.status = '运输中';
      orderDetail.driverInfo = {
        name: '张师傅',
        phone: '13800138000',
        carNumber: '京A12345'
      };
      orderDetail.timeline.push({
        time: this.formatTime(new Date()),
        event: '司机接单',
        operator: '张师傅'
      });
      
      this.setData({
        orderDetail: orderDetail
      });
    }, 1500);
  },

  // 取消订单（货主）
  cancelOrder: function() {
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
            
            // 返回上一页
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          }, 1500);
        }
      }
    });
  },

  // 完成订单（司机）
  completeOrder: function() {
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
            const orderDetail = this.data.orderDetail;
            orderDetail.status = '已完成';
            orderDetail.timeline.push({
              time: this.formatTime(new Date()),
              event: '订单完成',
              operator: '张师傅'
            });
            
            this.setData({
              orderDetail: orderDetail
            });
          }, 1500);
        }
      }
    });
  },
  
  // 确认收货（货主）
  confirmReceipt: function() {
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
            const orderDetail = this.data.orderDetail;
            orderDetail.status = '已完成';
            orderDetail.timeline.push({
              time: this.formatTime(new Date()),
              event: '确认收货',
              operator: '李老板'
            });
            
            this.setData({
              orderDetail: orderDetail
            });
          }, 1500);
        }
      }
    });
  },
  
  // 联系司机
  contactDriver: function() {
    const phone = this.data.orderDetail.driverInfo.phone;
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
  contactOwner: function() {
    const phone = this.data.orderDetail.ownerInfo.phone;
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
  viewTrack: function() {
    wx.showToast({
      title: '轨迹查看功能开发中',
      icon: 'none'
    });
  },
  
  // 开始导航
  startNavigation: function() {
    wx.showToast({
      title: '导航功能开发中',
      icon: 'none'
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