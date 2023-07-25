import { createVNode } from "./vNode"

export function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                // 创建虚拟节点
                const vnode = createVNode(rootComponent)
                // 渲染 节点内容
                render(vnode, rootContainer)
            }
        }
    }
    
}
