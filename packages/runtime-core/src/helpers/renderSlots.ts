import { Fragment, createVNode } from "../vNode";

export function renderSlots(slots, name = 'default', props) {

    const slot = slots[name]

    if (slot) {
        // 存储slots的数据结构是数组 需要手动的将它们转换为虚拟节点
        if (typeof slot === 'function') {
            return createVNode( Fragment, { name }, slot(props))
        }
    }
}