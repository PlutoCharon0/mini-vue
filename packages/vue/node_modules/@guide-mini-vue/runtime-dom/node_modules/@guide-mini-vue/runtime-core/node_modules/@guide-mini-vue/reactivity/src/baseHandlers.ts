import { extend, isObject } from "@guide-mini-vue/shared"
import { track, trigger } from "./effect"
import { ReactiveFlags, reactive, readonly } from "./reactive"

export const ITERATE_KEY = Symbol()

/** 
 * 创建get构造函数
 * @param { Boolean } isReadonly  用于判断当前创建的get构造方法是否为 readonly 对象的get构造方法
 * @param { Boolean } shallow  用于判断当前创建的get构造方法是否为 shallow 对象的get构造方法
 * @returns { Function } 返回get构造函数
*/
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        // 用于判断是否为readonly对象/reactive对象
        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly
        }
        const result = Reflect.get(target, key)

        if (!isReadonly) {
            // 如果不是readonly对象则收集依赖
            track(target, key)
        }

        if (shallow) return result

        if (isObject(result)) { // 深层处理 创建深层响应式
            return isReadonly ? readonly(result) : reactive(result)
        }

        return result
    }
}
/**
 * 创建set构造函数
 * @returns { Function } 返回set构造函数 
*/
function createSetter() {
    return function set(target, key, value, receiver) {
        // 如果属性不存在，则说明是在添加新的属性，否则是设置已存在的属性
        const type = Object.prototype.hasOwnProperty.call(target, key) ? 'SET' : "ADD"

        const result = Reflect.set(target, key, value, receiver)

        trigger(target, key, type)

        return result
    }
}

/** 拦截 in 操作符的使用  并进行依赖收集 */
function has(target, key) {
    const result = Reflect.has(target, key)
    track(target, key)
    return result
}

function ownKeys(target) {
    debugger
    track(target, ITERATE_KEY)
    // track(target, TrackOpTypes.ITERATE, isArray(target) ? 'length' : ITERATE_KEY)
    return Reflect.ownKeys(target)
}

function deleteProperty(target, key) {
    debugger
    const hadKey = Object.prototype.hasOwnProperty.call(target, key)

    const res = Reflect.deleteProperty(target, key)
    
    if (res && hadKey) {
        trigger(target, key, 'DELETE')
    }

    return res
}

// 利用变量存储 生成的对应配置 get，set构造函数，减少构造函数的重复生成 
const get = createGetter()
const set = createSetter()
const shallowReactiveGet = createGetter(false, true)
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)
// 配置reactive的代理 get， set配置
export const mutableHandlers = {
    get,
    set,
    has,
    ownKeys,
    deleteProperty
}
// 配置shallowReactive的代理 get， set配置
export const shallowReactiveHandlers = extend({}, mutableHandlers, {
    get: shallowReactiveGet
})
// 配置readonly的代理 get， set配置
export const readonlyHandlers = {
    get: readonlyGet,
    set: (target, key, value) => {
        console.warn(`由于当前target ${target} 是readonly对象，故${key} set 失败，`)
        return true
    }
}
// 配置shallowReadonly的代理 get， set配置
export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
})