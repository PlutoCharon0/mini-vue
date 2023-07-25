import { h, ref, effect } from "../../dist/guide-mini-vue.esm.js";
window.self = null;
export default {
    name: "APP",
    setup() {
        const count = ref(0);

        const onClick = () => {
            count.value++;
        };
        const props = ref({
            foo: 'foo',
            bar: 'bar'
        })
        const changeProps1 = () => {
            props.value.foo = 'new-foo'
        }
        const changeProps2 = () => {
            props.value.foo = undefined
        }
        const changeProps3 = () => {
            props.value = {
                foo: 'foo',
                aka: 'aa'
            }
        }
        return {
            count,
            onClick,
            props,
            changeProps1,
            changeProps2,
            changeProps3
        };
    },
    render() {
        return h("div", { id: "root", ...this.props }, [
            h("div", {}, `count:${this.count}`),
            h("button", { onClick: this.onClick }, '自增'),
            h("button", { onClick: this.changeProps1 }, '改变属性值 添加 或 更改原值'),
            h("button", { onClick: this.changeProps2 }, '改变属性值 更改原值 为undefin / null'),
            h("button", { onClick: this.changeProps3 }, '改变属性值 删除属性'),
        ]);
    },
};
