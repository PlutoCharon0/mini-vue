import { camelize, toHandelrKey } from "@guide-mini-vue/shared"

export function emit(instance, event, ...args) {
    
    // 从组件实例上获取props
    const { props } = instance
    // 获取自定义事件名称
    const handlerName = toHandelrKey(camelize(event))
    // 获取事件函数
    const handler = props[handlerName]
    
    // 触发事件函数
    handler && handler(...args)
}

/* 
    组件emit的实现： 
    1.将emit挂载到组件实例对象上
    2.处理emit事件的注册绑定：从子组件的emit()执行中 获取自定义事件名称，在使用子组件时，查找其渲染函数的参数props中是否有对应的事件
    3.如果存在事件就立即触发
*/