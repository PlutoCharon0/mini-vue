import { proxyRefs } from "@guide-mini-vue/reactivity"
import { shallowReadonly } from "@guide-mini-vue/reactivity"
import { emit } from "./componentEmit"
import { initProps } from "./componentProps"
import { publicInstanceProxyHandlers } from "./componentPublicInstance"
import { initSlots } from "./componentSlots"

export function createComponentInstance(vnode, parent) {
    const component = {
        vnode, // 虚拟节点
        type: vnode.type, // 虚拟节点类型/虚拟节点根元素
        setupState: {}, // setup函数默认返回值 / 可以是对象也可以是函数
        props: {}, // 挂载绑定到组件上的属性
        emit: () => { }, // 挂载绑定到组件上的自定义事件
        slots: {}, // 挂载组件中的插槽
        // 当中间层组件没有指定provides时将其链接向其父组件的provides值
        provides: parent ? parent.provides : {}, // 挂载组件向外暴露的属性或方法
        parent, // 挂载父组件实例对象
        isMounted: false, // 记录当前元素是否为初始化状态
        subTree: null, // 记录当前组件的虚拟DOM树
        next: null, // 记录组件最新虚拟节点,
        update: null, // 记录用于更新的回调函数
    }
    // 利用bind() 让用户使用emit时第一个参数为事件名称
    component.emit = emit.bind(null, component) as any


    return component
}

export function setupComponent(instance) {
    // 解构组件虚拟节点 中的 props 和 children
    const { props, children } = instance.vnode

    // 初始化组件的props
    initProps(instance, props)

    // 初始化组件的slots
    initSlots(instance, children)

    // 处理setup函数
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
    // 获取组件配置对象
    const Component = instance.type
    // 将setup函数返回的对象利用proxy代理到render的this指向上,以便在render函数中使用对应数据字段
    instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHandlers)

    // 从组件配置对象解构出 setup函数
    const { setup } = Component

    if (setup) {
        // 设置当前操作的组件实例 以便在setup中使用函数getCurrentInstance获取组件实例
        setCurrentInstance(instance)
        // 调用setup 获取返回值———函数（render函数） / 对象
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit
        })
        // 根据setup函数返回值 执行相应的操作
        handleSetupResult(instance, setupResult)
        // setup执行完毕 对currentInstance 进行清空操作
        setCurrentInstance(null)
    }
}
function handleSetupResult(instance, setupResult) {
    if (typeof setupResult === 'object') {
        // 如果返回值是一个对象 将该对象挂载在组件实例对象身上
        instance.setupState = proxyRefs(setupResult) // 使用proxyRefs将其ref进行.value的解构
    }
    // 处理完setup函数返回值后 挂载相应的render函数 
    finishComponentSetup(instance)
}

function finishComponentSetup(instance) {
    // 获取组件配置对象
    const Component = instance.type

    if (compiler && !Component.render) {
        if (Component.template) {
            Component.render = compiler(Component.template)
        }
    }
    instance.render = Component.render
}

let currentInstance = null

export function getCurrentInstance() {
    return currentInstance
}
function setCurrentInstance(instance) {
    currentInstance = instance
}

let compiler;

export function registerRuntimeCompiler(_compiler) {
    compiler = _compiler
}