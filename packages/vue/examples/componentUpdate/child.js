import { h } from "../../dist/guide-mini-vue.esm.js";

export default {
    name: "Child",
    render() {
      return h('div', {}, [h('div', {}, `child - props - msg: ${this.$props.msg}`)]) 
    },
    setup(props, { emit }) {},
};
