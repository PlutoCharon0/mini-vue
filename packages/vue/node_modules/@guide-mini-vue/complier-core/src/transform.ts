import { NodeTypes } from "./ast";
import { TO_DISPLAY_STRING } from "./runtimeHelpers";
// 创建统一处理的上下文对象
function createTransformContext(root, options) {
  const context = {
    root,
    transformFns: options.transformFns,
    helpers: new Map(),
    helper(fnName) {
      context.helpers.set(fnName, 1)
    }
  }
  return context
}

export function transform(root, options = {}) {
  // 获取统一处理的上下文对象
  const context = createTransformContext(root, options)

  // 通过深度有优先搜索 遍历ast树
  traverseAstTree(root, context)

  createRootCodegen(root, context);

  // 挂载helpers节点到ast根节点上
  root.helpers = [...context.helpers.keys()]

}


// 深度有优先搜索 遍历ast树
function traverseAstTree(node, context) {

  const { transformFns } = context
  const exitFns:any[] = []
  if (transformFns) {
    for (let i = 0; i < transformFns.length; i++) {
      const transformFn = transformFns[i]

      const onExit = transformFn(node, context)
      if (onExit) exitFns.push(onExit)
    }
  }
  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING)
      break;
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      traverseChildren(node, context)
      break;
    default:
      break;
  }
  let i = exitFns.length
  while(i--) {
    exitFns[i]()
  }
}

function traverseChildren(parentNode, context) {
  const children = parentNode.children
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    traverseAstTree(child, context)
  }
}


function createRootCodegen(root, context) {
  
  const child = root.children[0]
  
  if (child.type === NodeTypes.ELEMENT && child.codegenNode) {
    root.codegenNode = child.codegenNode
  } else {
    root.codegenNode = child
  }

}
