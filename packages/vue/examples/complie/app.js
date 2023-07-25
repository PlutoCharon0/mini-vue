export default {
  name: 'App',
  template: `<div>hi,{{message}}</div>`,
  setup() {
    return {
      message: "mini-vue"
    }
  }
}