import { h, createTextVNode, getCurrentInstance, provide } from '../../dist/guide-mini-vue.esm.js'
import Foo from './foo.js'
window.self = null
export default {
    name: 'APP',
    render() {
        window.self = this;
        const onAddFoo = (payload) => {
            console.log('emit-onAdd-sucess' + ' payload ' + payload);
        }
        return h('div', {
            id: 'root',
            class: ['container', 'bar'],
        }, [
            h('p',{ class: 'red' }, 'hi'),
            h('p',{ class: 'blue', onClick: () => { console.log('handleClick')} }, this.msg),
           /*  h(Foo, { count: 1 , onAddFoo }, {
                default: () =>  h('p', {}, 'header')
            }) // 单个插槽内容 */
           /*  h(Foo, { count: 1 , onAddFoo },  { 
                default:  () => [h('p', {}, 'header'),h('p', {}, 'footer')]
            }) // 多个插槽内容 */
           /*  h(Foo, { count: 1 , onAddFoo },  {
                header: () => [h('p', {}, 'header'), h('p', {}, 'nav')],
                footer: () => h('p', {}, 'footer')
            }) // 具名插槽 */
            h(Foo, { count: 1 , onAddFoo },  {
                header: ({ age }) => [h('p', {}, 'header'), h('p', {}, 'age' + age)],
                footer: () => [ h('p', {}, 'footer'), createTextVNode('底部插槽')]
            }) // 作用域插槽
        ])
    },
    setup(props) {
        const instance = getCurrentInstance()
        console.log('App组件实例', instance);
        provide('foo', 'FooVal')
        provide('bar', 'BarVal')
        return {
            msg: 'mini-vue'
        }
    }
}