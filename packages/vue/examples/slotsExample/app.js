import { createTextVNode, h } from "../../dist/guide-mini-vue.esm.js"
import foo from "./foo.js"
export default {
  name: 'App',
  setup() {

  },
  render() {
    return h('div', {}, [
      h(foo, {}, {
        header: () => h('p', {}, 'header'),
        footer: (props) => [h('p', {}, 'footer'), createTextVNode(props.payload)]
      })
    ])
  }
}