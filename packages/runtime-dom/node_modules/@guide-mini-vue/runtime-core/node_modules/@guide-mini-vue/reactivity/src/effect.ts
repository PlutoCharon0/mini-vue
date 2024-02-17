import { extend } from "@guide-mini-vue/shared";
import { ITERATE_KEY } from "./baseHandlers";

let activeEffect; // 用于存储当前激活的副作用函数

let shouldTrack;

const effectStack: any[] = [] // 副作用函数栈

// 副作用函数类
export class ReactiveEffect {
    private _fn: any;
    public scheduler: Function | undefined
    onStop?: () => void // 断开联系前的回调函数
    active = true
    deps = [] // 存储与之关联的响应式数据联系 形成双向联系
    constructor(fn, scheduler?: Function) {
        // 存储副作用函数
        this._fn = fn;
        // 存储控制器
        this.scheduler = scheduler
    }
    // 副作用函数的执行
    run() {
        // 如果用户访问的不是依赖的变量 就只执行fn 不收集依赖
        if (!this.active) {
            return this._fn()
        }
        // 标识要收集依赖
        shouldTrack = true
        // 收集依赖前先断开原有依赖联系 用于解决依赖遗留问题（三元表达式 分支切换）
        cleanUpEffect(this)
        // 存储当前激活的副作用函数
        activeEffect = this
        effectStack.push(activeEffect)
        const result = this._fn() // 执行fn 并存储执行结果 用于返回
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1]
        // 依赖收集完毕 重置变量
        // 应对副作用函数嵌套的情况
        typeof activeEffect === 'undefined' ? shouldTrack = false : shouldTrack = true
        return result // 返回执行结果
    }
    stop() { // 断开副作用函数与响应式数据的联系
        if (this.active) { // 只有存在联系时才进行断开 避免重复调用
            if (this.onStop) {
                this.onStop()
            }

            cleanUpEffect(this)
            // 修改状态标识 断开了联系
            this.active = false
        }
    }
}
/** 
 * 断开副作用函数与响应式数据的联系
 * @param { ReactiveEffect } effect 副作用函数 实例对象 
*/
function cleanUpEffect(effect) {
    // 找到所有依赖这个effect的响应式对象
    effect.deps.forEach(dep => {
        dep.delete(effect)
    })

    effect.deps.length = 0
}

export function stop(runner) {
    runner.effect.stop()
}

// 副作用函数注册(收集)
export function effect(fn, options: any = {}) {
    // 创建副作用函数（实例对象）
    const effectFn = new ReactiveEffect(fn, options.scheduler)

    extend(effectFn, options) // 挂载配置 

    effectFn.run() // 副作用函数的自执行

    const runner: any = effectFn.run.bind(effectFn) // 将副作用函数的执行用变量存储用于返回

    runner.effect = effectFn // 挂载所属副作用函数属性

    return runner // 返回副作用函数的执行函数 让用户可以控制副作用函数的执行
}

const bucket = new WeakMap(); // 存储所有响应式对象的容器

/**
 * 收集依赖 
 * @param target 对象 
 * @param key 对象属性
*/
export function track(target, key) {
    debugger
    // 如果访问的对象属性并没有对应依赖引用 就不执行收集操作 直接返回
    if (!isTracking()) return

    let depsMap = bucket.get(target) // 在容器中查找其对应的依赖映射

    if (!depsMap) bucket.set(target, (depsMap = new Map())) // 如果未查找到就进行初始化

    let deps = depsMap.get(key) // 在依赖映射中查找其对应属性的引用集合

    if (!deps) depsMap.set(key, (deps = new Set())) // 如果未查找到就进行初始化

    trackEffect(deps)
}
/**
 * 判断是否收集依赖 
*/
export function isTracking() {
    return shouldTrack && activeEffect != undefined
}

export function trackEffect(deps) {
    // 如果当前依赖已收集 直接返回
    if (deps.has(activeEffect)) return
    // 收集依赖
    deps.add(activeEffect)
    // 建立双向联系
    activeEffect.deps.push(deps)
}

/**
 * 触发依赖执行 
 * @param target 对象 
 * @param key 对象属性
*/
export function trigger(target, key, type) {
    debugger
    // 在容器中查找其对应的依赖映射
    const depsMap = bucket.get(target)

    if (!depsMap) return;

    const deps = depsMap.get(key)

    triggerEffect(createDepsToRun(deps, type, depsMap))
}
/**
 * 执行依赖 
 * @param { Set } deps 依赖集合
*/
export function triggerEffect(deps) {
    for (const effect of deps) {
        if (effect.scheduler) {
            effect.scheduler()
        } else {
            effect.run()
        }
    }
}
/**
 * 创建用于执行依赖的集合 用于处理栈溢出问题（get，set的冲突触发）
 */
function createDepsToRun(deps, type, depsMap) {
    const depsToRun = new Set()

    deps && deps.forEach(dep => {
        if (dep !== activeEffect) {
            depsToRun.add(dep)
        }
    })

    if (type === 'ADD' || type === 'DELETE') {
        const iterateEffects = depsMap.get(ITERATE_KEY)
        iterateEffects && iterateEffects.forEach(effectsFn => {
            if (effectsFn !== activeEffect) {
                depsToRun.add(effectsFn)
            }
        })
    }

    return depsToRun
}