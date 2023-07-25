import { getCurrentInstance } from "./component";

export function provide(key, value) {
    const currentInstance = getCurrentInstance() as any

    if (currentInstance) {
        let { provides } = currentInstance
        if (currentInstance.parent) {
            const parentProvides = currentInstance.parent.provides
            if (provides === parentProvides) {
                // 将当前组件的provides对象的隐式原型指向其父组件的provides 便于链式查找
                provides = currentInstance.provides = Object.create(parentProvides)
            }
        }
        provides[key] = value
    }
}


export function inject(key, defalutValue) {
    const currentInstance = getCurrentInstance() as any

    if (currentInstance) {
        let { provides } = currentInstance

        if (key in provides) {
            return provides[key];
        } else if (defalutValue) {
            if (typeof defalutValue === 'function') {
                return defalutValue()
            }
            return defalutValue
        }
    }
}