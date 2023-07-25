import { transformElement } from "./plugin/transformElement"
import { transformExpression } from "./plugin/transformExpression"
import { transformText } from "./plugin/transformText"
import { generate } from "./codegen"
import { baseParse } from "./parse"
import { transform } from "./transform"

export function baseCompile(template) {
  // 把template（字符串）转换成 ast树
  const ast: any = baseParse(template)
  // 对ast树进行 中间层处理
  transform(ast, {
    transformFns: [transformExpression, transformElement, transformText,]
  })
  // 生成render函数代码
  return generate(ast)
}