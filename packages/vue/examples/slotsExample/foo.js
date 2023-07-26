import { h, renderSlots } from "../../dist/guide-mini-vue.esm.js"

export default {
  name: 'Foo',
  setup() {

  },
  render() {
    return h('div', {}, [renderSlots(this.$slots, 'header'), renderSlots(this.$slots, 'footer', {
      payload: 111
    })])
  }
}