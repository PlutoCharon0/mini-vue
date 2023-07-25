import { h, ref } from "../../dist/guide-mini-vue.esm.js";

export default {
    name: "TextToText",
    setup() {
        const isChange = ref(false);
        window.isChange = isChange;
        return {
            isChange,
        };
    },
    render() {
        const oldTextChildren = "old--TextChildren";
        const newTextChildren = "new--TextChildren";
        const self = this;
        return self.isChange === true
            ? h("div", {}, oldTextChildren)
            : h("div", {}, newTextChildren);
    },
};
