import { h, ref } from "../../dist/guide-mini-vue.esm.js";

export default {
    name: "ArrayToText",
    setup() {
        const isChange = ref(false);
        window.isChange = isChange;
        return {
            isChange,
        };
    },
    render() {
        const TextChildren = "TextChildren";
        const arrayChildren = [h("div", {}, "A"), h("div", {}, "B")];
        const self = this;
        return self.isChange === true
            ? h("div", {}, TextChildren)
            : h("div", {}, arrayChildren);
    },
};
