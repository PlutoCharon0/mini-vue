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

```ts
 function createComponentInstance() { // component.ts
    ......
  // 利用bind() 让用户使用emit时第一个参数为事件名称
  component.emit = emit.bind(null, component) as any
  return component
}

 function emit(instance, event, ...args) { // componentEmits.ts
    
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
## slot的实现

**当组件渲染到子组件时，会把挂载到子组件的插槽内容挂载到子组件实例对象的slots节点上，在渲染子组件DOM内容时，通过this.$slots以及renderSlots函数获取插槽内容并渲染相应内容。**

在创建子组件虚拟节点时，判断其children节点是否为object类型，若为object类型，则说明该children节点是插槽slot的节点内容。标识虚拟节点类型为***拥有插槽***类型。同时在后续创建组件实例对象时，给组件实例对象挂载slots节点。（虚拟节点和组件实例对象存在双向联系）

在配置组件过程中，初始化slots。初始化过程中，判断当前组件是否拥有插槽（根据标识来判断），若该组件拥有插槽，则遍历虚拟节点上的children节点，取出对应插槽，配置到组件实例对象上的slots节点上（注意：值的形式为 函数形式）。

```js
import { ShapeFlags } from "@guide-mini-vue/shared"
// componentSlots.ts
export function initSlots(instance, children) {
    const { vnode, slots } = instance
    // 判断虚拟节点是否为插槽内容
    if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
        // 配置slots节点内容
        normalizeObjectSlots(children, slots)
    }

}

function normalizeObjectSlots(children, slots) {
    // children的数据结构为对象 通过对children进行遍历 获取对应的插槽
    for (const key in children) {
		// key指向插槽名称
        const value = children[key]
        // 函数形式 --> 作用域插槽
        slots[key] = (props) => normalizeSlotValue(value(props))

    }
}
// 判断slots中的虚拟节点是否用数组形式存储 如果不是则需要转换成数组形式以便渲染
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value]
}

```

在renderSlots函数中，接收一个slots节点，和插槽名称（具名插槽）和 props（作用域插槽）

```ts
import { Fragment, createVNode } from "../vNode";
// helpers/renderSlots.ts
export function renderSlots(slots, name = 'default', props) {

    const slot = slots[name]

    if (slot) {
        // 存储slots节点内容的数据结构是普通数组 需要手动的将它们转换为虚拟节点
        if (typeof slot === 'function') {
            return createVNode( Fragment, { name }, slot(props))
        }
    }
}
```

## 组件渲染/更新



* **组件初始化**

**render() -> patch() -> 判断虚拟节点类型为组件类型 -> 进入初始化**

* **组件初始化**

1. 创建组件实例对象，挂载相关节点到组件实例对象上，以便后续操作

```ts
function createComponentInstance(vnode, parent) { // component.ts
    const component = {
        vnode, // 虚拟节点
        type: vnode.type, // 虚拟节点类型:Element虚拟节点根元素/Component虚拟节点配置对象
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
```

2. 配置组件

   1. 组件props初始化

   将组件虚拟节点的props节点挂载到组件实例对象上

   2. 组件插槽初始化

   判断组件虚拟节点类型为**拥有插槽**类型，则从其虚拟节点提取出children节点，配置slots节点内容。以便后续插槽内容的渲染。

   3. 调用setup函数，处理setup返回值

   * **将setup函数返回的对象利用proxy代理到render的this指向上,以便在render函数中使用对应数据字段**，此处先将该代理对象绑定到组件实例对象的proxy节点上。等到render的执行，再绑定指向。

   ```ts
   // component.ts  setupStatefulComponent()
   instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHandlers)
   ----------------------------------------------------------------------------
   // componentPublicInstance.ts
   import { hasOwn } from "@guide-mini-vue/shared"  
   
   const publicPropertiesMap = {
       '$el': (instance) => instance.vnode.el,
       "$slots": (instance) => instance.slots, 
       '$props': (instance) => instance.props    
   }
   
   
   export const publicInstanceProxyHandlers =  {
       get({ _: instance }, key) {
           const { setupState, props } = instance
           // 判断所访问的属性所属 setupState/props，返回对应值
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
   ```

   * 设置当前currentInstance（当前操作的组件实例对象），以便用户在setup函数中获取
   * 从组件实例对象type节点解构出setup函数，配置相关参数并执行。第一个参数为绑定到组件的属性（绑定到组件上的属性不能由绑定组件修改，所以需要使用shallowReadonly包裹），第二个参数为setup函数的上下文对象（提供 attrs，slots,  emit, expose的访问，此处只实现了emit的访问）

   ```ts
   setup(shallowReadonly(instance.props), { emit: instance.emit })
   ```

   * setup函数执行完毕，则处理其返回值。如果返回值是对象类型，则**将返回值绑定到组件实例对象的setupState节点上**，在挂载的同时**使用proxyRefs**对返回值再进行一次代理，以便用户访问ref实例对象时，**避免.value的访问，便捷访问**。若是函数类型，则将其挂载到render节点，作为render函数
   * 返回值处理完毕后，从组件实例对象的type节点解构出render函数，挂载到组件实例对象上，用于后续render函数的执行。

3. 调用render，渲染子组件，渲染组件DOM

   * 从组件实例对象解构出proxy代理对象用于**改变render函数的this指向**
   * 调用**render.call(proxy,proxy)**，获取虚拟DOM树，同时挂载到组件实例对象的subTree节点上
   * **调用patch()，渲染虚拟DOM树**
   * 等到虚拟DOM树的节点都渲染完毕，**根据虚拟DOM树的el节点为组件虚拟节点挂载el节点**。（只有DOM渲染完毕了才能获取到el节点）
   * 标识isMounted节点为true，说明组件已经初始化完毕。（等到下次组件更新时，就不必重复初始化逻辑，运行更新逻辑即可）

   **注意：render的执行会被一个effect()函数包裹，而这个effect()函数会被挂载到组件实例对象的update节点上。用于更新**

* **组件更新**

1. 检测组件是否需要更新
   * 即检查绑定到组件的props是否发生改变，改变场景：props少了，props数量不变值变了，props多了。

2. 需要更新，则将新的组件虚拟节点挂载到组件实例对象的next的节点上，再调用其组件实例对象上的update函数，更新组件。在更新过程中，判断组件实例对象上是否存在next节点，若存在，则说明是组件更新。
   * 手动地设置新组件虚拟节点的el节点，从组件实例对象的vnode节点解构出el节点赋值继承。(***组件最新的虚拟节点并没有初始化 需要手动给新的节点赋值el属性***)
   * 在执行render之前，**由于新的虚拟节点 并没有经过组件初始化的过程需要手动绑定，即更新 新组件虚拟节点 所属的组件实例对象节点配置**，主要是vnode，和props节点的更新。
   * 执行render，获取组件DOM树，调用patch渲染。

## 虚拟DOM渲染/更新

**render() -> patch() -> 判断虚拟节点类型为元素类型 -> 进入初始化**

* **元素初始化**

1. 创建根元素

提取虚拟节点（vnode）的type节点，调用**document.createElement(“vnode.type”)**，创建根元素，并挂载el节点到虚拟节点上，以便后续渲染。

2. 设置props

**提取虚拟节点（vnode）的props节点（objec类型），遍历props节点**，调用patchProp()，利用***el*.setAttribute(key,value)**设置属性,同时判断props的key是否带有on字段，若存在则处理该字段提取出事件名称，利用***el*.addEventListener(eventName,value)**绑定事件。

3. 渲染子节点内容

**提取虚拟节点（vnode）的children节点，判断虚拟节点的类型**（在创建虚拟节点时，确认类型，此处类型判断 该虚拟节点的children节点是纯文本还是数组类型）。

若为文本类型，则调用**document.createTextNode(children)**,生成文本children内容并调用**el.append()**插入到根元素（el）中。

若为数组类型，则遍历数组（存储着虚拟节点），调用**patch()**渲染。

4. 将根元素插入到根容器中

调用**container.insertBefore(el, anchor || null)**将完整元素内容插入到根容器中。（anchor参数作为锚点，其设置在后续元素更新时有用处）

* **元素更新**

**数据发生改变 -> 视图更新（DOM更新）——利用effect包裹render函数的执行,创建依赖。当数据更新时，则触发依赖执行。**

1. 依赖执行时，触发patch的执行,此时会同时传入新、旧虚拟节点，用于比对更新。在进行props和children节点更新前，需要挂载旧虚拟节点的el属性到新虚拟节点上（新虚拟节点不经历根元素创建流程，需要继承获取）
2. props的更新

分别从新、旧节点中获取相应的新、旧props。调用**patchProps(el,oldProp,newProp)**,更新props。

**更新过程**：**遍历新props**，查找其中的key是否存在于旧props中，如果key存在于旧props中，则开始比对它们的值是否相同，不同则调用patchProp()更新值。若key不存在，则说明出现了新属性，则调用patchProp()补充新的key-value。**遍历旧props**，查看其中的key是否存在于新props中，如果不存在，则说明相应的key-value需要删除。调用patchProp()进行删除。

更新情景：**props的key不发生改变，值发生改变**、**在旧props的基础上，出现新的key-value**、**新props中丢失了一些key-value**

3. children的更新

**更新过程**：分别从新旧虚拟节点中**提取**出其**类型标识**以及其**相应的children节点**，根据相应情景进行相应处理。

更新情景：

* arrayChildren —— textChildren

调用**unmountChildren()**清空旧children内容：遍历children节点（数组），获取对应childrenItem的el节点，调用**hostRemove()**,处理清空逻辑（核心处理逻辑： **parentNode.removeChild(children)**）。旧children清空完毕，调用**hostSetTextElement(el, text)**创建文本节点，并插入到根容器中。（核心处理逻辑：***el*.textContent = *text***）

* textChildren —— textChildren

判断内容是否发生改变，若发生改变调用**hostSetTextElement(el, text)**更新内容，反之不做任何处理。

* textChildren —— arrayChildren

调用**hostSetTextElement(el, text)**清空旧children内容，调用**mountChildren()**渲染新children内容，即遍历出childrenItem调用patch()渲染。

* arrayChildren —— arrayChildren

TODO

