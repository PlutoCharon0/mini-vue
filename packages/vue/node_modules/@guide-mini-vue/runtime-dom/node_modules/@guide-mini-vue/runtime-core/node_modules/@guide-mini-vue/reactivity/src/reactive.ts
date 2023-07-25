import { isObject } from "@guide-mini-vue/shared"
import { mutableHandlers, readonlyHandlers, shallowReadonlyHandlers, shallowReactiveHandlers } from "./baseHandlers"

// 存储 isReactive 和 isReadonly 类型查找的键
export const enum ReactiveFlags {
    IS_REACTIVE = '__v_isReactive',
    IS_READONLY = '__v_isReadonly'
}
/**   
 * 创建 reactive实例对象
 * @param { object } raw  原生对象
*/
export function reactive (raw) {
    return createActiveObject(raw, mutableHandlers)
}

/** 
 * 创建代理对象
 * @param { object } raw  原生对象 
 * @param { object } baseHandlers  代理对象的 get set配置
*/
function createActiveObject(raw, baseHandlers) {
    if(!isObject(raw)) {
        return console.warn(`target ${raw} 不是一个对象`)
    }
    return new Proxy(raw, baseHandlers)
}

/**   
 * 创建 shallowReactive实例
 * @param { object } raw  原生对象
*/
export function shallowReactive(raw) {
    return createActiveObject(raw, shallowReactiveHandlers)
}
/**   
 * 判断传入的参数对象是否为reactive实例对象
 * @param { object } value  待判断的对象
 * @returns { Boolean }
*/
export function isReactive(value) {
    return !!value[ReactiveFlags.IS_REACTIVE]
}
/**   
 * 创建 readonly实例
 * @param { object } raw  原生对象
*/
export function readonly (raw) {
    return createActiveObject(raw, readonlyHandlers)
}
/**   
 * 创建 shallowReadonly实例
 * @param { object } raw  原生对象
*/
export function shallowReadonly (raw) {
    return createActiveObject(raw, shallowReadonlyHandlers)
}
/**   
 * 判断传入的参数对象是否为reactive实例对象
 * @param { object } value  待判断的对象
 * @returns { Boolean } 
*/
export function isReadonly(value) {
    return !!value[ReactiveFlags.IS_READONLY]
}
/**   
 * 判断传入的参数对象是否为proxy代理对象
 * @param { object } value  待判断的对象
 * @returns { Boolean } 
*/
export function isProxy(value) {
    return isReactive(value) || isReadonly(value)
}