[学习参考](https://github.com/cuixiaorui/mini-vue/tree/master)
# 功能实现
## reactivity
- [x] reactive 的实现
- [x] ref 的实现
- [x] readonly 的实现
- [x] computed 的实现
- [x] track 依赖收集
- [x] trigger 触发依赖
- [x] 支持 isReactive
- [x] 支持嵌套 reactive
- [x] 支持 toRaw
- [x] 支持 effect.scheduler
- [x] 支持 effect.stop
- [x] 支持 isReadonly
- [x] 支持 isProxy
- [x] 支持 shallowReadonly
- [x] 支持 shallowReactive
- [x] 支持 isRef
- [x] 支持 unRef
- [x] 支持 proxyRefs
## runtime-core
- [x] 支持组件类型
- [x] 支持 element 类型
- [x] 初始化 props
- [x] setup 可获取 props 和 context
- [x] 支持 component emit
- [x] 支持 proxy
- [x] 可以在 render 函数中获取 setup 返回的对象
- [x] nextTick 的实现
- [x] 支持 getCurrentInstance
- [x] 支持 provide/inject
- [x] 支持最基础的 slots
- [x] 支持 Text 类型节点
- [x] 支持 watchEffect
## compiler-core
- [x] 解析插值
- [x] 解析 element
- [x] 解析 text
- [x] 解析 混合类型
## runtime-dom
- [x] 支持 custom renderer
# mini-vue浅解

## reactive实现

**处理点：响应式（包括深层响应式），参数必须为对象（引用）类型**

根据用户传入的参数对象，凭此生成代理对象，同时适配对应的get，set构造函数。

在get构造函数中：收集依赖，返回访问值（如果访问值是一个对象（引用类型），经reactive二次包装后，再返回）。在set构造函数中：修改值，触发依赖执行

**收集依赖**：初始化*存储依赖的映射/集合*，判断是否收集依赖（**自主断开依赖与数据属性之间的联系时，此时再调用依赖，将不在收集**），执行依赖收集，同时建立依赖与数据属性的双向联系（解决依赖遗留问题（分支切换），在执行依赖之前，断开依赖与数据属性之间的联系，在依赖执行时在重新收集）

**触发依赖**：访问依赖映射，取出对应属性的依赖集合。生成用于依赖执行的集合，基于该集合遍历执行依赖，执行依赖期间同时判断当前依赖是否与当前处于激活态的依赖相同，相同则不执行该依赖，反之正常执行。（避免依赖中包含 ++操作，导致的栈溢出问题）。

## ref实现

**处理点：响应式，参数类型无限制，.value读写， 仅当值发生改变时，才触发依赖执行**

根据用户传入的参数，创建ref类实例对象（功能实现基于类实现），同时适配 value的get，set构造函数

在get构造函数中：收集依赖，返回访问值。在set构造函数中：判断值是否改变，未发生改变直接返回值，反之，判断新值是否为对象类型，是则使用reactive进行包裹，反之不做任何处理。判断完毕后，设置value值，触发依赖执行。

## computed实现

**处理点：响应式，.value读取，仅当关联的值发生改变时，才触发修改**

根据传入的参数getter，创建computed类实例对象（功能基于类实现），同时适配value的get构造函数

根据参数getter创建对应依赖，同时配置scheduler，在scheduler中修改脏变量为true。在get构造函数中，当脏变量为true时，才触发数据更新，反之则直接返回值。数据更新时，修改脏变量为false，标识已更新，执行创建的依赖函数，获取最新值并返回。**脏变量的更新放置在scheduler中。当getter中关联的响应式数据发生改变时，调用依赖执行，修改脏变量为true。等到用户访问  .value时，在执行getter，获取最新值。**

## emit的实现

在创建组件实例时，挂载emit方法到组件实例对象上。emit函数可以从setup()的第二个参数中提取。使用时，传入相应的自定义事件名称，和需要传递的参数。在emit函数的执行中，通过props查找自定义事件的绑定。如果存在绑定则执行对应事件，反之，则不执行。

```js
 function createComponentInstance() {
    ......
  // 利用bind() 让用户使用emit时第一个参数为事件名称
  component.emit = emit.bind(null, component) as any
  return component
}

 function emit(instance, event, ...args) {
    
    // 从组件实例上获取props
    const { props } = instance
    // 获取自定义事件名称
    const handlerName = toHandelrKey(camelize(event))
    // 获取事件函数
    const handler = props[handlerName]
    
    // 触发事件函数
    handler && handler(...args)
}

```

## provide、inject的实现

在创建组件实例对象时，挂载provides节点（如果parent节点存在值，则赋值**parent.provides**，反之赋值 **{}**），parent节点（存储上级组件实例对象）

* provide的实现

根据当前组件实例对象解构出provides节点，若当前组件实例对象存在上级组件，则提取出**上级组件实例对象的provides节点**与**当前组件实例对象的provides节点**作***比对***。若比对成功，则**将当前组件实例对象的provides节点的隐式原型指向其上级组件实例对象的provides，便于链式查找**。最后设置provides节点内容。

* inject的实现

根据当前组件实例对象解构出provides节点，**判断访问的参数key是否存在其provides节点中，如果存在则直接返回对应值**，反之，则判断用户是传入相应默认值参数，如果存在，则直接返回默认值。（若默认参数是函数，则返回函数执行）



