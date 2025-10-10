Component({
  data: {
    selected: 0,
    list: [
      { pagePath: "/pages/index/index", text: "首页" },
      { pagePath: "/pages/order/list", text: "订单" },
      { pagePath: "/pages/user/index", text: "我的" }
    ]
  },
  methods: {
    switchTab(e) {
      const { path, index } = e.currentTarget.dataset;
      this.setData({ selected: index }, () => {
        wx.switchTab({ url: path });
      });
    },
    updateSelected() {
      const pages = getCurrentPages();
      if (!pages.length) return;
      
      const currentRoute = `/${pages[pages.length - 1].route}`;
      const matchedIndex = this.data.list.findIndex(item => item.pagePath === currentRoute);
      
      if (matchedIndex !== -1) {
        this.setData({ selected: matchedIndex });
      }
    }
  },
  attached() {
    this.updateSelected();
  }
});