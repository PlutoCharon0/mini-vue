import { NodeTypes } from "../ast";
import { CREATE_ELEMENT_VNODE } from "../runtimeHelpers";

export function transformElement(node, context) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      context.helper(CREATE_ELEMENT_VNODE)

      // 中间层处理
      const vnodeTag = `"${node.tag}"`

      let vnodeProps = node.props

      const children = node.children[0]

      let vnodeChildren = children

      const vnodeElement = {
        type: NodeTypes.ELEMENT,
        tag: vnodeTag,
        props: vnodeProps,
        children: vnodeChildren ||'[]'
      }
      node.codegenNode = vnodeElement
    }
  }
}