import {
    h,
    ref,
    getCurrentInstance,
    nextTick,
} from "../../dist/guide-mini-vue.esm.js";
import Child from "./child.js";
export default {
    name: "App",
    render() {
        return h("div", {}, [
            h("div", {}, "hello vue"),
            h(
                "button",
                { onClick: this.changeChildProps },
                "change child props"
            ),
            h(Child, { msg: this.msg }),
            h("button", { onClick: this.changeCount }, "change self count"),
            h("p", {}, `count:${this.count}`),
        ]);
    },
    setup() {
        const msg = ref("123");
        const count = ref(1);

        window.msg = msg;
        const instance = getCurrentInstance();
        const changeChildProps = () => {
            msg.value = "456";
        };
        const changeCount = async () => {
            for (let i = 0; i <= 100; i++) {
                count.value = i;
            }
            // debugger;
            console.log(instance.vnode.el.childNodes);
            /*  await nextTick()
            console.log(instance.vnode.el.childNodes); */
            nextTick(() => {
                console.log(instance.vnode.el.childNodes);
            });
        };
        return {
            msg,
            count,
            changeChildProps,
            changeCount,
        };
    },
};
