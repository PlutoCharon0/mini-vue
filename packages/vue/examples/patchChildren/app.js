import { h } from "../../dist/guide-mini-vue.esm.js";
import ArrayToText from "./ArrayToText.js";
import TextToText from "./TextToText.js";
import TextToArray from "./TextToArray.js";
import ArrayToArray from "./ArrayToArray.js";
export default {
    name: "App",
    render() {
        return h("div", { id: "root" }, [
            h("p", {}, "主页"),
            // h(ArrayToText), // children: array to text
            // h(TextToText), // children: text to text
            // h(TextToArray), // children: text to array
            h(ArrayToArray), // children: array to array
        ]);
    },
    setup() {},
};
