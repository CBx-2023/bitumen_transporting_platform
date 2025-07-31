// pages/user/index.js
Page({
  data: {
    userRole: '', // driver, owner, supervisor
    userInfo: {
      driver: {
        name: '张师傅',
        avatar: '/pages/images/avatar.png',
        phone: '13800138000',
        carNumber: '京A12345',
        status: '空闲中',
        balance: '5280.00',
        completedOrders: 128,
        rating: '4.9'
      },
      owner: {
        name: '李老板',
        avatar: '/pages/images/avatar.png',
        phone: '13900139000',
        company: '北京沥青有限公司',
        balance: '12580.00',
        publishedOrders: 256,
        completedOrders: 235
      },
      supervisor: {
        name: '张监管',
        avatar: '/pages/images/avatar.png',
        phone: '13600136000',
        department: '交通运输监管部门',
        managedOrders: 1024,
        managedDrivers: 45,
        managedOwners: 23
      }
    },
    menuItems: {
      common: [
        { icon: 'profile', text: '个人资料', path: '/pages/user/profile' },
        { icon: 'settings', text: '设置', path: '/pages/user/settings' },
        { icon: 'help', text: '帮助中心', path: '/pages/user/help' }
      ],
      driver: [
        { icon: 'wallet', text: '我的钱包', path: '/pages/user/wallet' },
        { icon: 'star', text: '我的评价', path: '/pages/user/rating' },
        { icon: 'car', text: '车辆信息', path: '/pages/user/vehicle' }
      ],
      owner: [
        { icon: 'wallet', text: '我的钱包', path: '/pages/user/wallet' },
        { icon: 'company', text: '企业信息', path: '/pages/user/company' },
        { icon: 'invoice', text: '发票管理', path: '/pages/user/invoice' }
      ],
      supervisor: [
        { icon: 'stats', text: '数据统计', path: '/pages/user/stats' },
        { icon: 'report', text: '异常报告', path: '/pages/user/report' },
        { icon: 'verify', text: '审核管理', path: '/pages/user/verify' }
      ]
    }
  },

  onLoad: function(options) {
    // 获取用户角色
    const app = getApp();
    const userRole = app.globalData && app.globalData.userRole ? app.globalData.userRole : 'driver';
    
    this.setData({
      userRole: userRole
    });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },
  
  // 切换角色
  switchRole: function() {
    wx.navigateTo({
      url: '/pages/role-select/index'
    });
  },
  
  // 点击菜单项
  onMenuItemClick: function(e) {
    const path = e.currentTarget.dataset.path;
    
    // 检查页面是否存在
    if (path) {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      });
    }
  },
  
  // 退出登录
  logout: function() {
    wx.showModal({
      title: '确认退出',
      content: '确认退出登录？',
      success: function(res) {
        if (res.confirm) {
          // 清除登录状态
          wx.removeStorageSync('token');
          wx.removeStorageSync('phone');
          
          // 跳转到登录页
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }
      }
    });
  }
})