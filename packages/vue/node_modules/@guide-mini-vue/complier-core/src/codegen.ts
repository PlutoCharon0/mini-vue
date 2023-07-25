import { isString } from "@guide-mini-vue/shared"
import { NodeTypes } from "./ast"
import { CREATE_ELEMENT_VNODE, TO_DISPLAY_STRING, helperNameMap } from "./runtimeHelpers"

// 创建统一的上下文对象
function createCodegenContext() {
  const context = {
    code: ``,
    push(source) {
      context.code += source
    },
    helperMapping(key) {
      return helperNameMap[key]
    }
  }
  return context
}

export function generate(ast) {

  // 获取统一的上下文处理对象
  const context = createCodegenContext()
  const { push } = context
  genFunctionPreamble(ast, context)

  const functionName = 'render'
  const args = ["_ctx", "_cache", "$props", "$setup", "$data", "$options"]
  push(`function ${functionName}`)
  push(`(${args.join(', ')}) {\n return `)
  // 处理核心节点的相关内容
  genNode(ast.codegenNode, context)
  push(`\n}`)
  return context
}
function genFunctionPreamble(ast, context) {
  const { push } = context
  const VueBinging = 'Vue'
  // 方法重命名
  const aliasHelper = (source) => `${helperNameMap[source]}: _${helperNameMap[source]}`
  if (ast.helpers.length > 0) {
    // 如果helpers数组中的长度大于0 说明当前处理的节点需要额外的函数导入支持
    push(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = ${VueBinging} \n`)
  }
  push('return ')
}

function genNode(node, context) {

  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, context)
      break;
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break;
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break;
    case NodeTypes.ELEMENT:
      genElemnet(node, context)
      break;
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context)
      break;
    default:
      break;
  }
}
function genText(node, context) {
  const { push } = context
  push(`"${node.content}"`)
}
function genInterpolation(node, context) {
  genNode(node.content, context)
}
function genExpression(node, context) {
  const { push, helperMapping } = context
  push(`_${helperMapping(TO_DISPLAY_STRING)}(${node.content})`)
}
function genElemnet(node, context) {
  const { push, helperMapping } = context
  const { children, tag, props } = node
  push(`_${helperMapping(CREATE_ELEMENT_VNODE)}(`)
  genNodeList(genNullableArgs([tag, props, children]), context)
  push(`)`)
}
// 综合处理参数值是否为undefined 如果是统一转换成null
function genNullableArgs(args) {
  return args.map(arg => arg || "null")
}

function genNodeList(nodes, context) {
  
  const { push } = context
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]

    if (isString(node)) {
      push(node)
    } else[
      genNode(node, context)
    ]
    if (i < nodes.length - 1) {
      push(', ')
    }
  }
}
function genCompoundExpression(node, context) {

  const { push } = context
  const { children } = node

  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (isString(child)) {
      push(child)
    } else {
      genNode(child, context)
    }
  }
}
