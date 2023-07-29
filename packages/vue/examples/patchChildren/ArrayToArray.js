import { h, ref } from "../../dist/guide-mini-vue.esm.js";

export default {
    name: "ArrayToArray",
    setup() {
        const isChange = ref(false);
        window.isChange = isChange;
        return {
            isChange,
        };
    },
    render() {
        /* const prevChildren = [ // 左侧对比
            h("div", { key: "A" }, "A"),
            h("div", { key: "B" }, "B"),
            h("div", { key: "C" }, "C"),
        ];
        const nextChildren = [
            h("div", { key: "A" }, "A"),
            h("div", { key: "B" }, "B"),
            h("div", { key: "D" }, "D"),
            h("div", { key: "E" }, "E"),
        ]; // i = 2 e1 = 2 e2 = 3 */
// --------------------------------------------------------------------------------
        /*  const prevChildren = [ // 左侧对比 新children 比 旧children多节点
            h("div", { key: "A" }, "A"),  
            h("div", { key: "B" }, "B"),
        ];
        const nextChildren = [
            h("div", { key: "A" }, "A"),
            h("div", { key: "B" }, "B"),
            h("div", { key: "C" }, "C"),
            h("div", { key: "D" }, "D"),
        ]; // i = 2 e1 = 1 e2 = 3 */
// --------------------------------------------------------------------------------
        /* const prevChildren = [ // 右侧对比
            h("div", { key: "A" }, "A"),
            h("div", { key: "B" }, "B"),
            h("div", { key: "C" }, "C"),
        ];
        const nextChildren = [
            h("div", { key: "D" }, "D"),
            h("div", { key: "E" }, "E"),
            h("div", { key: "B" }, "B"),
            h("div", { key: "C" }, "C"),      
        ]; // i = 0 e1 = 0 e2 = 1*/
// --------------------------------------------------------------------------------
        /*  const prevChildren = [ // 右侧对比 新children 比 旧children多节点
            h("div", { key: "A" }, "A"),
            h("div", { key: "B" }, "B"),
        ];
        const nextChildren = [
            h("div", { key: "D" }, "D"),
            h("div", { key: "C" }, "C"),
            h("div", { key: "A" }, "A"),
            h("div", { key: "B" }, "B"),
        ]; // i = 0 e1 = -1 e2 = 0 */
// --------------------------------------------------------------------------------
        /*  const prevChildren = [
            // 左侧对比 新children 比 旧children少节点
            h("div", { key: "A" }, "A"),
            h("div", { key: "B" }, "B"),
            h("div", { key: "C" }, "C"),
            h("div", { key: "D" }, "D"),
        ];
        const nextChildren = [
            h("div", { key: "A" }, "A"),
            h("div", { key: "B" }, "B"),
        ]; // i = 2  e1 = 2 e2 = 1 */
// --------------------------------------------------------------------------------
      /*   const prevChildren = [ // 右侧对比 新children 比 旧children少节点
            h("div", { key: "A" }, "A"),
            h("div", { key: "B" }, "B"),
            h("div", { key: "C" }, "C"),
            h("div", { key: "D" }, "D"),
        ];
        const nextChildren = [
            h("div", { key: "C" }, "C"),
            h("div", { key: "D" }, "D"),
        ]; // i = 0  e1 = 1 e2 = -1 */
// --------------------------------------------------------------------------------
        const prevChildren = [ // 中间区域对比 创建新的 删除旧的 移动位置
            h('div', { key: 'A' }, "A"),
            h('div', { key: 'B' }, "B"),
            h('div', { key: 'C', id: 'c-prev' }, "C"),
            h('div', { key: 'D' }, "D"),
            h('div', { key: 'K' }, "K"),
            h('div', { key: 'O' }, "O"),
            h('div', { key: 'E' }, "E"),
            h('div', { key: 'F' }, "F"),
        ]
        const nextChildren = [
            h('div', { key: 'A' }, "A"),
            h('div', { key: 'B' }, "B"),
            h('div', { key: 'G' }, "G"),
            h('div', { key: 'O' }, "O"),
            h('div', { key: 'C', id: 'c-next' }, "C"),
            h('div', { key: 'D',}, "D"),
            h('div', { key: 'E' }, "E"),
            h('div', { key: 'F' }, "F"),
        ] // C D K O  2 3 4 5----- G O C D 2 3 4 5   
        const self = this;
        return self.isChange === true
            ? h("div", {}, nextChildren)
            : h("div", {}, prevChildren);
    },
};
