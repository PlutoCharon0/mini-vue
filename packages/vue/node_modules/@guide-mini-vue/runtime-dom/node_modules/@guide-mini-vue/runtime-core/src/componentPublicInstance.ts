import { hasOwn } from "@guide-mini-vue/shared"

const publicPropertiesMap = {
    '$el': (instance) => instance.vnode.el,
    "$slots": (instance) => instance.slots, 
    '$props': (instance) => instance.props    
}


export const publicInstanceProxyHandlers =  {
    get({ _: instance }, key) {
        // 判断所访问的属性所属 setupState/props，返回对应值
        const { setupState, props } = instance
        if (hasOwn(setupState, key)) {
            return setupState[key]
        } else if (hasOwn(props, key)) {
            return props[key]
        }
        // 配置相应语法糖访问 $el, $slots, $props
       const publicGetter = publicPropertiesMap[key]
       if (publicGetter) {
        return publicGetter(instance)
       }
    }
}