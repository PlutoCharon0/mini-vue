'use strict';

// 用于标识插槽中的虚拟节点的渲染类型
const Fragment = Symbol('Fragment');
// 用于标识插槽中的纯文本内容的虚拟节点的渲染类型
const Text = Symbol('Text');
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        key: props ? props.key : '',
        children,
        el: null,
        shapeFlag: getShapeFlag(type),
        component: null, // 记录当前虚拟节点所属组件的实例对象
    };
    if (typeof children === 'string') {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDRREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    // 为在插槽中渲染的节点添加标识
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === 'object') {
            vnode.shapeFlag |= 16 /* ShapeFlags.SLOTS_CHILDREN */;
        }
    }
    return vnode;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}
function getShapeFlag(type) {
    return typeof type === 'string' ? 1 /* ShapeFlags.ELEMENT */ : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name = 'default', props) {
    const slot = slots[name];
    if (slot) {
        // 存储slots的数据结构是数组 需要手动的将它们转换为虚拟节点
        if (typeof slot === 'function') {
            return createVNode(Fragment, { name }, slot(props));
        }
    }
}

function toDisplayString(value) {
    return String(value);
}

const extend = Object.assign;
const EMPTY_OBJ = {};
const isObject = (value) => {
    return value != null && typeof value === 'object';
};
const isString = (value) => typeof value === 'string';
const hasChanged = (newVal, oldVal) => {
    return !Object.is(newVal, oldVal);
};
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
/**
 * 处理驼峰命名法的事件名称
 * @param { String } str
*/
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : ""; // 
    });
};
/**
 * 处理emit的事件名称格式
 * @param { String } str
*/
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
// 格式化自定义事件名称
const toHandelrKey = (str) => {
    return str ? `on${capitalize(str)}` : "";
};

let activeEffect; // 用于存储当前激活的副作用函数
let shouldTrack;
const effectStack = []; // 副作用函数栈
// 副作用函数类
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.active = true;
        this.deps = []; // 存储与之关联的响应式数据联系 形成双向联系
        // 存储副作用函数
        this._fn = fn;
        // 存储控制器
        this.scheduler = scheduler;
    }
    // 副作用函数的执行
    run() {
        // 如果用户访问的不是依赖的变量 就只执行fn 不收集依赖
        if (!this.active) {
            return this._fn();
        }
        // 标识要收集依赖
        shouldTrack = true;
        // 收集依赖前先断开原有依赖联系 用于解决依赖遗留问题（三元表达式 分支切换）
        cleanUpEffect(this);
        // 存储当前激活的副作用函数
        activeEffect = this;
        effectStack.push(activeEffect);
        const result = this._fn(); // 执行fn 并存储执行结果 用于返回
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1];
        // 依赖收集完毕 重置变量
        // 应对副作用函数嵌套的情况
        typeof activeEffect === 'undefined' ? shouldTrack = false : shouldTrack = true;
        return result; // 返回执行结果
    }
    stop() {
        if (this.active) { // 只有存在联系时才进行断开 避免重复调用
            if (this.onStop) {
                this.onStop();
            }
            cleanUpEffect(this);
            // 修改状态标识 断开了联系
            this.active = false;
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
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
// 副作用函数注册(收集)
function effect(fn, options = {}) {
    // 创建副作用函数（实例对象）
    const effectFn = new ReactiveEffect(fn, options.scheduler);
    extend(effectFn, options); // 挂载配置 
    effectFn.run(); // 副作用函数的自执行
    const runner = effectFn.run.bind(effectFn); // 将副作用函数的执行用变量存储用于返回
    runner.effect = effectFn; // 挂载所属副作用函数属性
    return runner; // 返回副作用函数的执行函数 让用户可以控制副作用函数的执行
}
const bucket = new WeakMap(); // 存储所有响应式对象的容器
/**
 * 收集依赖
 * @param target 对象
 * @param key 对象属性
*/
function track(target, key) {
    // 如果访问的对象属性并没有对应依赖引用 就不执行收集操作 直接返回
    if (!isTracking())
        return;
    let depsMap = bucket.get(target); // 在容器中查找其对应的依赖映射
    if (!depsMap)
        bucket.set(target, (depsMap = new Map())); // 如果未查找到就进行初始化
    let deps = depsMap.get(key); // 在依赖映射中查找其对应属性的引用集合
    if (!deps)
        depsMap.set(key, (deps = new Set())); // 如果未查找到就进行初始化
    trackEffect(deps);
}
/**
 * 判断是否收集依赖
*/
function isTracking() {
    return shouldTrack && activeEffect != undefined;
}
function trackEffect(deps) {
    // 如果当前依赖已收集 直接返回
    if (deps.has(activeEffect))
        return;
    // 收集依赖
    deps.add(activeEffect);
    // 建立双向联系
    activeEffect.deps.push(deps);
}
/**
 * 触发依赖执行
 * @param target 对象
 * @param key 对象属性
*/
function trigger(target, key) {
    // 在容器中查找其对应的依赖映射
    const depsMap = bucket.get(target);
    if (!depsMap)
        return;
    const deps = depsMap.get(key);
    triggerEffect(createDepsToRun(deps));
}
/**
 * 执行依赖
 * @param { Set } deps 依赖集合
*/
function triggerEffect(deps) {
    for (const effect of deps) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
/**
 * 创建用于执行依赖的集合 用于处理栈溢出问题（get，set的冲突触发）
 */
function createDepsToRun(deps) {
    const depsToRun = new Set();
    deps.forEach(dep => {
        if (dep !== activeEffect) {
            depsToRun.add(dep);
        }
    });
    return depsToRun;
}

/**
 * 创建get构造函数
 * @param { Boolean } isReadonly  用于判断当前创建的get构造方法是否为 readonly 对象的get构造方法
 * @param { Boolean } shallow  用于判断当前创建的get构造方法是否为 shallow 对象的get构造方法
 * @returns { Function } 返回get构造函数
*/
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        // 用于判断是否为readonly对象/reactive对象
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        const result = Reflect.get(target, key);
        if (!isReadonly) {
            // 如果不是readonly对象则收集依赖
            track(target, key);
        }
        if (shallow)
            return result;
        if (isObject(result)) { // 深层处理 创建深层响应式
            return isReadonly ? readonly(result) : reactive(result);
        }
        return result;
    };
}
/**
 * 创建set构造函数
 * @returns { Function } 返回set构造函数
*/
function createSetter() {
    return function set(target, key, value) {
        const result = Reflect.set(target, key, value);
        trigger(target, key);
        return result;
    };
}
// 利用变量存储 生成的对应配置 get，set构造函数，减少构造函数的重复生成 
const get = createGetter();
const set = createSetter();
const shallowReactiveGet = createGetter(false, true);
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
// 配置reactive的代理 get， set配置
const mutableHandlers = {
    get,
    set
};
// 配置shallowReactive的代理 get， set配置
const shallowReactiveHandlers = extend({}, mutableHandlers, {
    get: shallowReactiveGet
});
// 配置readonly的代理 get， set配置
const readonlyHandlers = {
    get: readonlyGet,
    set: (target, key, value) => {
        console.warn(`由于当前target ${target} 是readonly对象，故${key} set 失败，`);
        return true;
    }
};
// 配置shallowReadonly的代理 get， set配置
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
});

/**
 * 创建 reactive实例对象
 * @param { object } raw  原生对象
*/
function reactive(raw) {
    return createActiveObject(raw, mutableHandlers);
}
/**
 * 创建代理对象
 * @param { object } raw  原生对象
 * @param { object } baseHandlers  代理对象的 get set配置
*/
function createActiveObject(raw, baseHandlers) {
    if (!isObject(raw)) {
        return console.warn(`target ${raw} 不是一个对象`);
    }
    return new Proxy(raw, baseHandlers);
}
/**
 * 创建 shallowReactive实例
 * @param { object } raw  原生对象
*/
function shallowReactive(raw) {
    return createActiveObject(raw, shallowReactiveHandlers);
}
/**
 * 判断传入的参数对象是否为reactive实例对象
 * @param { object } value  待判断的对象
 * @returns { Boolean }
*/
function isReactive(value) {
    return !!value["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */];
}
/**
 * 创建 readonly实例
 * @param { object } raw  原生对象
*/
function readonly(raw) {
    return createActiveObject(raw, readonlyHandlers);
}
/**
 * 创建 shallowReadonly实例
 * @param { object } raw  原生对象
*/
function shallowReadonly(raw) {
    return createActiveObject(raw, shallowReadonlyHandlers);
}
/**
 * 判断传入的参数对象是否为reactive实例对象
 * @param { object } value  待判断的对象
 * @returns { Boolean }
*/
function isReadonly(value) {
    return !!value["__v_isReadonly" /* ReactiveFlags.IS_READONLY */];
}

class RefImpl {
    constructor(value) {
        this.__V_isRef = true;
        this._rawValue = value; // 存储原生value值
        this._value = convert(value); // 如果value是一个对象则生成reactive实例对象
        this.dep = new Set(); // 创建依赖集合
    }
    get value() {
        // 收集依赖
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        // 判断值是否有改变 当值改变时才修改值、同时触发依赖执行
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue;
            this._value = convert(newValue);
            triggerEffect(this.dep);
        }
    }
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
/**
 * 收集依赖
 * @param { RefImpl }  ref refImpl实例对象
 */
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffect(ref.dep);
    }
}
/**
 * 创建ref实例对象
 * @param { * } value
 */
function ref(value) {
    return new RefImpl(value);
}
/**
 * 判断参数是否为ref实例对象
 * @param { * } ref
 */
function isRef(ref) {
    return !!ref.__V_isRef;
}
/**
 * 解构.value的访问
 * @param { * } ref
 */
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
/**
 * 返回代理对象 当返回的对象包含ref实例对象时，对其的访问进行.value解构
 * @param { * } raw
 */
function proxyRefs(raw) {
    return new Proxy(raw, {
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            if (isRef(target[key]) && !isRef(value)) {
                return target[key].value = value;
            }
            else {
                return Reflect.set(target, key, value);
            }
        }
    });
}

class computedRefImpl {
    constructor(getter) {
        this._dirty = true;
        this._effect = new ReactiveEffect(getter, () => {
            if (!this._dirty) {
                this._dirty = true;
            }
        });
    }
    get value() {
        // 只有当dirty变量为true时，即数据发生改变时才更新值
        if (this._dirty) {
            this._dirty = false;
            this._value = this._effect.run();
            return this._value;
        }
        return this._value;
    }
}
function computed(getter) {
    return new computedRefImpl(getter);
}

function emit(instance, event, ...args) {
    // 从组件实例上获取props
    const { props } = instance;
    // 获取自定义事件名称
    const handlerName = toHandelrKey(camelize(event));
    // 获取事件函数
    const handler = props[handlerName];
    // 触发事件函数
    handler && handler(...args);
}
/*
    组件emit的实现：
    1.将emit挂载到组件实例对象上
    2.处理emit事件的注册绑定：从子组件的emit()执行中 获取自定义事件名称，在使用子组件时，查找其渲染函数的参数props中是否有对应的事件
    3.如果存在事件就立即触发
*/

function initProps(instance, rawProps) {
    instance.props = rawProps;
}

const publicPropertiesMap = {
    '$el': (instance) => instance.vnode.el,
    "$slots": (instance) => instance.slots,
    '$props': (instance) => instance.props
};
const publicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    }
};

function initSlots(instance, children) {
    const { vnode, slots } = instance;
    // 判断虚拟节点是否为插槽内容
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOTS_CHILDREN */) {
        // 初始化 slots 并挂载到组件实例对象上
        normalizeObjectSlots(children, slots);
    }
}
function normalizeObjectSlots(children, slots) {
    // children的数据结构为对象 通过对children进行遍历 获取对应的插槽
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
// 判断slots中的虚拟节点是否用数组形式存储
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        emit: () => { },
        slots: {},
        // 当中间层组件没有指定provides时将其链接向其父组件的provides值
        provides: parent ? parent.provides : {},
        parent,
        isMounted: false,
        subTree: null,
        next: null,
        update: null, // 记录用于更新的回调函数
    };
    // 利用bind() 让用户使用emit时第一个参数为事件名称
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    // 解构组件虚拟节点 中的 props 和 children
    const { props, children } = instance.vnode;
    // 初始化组件的props
    initProps(instance, props);
    // 初始化组件的slots
    initSlots(instance, children);
    // 处理setup函数
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    // 获取组件配置对象
    const Component = instance.type;
    // 将setup函数返回的对象利用proxy代理到render的this指向上,以便在render函数中使用对应数据字段
    instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHandlers);
    // 从组件配置对象解构出 setup函数
    const { setup } = Component;
    if (setup) {
        // 设置当前操作的组件实例 以便在setup中使用函数getCurrentInstance获取组件实例
        setCurrentInstance(instance);
        // 调用setup 获取返回值———函数（render函数） / 对象
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit
        });
        // 根据setup函数返回值 执行相应的操作
        handleSetupResult(instance, setupResult);
        // setup执行完毕 对currentInstance 进行清空操作
        setCurrentInstance(null);
    }
}
function handleSetupResult(instance, setupResult) {
    if (typeof setupResult === 'object') {
        // 如果返回值是一个对象 将该对象挂载在组件实例对象身上
        instance.setupState = proxyRefs(setupResult); // 使用proxyRefs将其ref进行.value的解构
    }
    // 处理完setup函数返回值后 挂载相应的render函数 
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    // 获取组件配置对象
    const Component = instance.type;
    if (compiler && !Component.render) {
        if (Component.template) {
            Component.render = compiler(Component.template);
        }
    }
    instance.render = Component.render;
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}
let compiler;
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
}

function provide(key, value) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        if (currentInstance.parent) {
            const parentProvides = currentInstance.parent.provides;
            if (provides === parentProvides) {
                // 将当前组件的provides对象的隐式原型指向其父组件的provides 便于链式查找
                provides = currentInstance.provides = Object.create(parentProvides);
            }
        }
        provides[key] = value;
    }
}
function inject(key, defalutValue) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        if (key in provides) {
            return provides[key];
        }
        else if (defalutValue) {
            if (typeof defalutValue === 'function') {
                return defalutValue();
            }
            return defalutValue;
        }
    }
}

function shouldUpdateComponent(prevVNode, nextVNode) {
    // 解构出绑定在组件上的props
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    // 1. 如果props没有发生变化 就不需要更新
    if (prevProps === nextProps) {
        return false;
    }
    // 2.如果之前没有props 就观察当前新的节点是否有props
    if (!prevProps) {
        return !!nextProps;
    }
    // 3.如果之前有props 现在没有props 则需要更新
    if (!nextProps) {
        return true;
    }
    return hasPropsChanged(prevProps, nextProps);
}
function hasPropsChanged(prevProps, nextProps) {
    // 依次对比每个props
    const nextKeys = Object.keys(nextProps);
    // 对比length 如果length不一致 则需要进行更新
    if (nextKeys.length !== Object.keys(prevProps).length) {
        return true;
    }
    for (let i = 0; i < nextKeys.length; i++) {
        const key = nextKeys[i];
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                // 创建虚拟节点
                const vnode = createVNode(rootComponent);
                // 渲染 节点内容
                render(vnode, rootContainer);
            }
        };
    };
}

// 使用promise.resolva() 来创建一个promis实例 利用该实例将一个任务添加到微任务队列中
const p = Promise.resolve();
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
// 存储视图更新任务
const queue = [];
// 存储watchEffect回调
const activePreFlushCbs = [];
// 一个标志代表是否正在刷新队列
let isFlushPending = false;
function queueJobs(job) {
    // 判断视图更新任务是否存在于队列中
    if (!(queue.includes(job))) {
        queue.push(job);
    }
    // 刷新队列
    queueFlush();
}
function queueFlush() {
    // 如果队列正在刷新 则不做任何处理
    if (isFlushPending)
        return;
    //  反之 修改状态 表示正在 刷新队列
    isFlushPending = true;
    // 执行队列中的任务
    nextTick(flushJobs);
}
function flushJobs() {
    // 执行watchEffect的回调 侦听器的回调都是在视图更新前执行
    flushPreFlushCbs();
    let job;
    // 执行任务
    while (job = queue.shift()) {
        job && job();
    }
    // 视图更新任务执行完毕 重置刷新状态
    isFlushPending = false;
}
// 遍历队列 执行watchEffect的回调
function flushPreFlushCbs() {
    for (let i = 0; i < activePreFlushCbs.length; i++) {
        activePreFlushCbs[i]();
    }
}

function createRender(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setTextElement: hostSetTextElement } = options;
    function render(vnode, container) {
        patch(null, vnode, container, null, null);
    }
    function patch(n1, n2, container, parentComponent, anchor = null) {
        const { shapeFlag, type } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    // 处理元素
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    // 处理组件
                    processComponent(n1, n2, container, parentComponent);
                }
                break;
        }
    }
    function processFragment(n1, n2, container, parentComponent) {
        if (!n1) {
            mountChildren(n2.children, container, parentComponent);
        }
    }
    function processText(n1, n2, container) {
        if (!n1) {
            const { children } = n2;
            const textNode = n2.el = document.createTextNode(children);
            container.append(textNode);
        }
    }
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            // 初始化元素
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            // 更新元素
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        console.log('patchElement');
        // 如果虚拟节点上不存在props属性 让它指向一个 指定的空对象
        const oldProp = n1.props || EMPTY_OBJ;
        const newProp = n2.props || EMPTY_OBJ;
        const el = n2.el = n1.el; // 虚拟DOM节点更新时 其el属性需要继承
        // 更新元素属性
        patchProps(el, oldProp, newProp);
        // 更新子节点
        patchChildren(n1, n2, el, parentComponent, anchor);
    }
    function patchProps(el, oldProp, newProp) {
        if (oldProp !== newProp) {
            // 相同属性 但值不同 / 属性多了
            for (const key in newProp) {
                if (key in oldProp) {
                    if (oldProp[key] !== newProp[key]) {
                        hostPatchProp(el, key, null, newProp[key]);
                    }
                }
                else {
                    hostPatchProp(el, key, null, newProp[key]);
                }
            }
            if (oldProp !== EMPTY_OBJ) {
                // 属性 少了
                for (const key in oldProp) {
                    if (!(key in newProp)) {
                        hostPatchProp(el, key, oldProp[key], null);
                    }
                }
            }
        }
    }
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const { shapeFlag: prevShapeFlag, children: c1 } = n1;
        const { shapeFlag: nextShapeFlag, children: c2 } = n2;
        if (nextShapeFlag & 4 /* ShapeFlags.TEXT_CHILDRREN */) {
            if (prevShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                // array to text 
                // 清空 old children
                unmountChildren(n1.children);
                // 设置 new children
                hostSetTextElement(container, c2);
            }
            else {
                // text to text
                if (c1 !== c2) {
                    hostSetTextElement(container, c2);
                }
            }
        }
        else {
            if (prevShapeFlag & 4 /* ShapeFlags.TEXT_CHILDRREN */) {
                // text to array
                // 清空 old children
                hostSetTextElement(container, '');
                // 设置 new children
                mountChildren(c2, container, parentComponent);
            }
            else {
                // array to array  diff
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, anchor) {
        let i = 0; // 左指针
        let e1 = c1.length - 1; // 指向旧children（数组）的最后一个元素位置
        let e2 = c2.length - 1; // 指向新children（数组）的最后一个元素位置
        function isSameVNodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        while (i <= e1 && i <= e2) { // 左侧对比
            const n1 = c1[i]; // 从数组左侧开始 获取旧children（数组）中的个体虚拟节点
            const n2 = c2[i]; // 从数组左侧开始 获取新children（数组）中的个体虚拟节点
            if (isSameVNodeType(n1, n2)) { // 判断新旧虚拟节点是否为相同类型
                patch(n1, n2, container, parentComponent, anchor); // 比对更新其节点的属性和children
            }
            else {
                break;
            }
            i++;
        }
        while (i <= e1 && i <= e2) { // 右侧对比
            const n1 = c1[e1]; // 从数组右侧开始 获取旧children（数组）中的个体虚拟节点
            const n2 = c2[e2]; // 从数组右侧开始 获取新children（数组）中的个体虚拟节点
            if (isSameVNodeType(n1, n2)) { // 判断新旧虚拟节点是否为相同类型
                patch(n1, n2, container, parentComponent, anchor); // 比对更新其节点的属性和children
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        if (i > e1) { // 新children中节点比旧children节点多 创建
            if (i <= e2) {
                const nextPos = e2 + 1;
                const anchor = nextPos < c2.length ? c2[nextPos].el : null;
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i <= e1 && i > e2) { // 新children中节点比旧children节点少 销毁
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else { // 中间区域对比
            // 获取i索引
            let s1 = i;
            let s2 = i;
            const keyToNewIndexMap = new Map();
            let moved = false;
            let maxNewIndexSoFar = 0;
            for (let i = s2; i <= e2; i++) { // 基于新节点来创建 节点key属性 映射以进行对比
                const nextChildren = c2[i];
                keyToNewIndexMap.set(nextChildren.key, i);
            }
            const toBePatched = e2 - s2 + 1; // 需要处理新节点的数量
            let patched = 0;
            // 初始化 根据新的index映射出旧的index 
            // 创建数组时给定数组长度 （性能优化点）
            // 给数组填充0 在后续处理中 如果查找发现对应值为0时，说明新值在老的里面不存在 需要创建
            const newIndexToOldIndexMap = new Array(toBePatched).fill(0);
            for (let i = s1; i <= e1; i++) {
                // 遍历旧节点 
                // 1.需要找出旧节点存在 新节点不存在的 -> 需要将其删除
                // 2. 新老节点都存在 递归调用patch
                const prevChilren = c1[i]; // 获取旧节点个体
                //如果旧的节点大于新节点的数量的话，那么在处理旧节点时可以直接删除（性能优化点）
                if (patched >= toBePatched) {
                    hostRemove(prevChilren.el);
                    continue;
                }
                let newIndex; // 存储 根据旧节点在新节点keyMap里查找的结果
                if (prevChilren.key) {
                    // 如果旧节点存在key 则可以通过 由新节点生成的key映射查找当前处理的旧节点在新节点中的索引
                    // 时间复杂度为O(1)
                    newIndex = keyToNewIndexMap.get(prevChilren.key);
                }
                else {
                    //如果没有key的话 只能通过遍历所有新节点的方式来确定当前节点是否存在
                    // 实践复杂度为O(n)
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVNodeType(prevChilren, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                if (!newIndex) {
                    // 如果没查找到 说明 新节点中不包含该节点 删除节点即可
                    hostRemove(prevChilren.el);
                }
                else { // 新老接节点都存在 重新进行对比
                    // 根据新节点的索引和老节点的索引建立映射关系
                    //  +1的原因是因为 i 可能为0， 如果i为0的话说明新节点在老节点中不存在
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    // 确定中间的节点是否需要移动
                    // 如果新的newIndex一直是升序的话 则说明为发生节点移动的情况
                    // 根据记录最后一个节点在新的里面的索引 来观察是否升序
                    // 不是升序的话 可以确定该节点移动过了
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    patch(prevChilren, c2[newIndex], container, parentComponent); // 处理节点本身的props children更新
                    patched++;
                }
            }
            // 利用最长递增子序列来优化移动逻辑
            // 如果元素是升序的话 那么这一批升序的元素不需要移动
            // 通过最长递增子序列来获取到升序的列表
            // 在移动的时候再去对比这个列表 如果对比的上的话，则说明当前元素不需要移动
            // 通过moved来进行优化，如果没有移动过的话，那么就不需要执行获取最长递增子序列的算法
            // getSequence 返回的是 newIndexToOldIndexMap 的索引值
            // 所以后面我们可以直接遍历索引值来进行处理 直接使用toBePatched即可
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];
            let j = increasingNewIndexSequence.length - 1;
            // 遍历新节点
            // 1.需要找出旧节点不存在 而新节点存在的 -> 需要创建新节点
            // 2.最后需要移动一下位置 比如 【c，d，e】 => 【e，c，d】
            // 使用倒循环 是因为在移动节点位置时， 需要保证锚点anchor 必须是处理完的，确定的节点
            for (let i = toBePatched - 1; i >= 0; i--) {
                // 确定当前要处理的节点索引
                const nextIndex = s2 + i;
                const nextChild = c2[nextIndex];
                // 锚点节点的索引 为当前正处理的节点的索引+1 即后面一个紧跟着的节点
                const anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null;
                if (newIndexToOldIndexMap[i] === 0) {
                    // 说明新节点在旧节点中不存在 需要创建
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    // 说明需要移动节点
                    // 1. j为-1 说明剩下的都是需要移动的
                    // 2. 最长递增子序列里面的值和当前的值匹配不上的话 说明当前元素需要移动
                    if (j < 0 || increasingNewIndexSequence[j] !== i) {
                        // 移动节点
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        // 值匹配命中后 移动指针
                        j--;
                    }
                }
            }
        }
    }
    function unmountChildren(children) {
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el;
            hostRemove(el);
        }
    }
    function mountElement(vnode, container, parentComponent, anchor) {
        // 创建根元素
        const el = vnode.el = hostCreateElement(vnode.type);
        const { props, children, shapeFlag } = vnode;
        // 设置props
        for (let key in props) {
            let val = props[key];
            hostPatchProp(el, key, null, val);
        }
        // 渲染子节点内容
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDRREN */) {
            const textNode = document.createTextNode(children);
            el.append(textNode);
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(vnode.children, el, parentComponent);
        }
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent) {
        children.forEach(vnode => {
            patch(null, vnode, container, parentComponent);
        });
    }
    function processComponent(n1, n2, container, parentComponent) {
        if (!n1) {
            // 初始化组件
            mountComponent(n2, container, parentComponent);
        }
        else {
            // 更新组件
            updateComponent(n1, n2);
        }
    }
    function updateComponent(n1, n2) {
        console.log('update');
        console.log('n1', n1);
        console.log('n2', n2);
        // 更新组件实例引用 
        // 手动更新绑定在当前处理的组件实例对象的vnode节点,以便下一次更新的时候可以获取到最后一次更新的节点
        const instance = n2.component = n1.component;
        // 判断组件是否需要更新
        if (shouldUpdateComponent(n1, n2)) {
            // 给组件实例对象赋值最新的虚拟节点
            instance.next = n2;
            // 调用绑定在组件实例对象上的update方法 一个存储着关于组件内容的effect函数
            instance.update();
        }
        else {
            // 组件不需要更新 则只需要覆盖对应属性即可
            n2.component = n1.component;
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    function mountComponent(initialVNode, container, parentComponent) {
        // 创建组件实例对象 
        const instance = initialVNode.component = createComponentInstance(initialVNode, parentComponent);
        // 初始化组件
        setupComponent(instance);
        // 调用render
        setupRenderEffect(instance, initialVNode, container);
    }
    function setupRenderEffect(instance, initialVNode, container) {
        instance.update = effect(() => {
            if (!instance.isMounted) {
                // 获取代理对象改变render函数this指向
                const { proxy } = instance;
                // 获取虚拟DOM树
                const subTree = instance.subTree = instance.render.call(proxy, proxy);
                // 渲染节点元素
                patch(null, subTree, container, instance, null);
                // 由于vnode节点的不同 $el的挂载需要放在element元素渲染完之后
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                // 获取代理对象改变render函数this指向
                const { proxy, next, vnode } = instance;
                // 如果有 next 的话， 说明需要更新组件的数据（props，slots 等）
                // 先更新组件的数据，然后更新完成后，在继续对比当前组件的子元素
                if (next) {
                    next.el = vnode.el; // 组件最新的虚拟节点并没有初始化 需要手动给新的节点赋值el属性
                    updateComponentPreRender(instance, next);
                }
                // 获取新的虚拟DOM树
                const nextTree = instance.render.call(proxy, proxy);
                // 获取旧的虚拟DOM树
                const prevTree = instance.subTree;
                instance.subTree = nextTree;
                console.log('prev', prevTree);
                console.log('current', nextTree);
                // 更新渲染节点元素
                patch(prevTree, nextTree, container, instance);
            }
        }, {
            scheduler() {
                queueJobs(instance.update);
            }
        });
    }
    function updateComponentPreRender(instance, nextVNode) {
        // 新的虚拟节点 并没有经过组件初始化的过程 需要手动绑定 更新nextVNode所属的组件实例对象
        //  当前组件实例对象上挂载的vnode属性存储的节点属于旧节点
        // nextVNode.component = instance
        instance.vnode = nextVNode;
        // instance.next = null
        const { props } = nextVNode;
        instance.props = props;
    }
    return {
        render,
        createApp: createAppAPI(render)
    };
}
/**
* 获取最长递增子序列
*/
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const eventName = key.slice(2).toLocaleLowerCase();
        el.addEventListener(eventName, nextVal);
    }
    else {
        if (!nextVal) {
            el.removeAttribute(key);
        }
        else {
            if (Array.isArray(nextVal))
                nextVal = nextVal.toString().replaceAll(',', ' ');
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(children, parentContainer, anchor) {
    parentContainer.insertBefore(children, anchor || null);
}
function remove(children) {
    const parentNode = children.parentNode;
    if (parentNode) {
        parentNode.removeChild(children);
    }
}
function setTextElement(el, text) {
    el.textContent = text;
}
const render = createRender({
    createElement,
    patchProp,
    insert,
    remove,
    setTextElement
});
function createApp(...args) {
    return render.createApp(...args);
}

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    computed: computed,
    createApp: createApp,
    createElement: createElement,
    createElementVNode: createVNode,
    createRender: createRender,
    createTextVNode: createTextVNode,
    effect: effect,
    getCurrentInstance: getCurrentInstance,
    h: h,
    inject: inject,
    insert: insert,
    isReactive: isReactive,
    isReadonly: isReadonly,
    isRef: isRef,
    nextTick: nextTick,
    patchProp: patchProp,
    provide: provide,
    proxyRefs: proxyRefs,
    reactive: reactive,
    readonly: readonly,
    ref: ref,
    registerRuntimeCompiler: registerRuntimeCompiler,
    remove: remove,
    renderSlots: renderSlots,
    setTextElement: setTextElement,
    shallowReactive: shallowReactive,
    shallowReadonly: shallowReadonly,
    toDisplayString: toDisplayString,
    unRef: unRef
});

const TO_DISPLAY_STRING = Symbol('toDisplayString');
const CREATE_ELEMENT_VNODE = Symbol('createElementVNode');
const helperNameMap = {
    [TO_DISPLAY_STRING]: 'toDisplayString',
    [CREATE_ELEMENT_VNODE]: 'createElementVNode'
};

function transformElement(node, context) {
    if (node.type === 4 /* NodeTypes.ELEMENT */) {
        return () => {
            context.helper(CREATE_ELEMENT_VNODE);
            // 中间层处理
            const vnodeTag = `"${node.tag}"`;
            let vnodeProps = node.props;
            const children = node.children[0];
            let vnodeChildren = children;
            const vnodeElement = {
                type: 4 /* NodeTypes.ELEMENT */,
                tag: vnodeTag,
                props: vnodeProps,
                children: vnodeChildren || '[]'
            };
            node.codegenNode = vnodeElement;
        };
    }
}

function transformExpression(node, context) {
    if (node.type === 2 /* NodeTypes.INTERPOLATION */) {
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

function transformText(node, context) {
    if (node.type === 4 /* NodeTypes.ELEMENT */) {
        return () => {
            const { children } = node;
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            if (!currentContainer) {
                                // 初始化 同时替换位置
                                currentContainer = children[i] = {
                                    type: 5 /* NodeTypes.COMPOUND_EXPRESSION */,
                                    children: [child]
                                };
                            }
                            currentContainer.children.push(" + ");
                            currentContainer.children.push(next);
                            children.splice(j, 1); // 删除合并的节点
                            j--; // 更新指向 保证索引指向正确
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}
function isText(node) {
    return node.type === 0 /* NodeTypes.TEXT */ || node.type === 2 /* NodeTypes.INTERPOLATION */;
}

// 创建统一的上下文对象
function createCodegenContext() {
    const context = {
        code: ``,
        push(source) {
            context.code += source;
        },
        helperMapping(key) {
            return helperNameMap[key];
        }
    };
    return context;
}
function generate(ast) {
    // 获取统一的上下文处理对象
    const context = createCodegenContext();
    const { push } = context;
    genFunctionPreamble(ast, context);
    const functionName = 'render';
    const args = ["_ctx", "_cache", "$props", "$setup", "$data", "$options"];
    push(`function ${functionName}`);
    push(`(${args.join(', ')}) {\n return `);
    // 处理核心节点的相关内容
    genNode(ast.codegenNode, context);
    push(`\n}`);
    return context;
}
function genFunctionPreamble(ast, context) {
    const { push } = context;
    const VueBinging = 'Vue';
    // 方法重命名
    const aliasHelper = (source) => `${helperNameMap[source]}: _${helperNameMap[source]}`;
    if (ast.helpers.length > 0) {
        // 如果helpers数组中的长度大于0 说明当前处理的节点需要额外的函数导入支持
        push(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = ${VueBinging} \n`);
    }
    push('return ');
}
function genNode(node, context) {
    switch (node.type) {
        case 0 /* NodeTypes.TEXT */:
            genText(node, context);
            break;
        case 2 /* NodeTypes.INTERPOLATION */:
            genInterpolation(node, context);
            break;
        case 3 /* NodeTypes.SIMPLE_EXPRESSION */:
            genExpression(node, context);
            break;
        case 4 /* NodeTypes.ELEMENT */:
            genElemnet(node, context);
            break;
        case 5 /* NodeTypes.COMPOUND_EXPRESSION */:
            genCompoundExpression(node, context);
            break;
    }
}
function genText(node, context) {
    const { push } = context;
    push(`"${node.content}"`);
}
function genInterpolation(node, context) {
    genNode(node.content, context);
}
function genExpression(node, context) {
    const { push, helperMapping } = context;
    push(`_${helperMapping(TO_DISPLAY_STRING)}(${node.content})`);
}
function genElemnet(node, context) {
    const { push, helperMapping } = context;
    const { children, tag, props } = node;
    push(`_${helperMapping(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(genNullableArgs([tag, props, children]), context);
    push(`)`);
}
// 综合处理参数值是否为undefined 如果是统一转换成null
function genNullableArgs(args) {
    return args.map(arg => arg || "null");
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else
            [
                genNode(node, context)
            ];
        if (i < nodes.length - 1) {
            push(', ');
        }
    }
}
function genCompoundExpression(node, context) {
    const { push } = context;
    const { children } = node;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}

function baseParse(content) {
    // 获取统一处理的上下文对象
    const context = createParserContext(content);
    return createRoot(parseChildren(context, []));
}
// 返回统一处理的上下文对象
function createParserContext(content) {
    // 创建统一处理的上下文对象
    return {
        source: content
    };
}
// 创建AST根节点
function createRoot(children) {
    return {
        type: 1 /* NodeTypes.ROOT */,
        children
    };
}
// 处理子节点
function parseChildren(context, ancestors) {
    // 存储子节点的数组
    const nodes = [];
    while (!isEnd(context, ancestors)) {
        // 子节点单体
        let node;
        const s = context.source; // 简化源内容 便于后续使用
        if (startsWith(s, '{{')) {
            // 判断源内容为 插值表达式 执行对应处理
            node = parseInterpolation(context);
        }
        else if (s[0] === '<') {
            if (s[1] === '/') {
                // 当处理到嵌套在内的标签类型子节点 的后置标签时 不作特别处理
                // 推进代码即可
                parseTag(context, 1 /* TagType.End */);
                // 处理完嵌套剩余的后置标签后 继续后续执行
                continue;
            }
            else if (/[a-z]/i.test(s[1])) {
                // 判断源内容为 元素标签 执行对应处理
                node = parseElement(context, ancestors);
            }
        }
        // 默认源内容为 文字类型
        if (!node) {
            node = parseText(context);
        }
        // 将子节点单体放入数组中
        nodes.push(node);
    }
    // 返回子节点数组
    return nodes;
}
//检测当前处理的内容是否为结束标签 是则结束parse 反之继续parse解析
function isEnd(context, ancestors) {
    if (startsWith(context.source, '</')) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i].tag;
            if (startsWithEndTagOpen(context.source, tag)) {
                return true;
            }
        }
    }
    return !context.source;
}
// 用于处理插值类型子节点
function parseInterpolation(context) {
    // 1.先获取 }} 结束的index
    // 2.通过closeIndex - startIndex 来获取到内容的长度 contextLength
    // 3. 通过slice来截取内容
    const openDelimiter = '{{';
    const closeDelimiter = '}}';
    const closeIndex = context.source.indexOf(closeDelimiter);
    // 清除开头的两个 '{{'
    advanceBy(context, openDelimiter.length);
    // 获取原生内容的长度
    const rawContentLength = closeIndex - openDelimiter.length;
    // 获取原生内容
    const rawContent = parseTextData(context, rawContentLength);
    // 清除原生内容中不必要的空格
    const content = rawContent.trim();
    // 清除末尾的两个 '}}'
    advanceBy(context, closeDelimiter.length);
    // 返回对应的 插值 节点对象
    return {
        type: 2 /* NodeTypes.INTERPOLATION */,
        content: {
            type: 3 /* NodeTypes.SIMPLE_EXPRESSION */,
            content,
        }
    };
}
// 用于处理元素标签类型子节点
function parseElement(context, ancestors) {
    // 解析tag,返回初步处理的子节点
    const element = parseTag(context, 0 /* TagType.Start */);
    // 将正处理的标签 进行入栈操作
    ancestors.push(element);
    // 处理标签内子节点
    element.children = parseChildren(context, ancestors);
    // 处理完标签 进行出栈操作
    ancestors.pop();
    if (startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, 1 /* TagType.End */);
    }
    else {
        throw new Error(`缺失结束标签:${element.tag}`);
    }
    return element;
}
// 用于处理元素标签类型子节点
function parseTag(context, type) {
    // 利用正则来匹配标签名
    const match = /^<\/?([a-z][^\r\n\t\f />]*)/i.exec(context.source);
    // 获取标签
    const tag = match[1];
    // 清除前置标签的内容
    advanceBy(context, match[0].length + 1);
    if (type === 1 /* TagType.End */)
        return;
    return {
        type: 4 /* NodeTypes.ELEMENT */,
        tag
    };
}
// 检查该标签是否有
function startsWithEndTagOpen(source, tag) {
    return startsWith(source, '</') && source.slice(2, 2 + tag.length) === tag;
}
// 用于处理文字类型子节点
function parseText(context) {
    // 声明文字类型内容的终止标志
    const endTokens = ['<', '{{'];
    // 存储内容的长度
    let endIndex = context.source.length;
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }
    // 获取原生文本内容
    const content = parseTextData(context, endIndex);
    return {
        type: 0 /* NodeTypes.TEXT */,
        content
    };
}
// 用于截取原生文本内容
function parseTextData(context, length) {
    //  截取文本内容
    const rawText = context.source.slice(0, length);
    // 重置context.source(针对text类型)
    advanceBy(context, length);
    return rawText;
}
function startsWith(source, searchString) {
    return source.startsWith(searchString);
}
// 用于推进代码 截取丢弃不要的内容
function advanceBy(context, numberOfCharacters) {
    context.source = context.source.slice(numberOfCharacters);
}

// 创建统一处理的上下文对象
function createTransformContext(root, options) {
    const context = {
        root,
        transformFns: options.transformFns,
        helpers: new Map(),
        helper(fnName) {
            context.helpers.set(fnName, 1);
        }
    };
    return context;
}
function transform(root, options = {}) {
    // 获取统一处理的上下文对象
    const context = createTransformContext(root, options);
    // 通过深度有优先搜索 遍历ast树
    traverseAstTree(root, context);
    createRootCodegen(root);
    // 挂载helpers节点到ast根节点上
    root.helpers = [...context.helpers.keys()];
}
// 深度有优先搜索 遍历ast树
function traverseAstTree(node, context) {
    const { transformFns } = context;
    const exitFns = [];
    if (transformFns) {
        for (let i = 0; i < transformFns.length; i++) {
            const transformFn = transformFns[i];
            const onExit = transformFn(node, context);
            if (onExit)
                exitFns.push(onExit);
        }
    }
    switch (node.type) {
        case 2 /* NodeTypes.INTERPOLATION */:
            context.helper(TO_DISPLAY_STRING);
            break;
        case 1 /* NodeTypes.ROOT */:
        case 4 /* NodeTypes.ELEMENT */:
            traverseChildren(node, context);
            break;
    }
    let i = exitFns.length;
    while (i--) {
        exitFns[i]();
    }
}
function traverseChildren(parentNode, context) {
    const children = parentNode.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        traverseAstTree(child, context);
    }
}
function createRootCodegen(root, context) {
    const child = root.children[0];
    if (child.type === 4 /* NodeTypes.ELEMENT */ && child.codegenNode) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = child;
    }
}

function baseCompile(template) {
    // 把template（字符串）转换成 ast树
    const ast = baseParse(template);
    // 对ast树进行 中间层处理
    transform(ast, {
        transformFns: [transformExpression, transformElement, transformText,]
    });
    // 生成render函数代码
    return generate(ast);
}

// mini-vue 出口
function compileToFunction(template) {
    const { code } = baseCompile(template);
    console.log(code);
    const render = new Function("Vue", code)(runtimeDom);
    return render;
}
registerRuntimeCompiler(compileToFunction);

exports.computed = computed;
exports.createApp = createApp;
exports.createElement = createElement;
exports.createElementVNode = createVNode;
exports.createRender = createRender;
exports.createTextVNode = createTextVNode;
exports.effect = effect;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.insert = insert;
exports.isReactive = isReactive;
exports.isReadonly = isReadonly;
exports.isRef = isRef;
exports.nextTick = nextTick;
exports.patchProp = patchProp;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.reactive = reactive;
exports.readonly = readonly;
exports.ref = ref;
exports.registerRuntimeCompiler = registerRuntimeCompiler;
exports.remove = remove;
exports.renderSlots = renderSlots;
exports.setTextElement = setTextElement;
exports.shallowReactive = shallowReactive;
exports.shallowReadonly = shallowReadonly;
exports.toDisplayString = toDisplayString;
exports.unRef = unRef;
