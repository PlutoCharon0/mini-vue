import { h, renderSlots, getCurrentInstance, inject, provide } from '../../dist/guide-mini-vue.esm.js'
export default {
    name: 'Foo',
    render() {
        console.log('插槽',this.$slots);
        const button = h('button', { onClick: this.emitAdd }, 'Foo / emitAdd' + this.count)
        const bar = {
            name: 'bar',
            render() {
                return h('p', {}, `bar ${this.foo} - ${this.aka}`)
            },
            setup() {
                const foo = inject('foo')
                const aka = inject('aka', '测试akakakakakakaka')
                return {
                    foo,
                    aka
                }
            }
        }
        // return h('div', {}, [button, renderSlots(this.$slots)])

        return h('div', { name: 'foo' }, [renderSlots(this.$slots, 'header', {
            age: 18
        }), button, renderSlots(this.$slots, 'footer'), h('p', {}, `App-provide - ${this.foo} - ${this.bar}`), h(bar)])
    },
    setup(props, { emit }) {
        const instance = getCurrentInstance()
        console.log('Foo组件实例', instance);
        const foo = inject('foo')
        const bar = inject('bar')
        provide('foo', 'foo2')
        const emitAdd = () => {
            console.log('emit-onAdd');
            emit('add-foo', 1)
        }
        console.log('foo 组件 props:', props);
        return {
            emitAdd,
            foo,
            bar
        }
    }
}