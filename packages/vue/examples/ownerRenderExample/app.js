import { h } from "../../dist/guide-mini-vue.esm.js";
export default {
    name: "app",
    render() {
        return h('rect', {x: this.x, y: this.y},)
    },
    setup() {
        return {
            x: 100,
            y: 100,
        };
    },
};
