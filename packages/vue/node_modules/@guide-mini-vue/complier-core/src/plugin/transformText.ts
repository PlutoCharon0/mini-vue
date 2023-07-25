import { NodeTypes } from "../ast";

export function transformText(node, context) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      const { children } = node
      let currentContainer;
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isText(child)) {
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j]
            if (isText(next)) {
              if (!currentContainer) {
                // 初始化 同时替换位置
                currentContainer = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  children: [child]
                }
              }
              currentContainer.children.push(" + ")
              currentContainer.children.push(next)
              children.splice(j, 1) // 删除合并的节点
              j--; // 更新指向 保证索引指向正确
            } else {
              currentContainer = undefined
              break
            }
          }
        }
      }
    }
  }
}

function isText(node) {
  return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION
}