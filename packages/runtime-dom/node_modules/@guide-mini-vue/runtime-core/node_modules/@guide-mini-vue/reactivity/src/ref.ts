import { hasChanged, isObject } from "@guide-mini-vue/shared";
import { isTracking, trackEffect, triggerEffect } from "./effect";
import { reactive } from "./reactive";

class RefImpl {
    private _rawValue: any;
    private dep: Set<unknown>;
    private _value: any;
    private __V_isRef = true
    constructor(value) {
        this._rawValue = value // 存储原生value值
        this._value = convert(value) // 如果value是一个对象则生成reactive实例对象
        this.dep = new Set() // 创建依赖集合
    }
    get value() {
        // 收集依赖
        trackRefValue(this)
        return this._value
    }

    set value(newValue) {
        // 判断值是否有改变 当值改变时才修改值、同时触发依赖执行
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue
            this._value = convert(newValue)
            triggerEffect(this.dep)
        }
    }
}

function convert(value) {
    return isObject(value) ? reactive(value) : value
}

/**
 * 收集依赖
 * @param { RefImpl }  ref refImpl实例对象
 */
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffect(ref.dep)
    }
}
/**
 * 创建ref实例对象
 * @param { * } value
 */
export function ref(value) {
    return new RefImpl(value)
}
/**
 * 判断参数是否为ref实例对象
 * @param { * } ref
 */
export function isRef(ref) {
    return !!ref.__V_isRef
}
/**
 * 解构.value的访问
 * @param { * } ref
 */
export function unRef(ref) {
    return isRef(ref) ? ref.value : ref
}
/**
 * 返回代理对象 当返回的对象包含ref实例对象时，对其的访问进行.value解构
 * @param { * } raw 
 */
export function proxyRefs(raw) {
    return new Proxy(raw, {
        get(target, key) {
            return unRef(Reflect.get(target, key))
        },
        set(target, key, value) {
            if (isRef(target[key]) && !isRef(value)) {
                return target[key].value = value
            } else {
                return Reflect.set(target, key, value)
            }
        }
    })
}