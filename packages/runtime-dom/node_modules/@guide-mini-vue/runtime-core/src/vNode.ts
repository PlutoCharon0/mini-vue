import { ShapeFlags } from "@guide-mini-vue/shared"

// 用于标识插槽中的虚拟节点的渲染类型
export const Fragment = Symbol('Fragment')
// 用于标识插槽中的纯文本内容的虚拟节点的渲染类型
export const Text = Symbol('Text')

export {
    createVNode as createElementVNode
}

export function createVNode(type, props?, children?) {
    const vnode = {
        type,
        props,
        key: props ? props.key : '',
        children,
        el: null,
        shapeFlag: getShapeFlag(type),
        component: null, // 记录当前虚拟节点所属组件的实例对象
    }
    if (typeof children === 'string') {
        vnode.shapeFlag |= ShapeFlags.TEXT_CHILDRREN
    } else if (Array.isArray(children)) {
        vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
    }
    // 为在插槽中渲染的节点添加标识
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        if (typeof children === 'object') {
            vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN
        }
    }

    return vnode
}

export function createTextVNode(text) {
    return createVNode(Text, {}, text)
}

function getShapeFlag(type) {
    return typeof type === 'string' ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT
}
