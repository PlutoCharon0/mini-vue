import { NodeTypes } from "../src/ast"
import { baseParse } from "../src/parse"

describe('Parse', () => {
  describe('interpolation', () => {
    it('simple interpolation', () => {
      const ast = baseParse('{{message}}')
      
      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: 'message'
        }
      })
    })
  })
  describe('element', () => {
    it('simple element', () => {
      const ast = baseParse('<p></p>')
      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'p',
        children: []
      })
    })
  })
  describe('text', () => {
    it('simple text', () => {
      const ast = baseParse('some Text')

      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'some Text'
      })
    })
  })
  test('union test', () => {
    const ast = baseParse(`<p>hi,{{message}}</p>`)
    expect(ast.children[0]).toStrictEqual({
      type: NodeTypes.ELEMENT,
      tag: 'p',
      children: [
        {
          type: NodeTypes.TEXT,
          content: 'hi,'
        },
        {
          type: NodeTypes.INTERPOLATION,
          content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'message'
          }
        }
      ]
    })
  })
  test('union test Nested elementt', () => {
    const ast = baseParse(`<div><p>hi</p>{{message}}</div>`)
    
    expect(ast.children[0]).toStrictEqual({
      type: NodeTypes.ELEMENT,
      tag: 'div',
      children: [
        {
          type: NodeTypes.ELEMENT,
          tag: "p",
          children: [
            {
              type: NodeTypes.TEXT,
              content: 'hi'
            },
          ]
        },
        {
          type: NodeTypes.INTERPOLATION,
          content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'message'
          }
        }
      ]
    })
  })
  test('should throw error when lack end tag', () => {
    expect(() => {
      baseParse('<div><span></div>')
    }).toThrow('缺失结束标签:span')
  })
})