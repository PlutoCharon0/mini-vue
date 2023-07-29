import { effect } from "@guide-mini-vue/reactivity";
import { EMPTY_OBJ } from "@guide-mini-vue/shared";
import { createComponentInstance, setupComponent } from "./component"
import { shouldUpdateComponent } from "./componentRenderUtils";
import { createAppAPI } from "./createApp";
import { queueJobs } from "./scheduler";
import { ShapeFlags } from "@guide-mini-vue/shared"
import { Fragment, Text } from "./vNode";

export function createRender(options) {
    const {
        createElement: hostCreateElement,
        patchProp: hostPatchProp,
        insert: hostInsert,
        remove: hostRemove,
        setTextElement: hostSetTextElement
    } = options

    function render(vnode, container) {
        patch(null, vnode, container, null, null)
    }

    function patch(n1, n2, container, parentComponent, anchor = null) {
        const { shapeFlag, type } = n2
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent)
                break;
            case Text:
                processText(n1, n2, container)
                break;
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    // 处理元素
                    processElement(n1, n2, container, parentComponent, anchor)
                } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    // 处理组件
                    processComponent(n1, n2, container, parentComponent)
                }
                break;
        }

    }

    function processFragment(n1, n2, container, parentComponent) {
        if (!n1) {
            mountChildren(n2.children, container, parentComponent)
        }
    }

    function processText(n1, n2, container) {
        if (!n1) {
            const { children } = n2
            const textNode = n2.el = document.createTextNode(children)
            container.append(textNode)
        }
    }

    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            // 初始化元素
            mountElement(n2, container, parentComponent, anchor)
        } else {
            // 更新元素
            patchElement(n1, n2, container, parentComponent, anchor)
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        console.log('patchElement');

        // 如果虚拟节点上不存在props属性 让它指向一个 指定的空对象
        const oldProp = n1.props || EMPTY_OBJ

        const newProp = n2.props || EMPTY_OBJ

        const el = n2.el = n1.el // 虚拟DOM节点更新时 其el属性需要继承
        // 更新元素属性
        patchProps(el, oldProp, newProp)
        // 更新子节点
        patchChildren(n1, n2, el, parentComponent, anchor)
    }

    function patchProps(el, oldProp, newProp) {
        if (oldProp !== newProp) {
            // 相同属性 但值不同 / 属性多了
            for (const key in newProp) {
                if (key in oldProp) {
                    if (oldProp[key] !== newProp[key]) {
                        hostPatchProp(el, key, null, newProp[key])
                    }
                } else {
                    hostPatchProp(el, key, null, newProp[key])
                }

            }
            if (oldProp !== EMPTY_OBJ) {
                // 属性 少了
                for (const key in oldProp) {
                    if (!(key in newProp)) {
                        hostPatchProp(el, key, oldProp[key], null)
                    }
                }
            }

        }
    }

    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const { shapeFlag: prevShapeFlag, children: c1 } = n1
        const { shapeFlag: nextShapeFlag, children: c2 } = n2
        if (nextShapeFlag & ShapeFlags.TEXT_CHILDRREN) {
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // array to text 
                // 清空 old children
                unmountChildren(n1.children)
                // 设置 new children
                hostSetTextElement(container, c2)
            } else {
                // text to text
                if (c1 !== c2) {
                    hostSetTextElement(container, c2)
                }
            }
        } else {
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDRREN) {
                // text to array
                // 清空 old children
                hostSetTextElement(container, '')
                // 设置 new children
                mountChildren(c2, container, parentComponent)
            } else {
                // array to array  diff
                patchKeyedChildren(c1, c2, container, parentComponent, anchor)
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, anchor) {
        let i = 0; // 左指针
        let e1 = c1.length - 1; // 指向旧children（数组）的最后一个元素位置
        let e2 = c2.length - 1; // 指向新children（数组）的最后一个元素位置

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
        }
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
                //如果已处理的节点个数大于待处理的新节点个数，说明该节点在新children中不存在，直接删除即可（性能优化点）
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
                    // 如果新的newIndex一直是升序的话 则说明没有发生节点移动的情况
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

    }

    function unmountChildren(children) {
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el
            hostRemove(el)
        }
    }
    function mountElement(vnode, container, parentComponent, anchor) {
        // 创建根元素
        const el = vnode.el = hostCreateElement(vnode.type)

        const { props, children, shapeFlag } = vnode

        // 设置props
        for (let key in props) {
            let val = props[key]
            hostPatchProp(el, key, null, val)
        }
        // 渲染子节点内容
        if (shapeFlag & ShapeFlags.TEXT_CHILDRREN) {
            const textNode = document.createTextNode(children)
            el.append(textNode)
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(vnode.children, el, parentComponent)
        }
        hostInsert(el, container, anchor)
    }

    function mountChildren(children, container, parentComponent) {
        children.forEach(vnode => {
            patch(null, vnode, container, parentComponent)
        })
    }


    function processComponent(n1, n2, container, parentComponent) {
        if (!n1) {
            // 初始化组件
            mountComponent(n2, container, parentComponent)
        } else {
            // 更新组件
            updateComponent(n1, n2)
        }
    }
    function updateComponent(n1, n2) {
        console.log('update');
        console.log('n1', n1);
        console.log('n2', n2);
        // 更新组件实例引用 
        // 手动更新绑定在当前处理的组件实例对象的vnode节点,以便下一次更新的时候可以获取到最后一次更新的节点
        const instance = n2.component = n1.component
        // 判断组件是否需要更新
        if (shouldUpdateComponent(n1, n2)) {
            // 给组件实例对象赋值最新的虚拟节点
            instance.next = n2
            // 调用绑定在组件实例对象上的update方法 一个存储着关于组件内容的effect函数
            instance.update()
        } else {
            // 组件不需要更新 则只需要覆盖对应属性即可
            n2.component = n1.component
            n2.el = n1.el
            instance.vnode = n2
        }
    }
    function mountComponent(initialVNode, container, parentComponent) {
        // 创建组件实例对象 
        const instance = initialVNode.component = createComponentInstance(initialVNode, parentComponent)
        // 初始化组件
        setupComponent(instance)
        // 调用render
        setupRenderEffect(instance, initialVNode, container)
    }

    function setupRenderEffect(instance, initialVNode, container) {
        instance.update = effect(() => {
            if (!instance.isMounted) {

                // 获取代理对象改变render函数this指向
                const { proxy } = instance
                // 获取虚拟DOM树
                const subTree = instance.subTree = instance.render.call(proxy, proxy)

                // 渲染节点元素
                patch(null, subTree, container, instance, null)

                // 由于vnode节点的不同 $el的挂载需要放在element元素渲染完之后
                initialVNode.el = subTree.el

                instance.isMounted = true
            } else {
                // 获取代理对象改变render函数this指向
                const { proxy, next, vnode } = instance
                // 如果有 next 的话， 说明需要更新组件的数据（props，slots 等）
                // 先更新组件的数据，然后更新完成后，在继续对比当前组件的子元素
                if (next) {
                    next.el = vnode.el // 组件最新的虚拟节点并没有初始化 需要手动给新的节点赋值el属性
                    updateComponentPreRender(instance, next)
                }
                // 获取新的虚拟DOM树
                const nextTree = instance.render.call(proxy, proxy)
                // 获取旧的虚拟DOM树
                const prevTree = instance.subTree
                instance.subTree = nextTree
                console.log('prev', prevTree);

                console.log('current', nextTree);

                // 更新渲染节点元素
                patch(prevTree, nextTree, container, instance)
            }
        }, {
            scheduler() {
                queueJobs(instance.update)
            }
        })
    }
    function updateComponentPreRender(instance, nextVNode) {
        // 新的虚拟节点 并没有经过组件初始化的过程 需要手动绑定 更新nextVNode所属的组件实例对象
        //  当前组件实例对象上挂载的vnode属性存储的节点属于旧节点

        // nextVNode.component = instance

        instance.vnode = nextVNode

        // instance.next = null

        const { props } = nextVNode
        instance.props = props
    }
    return {
        render,
        createApp: createAppAPI(render)
    }

}
/**  
* 获取最长递增子序列
*/
function getSequence(arr: number[]): number[] {
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
                } else {
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
