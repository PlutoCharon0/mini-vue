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

   **注意：render的执行会被一个effect()函数包裹，而这个effect()函数会被挂载到组件实例对象的update节点上。用于更新。**

* **组件更新**

1. 检测组件是否需要更新
   * 即检查绑定到组件的props是否发生改变，改变场景：props少了，props数量不变值变了，props多了。

2. 需要更新，则将新的组件虚拟节点挂载到组件实例对象的next的节点上，再调用其组件实例对象上的update函数，更新组件。在更新过程中，判断组件实例对象上是否存在next节点，若存在，则说明是组件更新。
   * 手动地设置新组件虚拟节点的el节点，从组件实例对象的vnode节点解构出el节点赋值继承。(***组件最新的虚拟节点并没有初始化 需要手动给新的节点赋值el属性***)。
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

若为文本类型，则调用**document.createTextNode(children)**,生成文本children内容并调用 **el.append()** 插入到根元素（el）中。

若为数组类型，则遍历数组（存储着虚拟节点），调用**patch()**渲染。

4. 将根元素插入到根容器中

调用 **container.insertBefore(el, anchor || null)** 将完整元素内容插入到根容器中。（anchor参数作为锚点，其设置在后续元素更新时有用处）。

* **元素更新**

**数据发生改变 -> 视图更新（DOM更新）——利用effect包裹render函数的执行,创建依赖。当数据更新时，则触发依赖执行。**

1. 依赖执行时，触发patch的执行,此时会同时传入新、旧虚拟节点，用于比对更新。在进行props和children节点更新前，需要挂载旧虚拟节点的el属性到新虚拟节点上（新虚拟节点不经历根元素创建流程，需要继承获取）。
2. props的更新

分别从新、旧节点中获取相应的新、旧props。调用**patchProps(el,oldProp,newProp)**,更新props。

**更新过程**：**遍历新props**，查找其中的key是否存在于旧props中，如果key存在于旧props中，则开始比对它们的值是否相同，不同则调用patchProp()更新值。若key不存在，则说明出现了新属性，则调用patchProp()补充新的key-value。**遍历旧props**，查看其中的key是否存在于新props中，如果不存在，则说明相应的key-value需要删除。调用patchProp()进行删除。

更新情景：**props的key不发生改变，值发生改变**、**在旧props的基础上，出现新的key-value**、**新props中丢失了一些key-value。**

3. children的更新

**更新过程**：分别从新旧虚拟节点中**提取**出其**类型标识**以及其**相应的children节点**，根据相应情景进行相应处理。

更新情景：

* arrayChildren —— textChildren

调用**unmountChildren()**清空旧children内容：遍历children节点（数组），获取对应childrenItem的el节点，调用**hostRemove()**,处理清空逻辑（核心处理逻辑： **parentNode.removeChild(children)**）。旧children清空完毕，调用**hostSetTextElement(el, text)**创建文本节点，并插入到根容器中。（核心处理逻辑：***el*.textContent = *text***）。

* textChildren —— textChildren

判断内容是否发生改变，若发生改变调用 **hostSetTextElement(el, text)** 更新内容，反之不做任何处理。

* textChildren —— arrayChildren

调用 **hostSetTextElement(el, text)** 清空旧children内容，调用 **mountChildren()** 渲染新children内容，即遍历出childrenItem调用patch()渲染。

* arrayChildren —— arrayChildren

| 1. 预处理前置节点                      |
| -------------------------------------- |
| **2. 预处理后置节点**                  |
| **3. 处理仅有新增节点情况**            |
| **4. 处理仅有删除节点情况**            |
| **5.  处理其他情况（新增/删除/移动）** |

**声明左指针 i ，声明两个右指针分别指向新旧children的末尾元素位置：旧 - e1，新 - e2** 

```ts
	// render.ts patchKeyedChildren()
 	let i = 0; // 左指针
        let e1 = c1.length - 1; // 指向旧children（数组）的最后一个元素位置
        let e2 = c2.length - 1; // 指向新children（数组）的最后一个元素位置
```

1. 左侧对比
```ts
// render.ts patchKeyedChildren()
function isSameVNodeType(n1, n2) {
    return n1.type === n2.type && n1.key === n2.key
}
while (i <= e1 && i <= e2) { // 左侧对比
	const n1 = c1[i] // 从数组左侧开始 获取旧children（数组）中的个体虚拟节点
	const n2 = c2[i] // 从数组左侧开始 获取新children（数组）中的个体虚拟节点
	if (isSameVNodeType(n1, n2)) { // 判断新旧虚拟节点是否为相同类型
		patch(n1, n2, container, parentComponent, anchor) // 比对更新其节点的属性和children
	} else {
		break;
	}
	i++;
}
```
利用while循环依次取出新旧children中的节点个体项，对比虚拟节点的类型，**若节点类型相同，则说明是该节点的属性或子节点内容需要更新，调用patch()进行更新**。在每次循环中将左指针右移。**当对比的新旧节点类型不同时，跳出循环，说明左侧对比完成**，此时的指针情况有：i等于e1且小于e2（**对比旧children，新children中右侧出现节点置换，节点增添**），i大于e1且小于e2（**对比旧children，新children中右侧出现节点增添**），i等于e1且大于e2（**对比旧children，新children中右侧出现节点缺失**），i等于e1等于e2（**对比旧children，新children中右侧出现节点置换**）,故左侧对比的判断条件为 左指针必须同时满足 <= e1/e2的条件。

2. 右侧对比
```ts
// render.ts patchKeyedChildren()
function isSameVNodeType(n1, n2) {
    return n1.type === n2.type && n1.key === n2.key
}
while (i <= e1 && i <= e2) { // 右侧对比
	const n1 = c1[e1] // 从数组右侧开始 获取旧children（数组）中的个体虚拟节点
	const n2 = c2[e2] // 从数组右侧开始 获取新children（数组）中的个体虚拟节点
	if (isSameVNodeType(n1, n2)) { // 判断新旧虚拟节点是否为相同类型
		patch(n1, n2, container, parentComponent, anchor) // 比对更新其节点的属性和children
	} else {
		break;
	}
	e1--;
	e2--;
} ab   deab 0 -1 1   abc  bc  0 0 -1   dab  cab 0 0 0  ab dcb 0 0 1
```
利用while循环依次取出新旧children中的个体项，对比虚拟节点的类型，**若节点类型相同，则说明是该节点的属性或子节点内容需要更新，调用patch()进行更新**，在每次循环中将两个右指针左移。**当对比的新旧节点类型不同时，跳出循环，说明右侧对比完成**。此时的指针情况有：i等于0大于e1且e2大于e1（**对比旧children，新children中左侧出现节点增添**），i等于0且e1大于e2（**对比旧children，新children中左侧出现节点缺失**），i等于e1等于e2（**对比旧children，新children左侧出现节点置换**），i等于e1且小于e2（**对比旧children，新children中的左侧出现节点置换，节点增添**），故右侧对比的判断条件同样为 左指针必须同时满足 <= e1/e2的条件。

3. 中间对比

在正式进行中间对比之前，先处理左侧，右侧对比的结果。

* 当 **i > e1 && i <= e2** 说明存在新节点需要创建，获取锚点标识插入位置。如果nextPos的值 大于新children的length说明当前新节点需要插入到末尾位置。仅当**i <= e2** 时，进行创建更新。（左指针无论如何都不会大于新children的右指针）。创建新节点的同时，推进左指针右移。标识当前节点处理完毕。（**仅新增**）
* 当 **i <= e1 && i > e2** 说明存在旧节点需要销毁， 仅当 **i <= e1 时**，进行销毁（左指针无论如何都不会大于旧children的右指针）。销毁节点的同时，推进左指针右移，标识当前节点处理完毕。（**仅删除**）

**进入中间对比**：

（以下children所描述的是**中间区块的待对比部分**）

1. 定义s1，s2变量分别记录新旧children待处理部分的起始位置。
2. 构造新children的位置映射表 **keyToNewIndexMap = new Map()** ，**用于映射出新节点与位置的索引关系。**
3. **填充新children的位置映射表，遍历新children，以节点个体项的key属性作为 key值，s2为起始value值。循环填充。**
4. 定义当前最远位置 变量  **maxNewIndexSoFar = 0** ，用于记录新children中当前的最远位置，目的是**用于判断新旧children在遍历过程中是否同时呈现递增趋势**，如果不是则证明了节点发生了移动，需要将移动标识设置为true，以便后续进行移动处理。
5. 构建新旧children的位置映射表 **newIndexToOldIndexMap—— array.fill(0)** ,初始值都为0，用于记录新旧children位置的映射关系.经过 **处理** 后，若对应值还是0，说明该节点为新节点，需要创建。
6. 填充新旧children位置映射表，从遍历旧children开始。
   * 获取旧children中的节点个体项，声明变量 **newIndex 用于存储 根据旧节点在新节点keyMap里查找的结果(新节点个体项索引值)**
   * 判断节点个体项是否拥有key属性，如果存在，则**根据key属性从新children的位置映射表（keyToNewIndexMap ）中查找当前节点是否存在**。若不存在key属性，则通过遍历新children的方式查找存在与否。将结果存储在 **newIndex** 中
   * 如果**没有查找到**则说明 新children中不存在该节点个体项，需要删除
   * **查找到**则说明该节点个体想同时存在于新旧children中，首先填充新旧children的位置映射表 **newIndexToOldIndexMap**，**待填充值的索引为当前节点在映射表中的位置（newIndex - s2）**, 值为**当前左指针 +1** （左指针可能为0，说明新节点在旧children中不存在，为了标识处理，故进行 +1处理）。
   * 判断**newIndex** 是否 >= **maxNewIndexSoFar**，若大于则将当前最远位置设置为**newIndex**的值，反之则说明当前节点个体项发生了移动，设置移动标识为true。以便后续进行移动处理。（**根据判断新节点个体项的索引是否呈递增趋势来判断节点是否发生移动**）
   * 调用patch()执行对应更新
7. 处理新旧children位置映射表
   * 从该映射表中寻找一个**最长递增子序列，目的是让节点能够以做到最小限度的移动操作**，同时定义**变量j指向该最长递增子序列的末尾元素**。
   * 利用倒序循环遍历新children,  **i为循环变量**（**在移动节点位置时， 需要保证锚点anchor 必须是处理完的，确定的节点，故使用倒序循环**）
   * 确定当前待处理的节点在新children中的索引（**s2 + i**）, 提取节点，同时获取锚点
   * 判断 以**当前循环变量i的值作为索引**的**新旧children位置映射表中的值是否为0**，如果是则说明当前节点在新children中不存在，需要创建。调用patch()进行创建，挂载。
   * 判断 移动标识变量是否为true，若为true则说明需要进行移动操作。二次判断**变量j是否小于0** || **当前循环变量i是否与最长递增子序列中的值不匹配**，满足其中一个 则说明当前节点需要移动。调用hostInsert()传入锚点及相关参数。进行移动操作。如果值匹配成功，说明当前变量不是待移动节点，则对**变量j进行自减操作 **

```ts
	// render.ts patchKeyedChildren()
	if (i > e1) { // 新children中节点比旧children节点多 创建
            if (i <= e2) {
                const nextPos = e2 + 1
                const anchor = nextPos < c2.length ? c2[nextPos].el : null
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor)
                    i++
                }
            }
        } else if (i <= e1 && i > e2) { // 新children中节点比旧children节点少 销毁
            while (i <= e1) {
                hostRemove(c1[i].el)
                i++
            }
        } else { // 中间区域对比
            // 获取i索引
            let s1 = i
            let s2 = i
            const keyToNewIndexMap = new Map() 
            let moved = false
            let maxNewIndexSoFar = 0
            for (let i = s2; i <= e2; i++) { // 基于新节点来创建 节点key属性 映射以进行对比
                const nextChildren = c2[i]
                keyToNewIndexMap.set(nextChildren.key, i)
            }
            const toBePatched = e2 - s2 + 1 // 需要处理新节点的数量
            let patched = 0
            // 初始化 根据新的index映射出旧的index 
            // 创建数组时给定数组长度 （性能优化点）
            // 给数组填充0 在后续处理中 如果查找发现对应值为0时，说明新值在老的里面不存在 需要创建
            const newIndexToOldIndexMap = new Array(toBePatched).fill(0)
            for (let i = s1; i <= e1; i++) {
                // 遍历旧节点 
                // 1.需要找出旧节点存在 新节点不存在的 -> 需要将其删除
                // 2. 新老节点都存在 递归调用patch
                const prevChilren = c1[i] // 获取旧节点个体
                //如果旧的节点大于新节点的数量的话，那么在处理旧节点时可以直接删除（性能优化点）
                if (patched >= toBePatched) {
                    hostRemove(prevChilren.el)
                    continue
                }
                let newIndex // 存储 根据旧节点在新节点keyMap里查找的结果
                if (prevChilren.key) {
                    // 如果旧节点存在key 则可以通过 由新节点生成的key映射查找当前处理的旧节点在新节点中的索引
                    // 时间复杂度为O(1)
                    newIndex = keyToNewIndexMap.get(prevChilren.key)
                } else {
                    //如果没有key的话 只能通过遍历所有新节点的方式来确定当前节点是否存在
                    // 实践复杂度为O(n)
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVNodeType(prevChilren, c2[j])) {
                            newIndex = j
                            break;
                        }
                    }
                }
                if (!newIndex) {
                    // 如果没查找到 说明 新节点中不包含该节点 删除节点即可
                    hostRemove(prevChilren.el)
                } else {  // 新老接节点都存在 重新进行对比
                    // 根据新节点的索引和老节点的索引建立映射关系
                    //  +1的原因是因为 i 可能为0， 如果i为0的话说明新节点在老节点中不存在
                    newIndexToOldIndexMap[newIndex - s2] = i + 1
                    // 确定中间的节点是否需要移动
                    // 如果新的newIndex一直是升序的话 则说明为发生节点移动的情况
                    // 根据记录最后一个节点在新的里面的索引 来观察是否升序
                    // 不是升序的话 可以确定该节点移动过了
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex
                    } else {
                        moved = true
                    }
                    patch(prevChilren, c2[newIndex], container, parentComponent) // 处理节点本身的props children更新
                    patched++
                }
            }
            // 利用最长递增子序列来优化移动逻辑
            // 如果元素是升序的话 那么这一批升序的元素不需要移动
            // 通过最长递增子序列来获取到升序的列表
            // 在移动的时候再去对比这个列表 如果对比的上的话，则说明当前元素不需要移动
            // 通过moved来进行优化，如果没有移动过的话，那么就不需要执行获取最长递增子序列的算法
            // getSequence 返回的是 newIndexToOldIndexMap 的索引值
            // 所以后面我们可以直接遍历索引值来进行处理 直接使用toBePatched即可
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : []
            let j = increasingNewIndexSequence.length - 1

            // 遍历新节点
            // 1.需要找出旧节点不存在 而新节点存在的 -> 需要创建新节点
            // 2.最后需要移动一下位置 比如 【c，d，e】 => 【e，c，d】

            // 使用倒循环 是因为在移动节点位置时， 需要保证锚点anchor 必须是处理完的，确定的节点
            for (let i = toBePatched - 1; i >= 0; i--) {
                // 确定当前要处理的节点索引
                const nextIndex = s2 + i
                const nextChild = c2[nextIndex]
                // 锚点节点的索引 为当前正处理的节点的索引+1 即后面一个紧跟着的节点
                const anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null
                if (newIndexToOldIndexMap[i] === 0) {
                    // 说明新节点在旧节点中不存在 需要创建
                    patch(null, nextChild, container, parentComponent, anchor)
                } else if (moved) {
                    // 说明需要移动节点
                    // 1. j为-1 说明剩下的都是需要移动的
                    // 2. 最长递增子序列里面的值和当前的值匹配不上的话 说明当前元素需要移动
                    if (j < 0 || increasingNewIndexSequence[j] !== i) {
                        // 移动节点
                        hostInsert(nextChild.el, container, anchor)
                    } else {
                        // 值匹配命中后 移动指针
                        j--;
                    }
                }
            }
        }

```

## 组件更新/元素更新的异步实现

将effect函数的执行放入一个微任务中执行。即用effect函数包裹更新逻辑时，配置scheduler，调用queueJobs()

queueJobs执行过程：

执行前声明变量 **queue = [ ]**作为任务队列，变量**isFlushPending** 作为是否正在刷新队列的标识，默认值为false

1. 判断当前任务是否存在与任务队列中，不存在则添加更新任务到队列中
2. 刷新任务队列，判断任务队列是否处于刷新状态，是则不作任何处理，反之则修改标识为true，标识正在执行任务队列的刷新。
3. 执行任务队列中的任务，利用promise.resolve().then()包裹任务队列中任务的遍历执行。执行完毕后重置标识为false

## nextTick的实现

```ts
function nextTick(fn?) {
  return fn ? p.then(fn) : p
}
```

