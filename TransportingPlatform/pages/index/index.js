// index.js
Page({
  data: {
    phone: '',
    password: '',
    isLogin: true, // 控制显示登录还是注册表单
    isLoading: false
  },

  onLoad: function(options) {
    // 检查是否已登录
    const token = wx.getStorageSync('token');
    if (token) {
      // 已登录，跳转到角色选择页面
      wx.navigateTo({
        url: '/pages/role-select/index'
      });
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },

  // 切换登录/注册表单
  switchForm: function() {
    this.setData({
      isLogin: !this.data.isLogin
    });
  },

  // 输入手机号
  inputPhone: function(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  // 输入密码
  inputPassword: function(e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 提交表单
  submitForm: function() {
    const { phone, password, isLogin } = this.data;
    
    // 简单的表单验证
    if (!phone || phone.length !== 11) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
    
    if (!password || password.length < 6) {
      wx.showToast({
        title: '密码不能少于6位',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ isLoading: true });
    
    // 模拟登录/注册请求
    setTimeout(() => {
      this.setData({ isLoading: false });
      
      // 保存登录状态
      wx.setStorageSync('token', 'demo_token');
      wx.setStorageSync('phone', phone);
      
      // 跳转到角色选择页面
      wx.navigateTo({
        url: '/pages/role-select/index'
      });
      
      // 清空输入信息
      this.setData({
        phone: '',
        password: '',
      })
    }, 1500);
  }
})