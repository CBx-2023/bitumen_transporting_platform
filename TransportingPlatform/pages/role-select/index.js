// pages/role-select/index.js
Page({
  data: {
    roles: [
      { id: 'driver', name: '司机端', icon: '/pages/images/driver.png', color: '#3498db' },
      { id: 'owner', name: '货主端', icon: '/pages/images/owner.png', color: '#2ecc71' }
    ]
  },

  // { id: 'supervisor', name: '监管端', icon: '/pages/images/supervisor.png', color: '#e74c3c' }

  onLoad: function(options) {
    // 页面加载时执行
  },

  // 选择角色
  selectRole: function(e) {
    const roleId = e.currentTarget.dataset.role;
    
    // 将选择的角色保存到全局数据
    getApp().globalData = getApp().globalData || {};
    getApp().globalData.userRole = roleId;
    
    // 根据角色跳转到对应的主页
    wx.switchTab({
      url: `/pages/${roleId}/index`,
      fail: function(res) {
        // 如果switchTab失败（因为不是tabBar页面），则使用navigateTo
        wx.navigateTo({
          url: `/pages/${roleId}/index`
        });
      }
    });
  }
})