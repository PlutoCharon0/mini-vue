import { transformElement } from "../src/plugin/transformElement"
import { transformExpression } from "../src/plugin/transformExpression"
import { transformText } from "../src/plugin/transformText"
import { generate } from "../src/codegen"
import { baseParse } from "../src/parse"
import { transform } from "../src/transform"

describe('codegen', () => {
  it('string', () => {
    const ast = baseParse('hi')

    transform(ast)

    const { code } = generate(ast)

    expect(code).toMatchSnapshot()
  })
  it('interpolation', () => {
    const ast = baseParse('{{message}}')
    transform(ast, {
      transformFns: [transformExpression]
    })

    const { code } = generate(ast)

    expect(code).toMatchSnapshot()
  })
  it('element', () => {
    const ast = baseParse('<div></div>')

    transform(ast, {
      transformFns: [transformElement]
    })

    const { code } = generate(ast)

    expect(code).toMatchSnapshot()
  })
  it('compound', () => {
    const ast: any = baseParse('<div>hi,{{message}}</div>')

    transform(ast, {
      transformFns: [transformExpression, transformElement, transformText,]
    })

    const { code } = generate(ast)

    expect(code).toMatchSnapshot()
  })
})