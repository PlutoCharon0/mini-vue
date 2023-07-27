import { ShapeFlags } from "@guide-mini-vue/shared"

export function initSlots(instance, children) {
    const { vnode, slots } = instance
    // 判断虚拟节点是否为插槽内容
    if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
        // 初始化 slots 并挂载到组件实例对象上
        normalizeObjectSlots(children, slots)
    }

}

function normalizeObjectSlots(children, slots) {
    // children的数据结构为对象 通过对children进行遍历 获取对应的插槽
    for (const key in children) {

        const value = children[key]
        
        slots[key] = (props) => normalizeSlotValue(value(props))

    }
}
// 判断slots中的虚拟节点是否用数组形式存储
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value]
}
