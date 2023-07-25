import { NodeTypes } from "./ast"

const enum TagType {
  Start,
  End,
}

const ctx = {
  source: null
}

export function baseParse(content) {
  // 获取统一处理的上下文对象
  const context = createParserContext(content)
  return createRoot(parseChildren(context, []))
}
// 返回统一处理的上下文对象
function createParserContext(content) {
  // 创建统一处理的上下文对象
  return {
    source: content
  }
}
// 创建AST根节点
function createRoot(children) {
  return {
    type: NodeTypes.ROOT,
    children
  }
}
// 处理子节点
function parseChildren(context, ancestors) {
  // 存储子节点的数组
  const nodes: any[] = []
  while (!isEnd(context, ancestors)) {
    // 子节点单体
    let node;
    const s = context.source // 简化源内容 便于后续使用
    if (startsWith(s, '{{')) {
      // 判断源内容为 插值表达式 执行对应处理
      node = parseInterpolation(context)
    } else if (s[0] === '<') {
      if (s[1] === '/') {
        // 当处理到嵌套在内的标签类型子节点 的后置标签时 不作特别处理
        // 推进代码即可
        parseTag(context, TagType.End)
        // 处理完嵌套剩余的后置标签后 继续后续执行
        continue;
      } else if (/[a-z]/i.test(s[1])) {
        // 判断源内容为 元素标签 执行对应处理

        node = parseElement(context, ancestors)
      }
    }
    // 默认源内容为 文字类型
    if (!node) {
      node = parseText(context)
    }
    // 将子节点单体放入数组中
    nodes.push(node)
  }
  // 返回子节点数组
  return nodes
}

//检测当前处理的内容是否为结束标签 是则结束parse 反之继续parse解析
function isEnd(context, ancestors) {
  if (startsWith(context.source, '</')) {
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const tag = ancestors[i].tag
      if (startsWithEndTagOpen(context.source, tag)) {
        return true
      }
    }
  }
  return !context.source
}

// 用于处理插值类型子节点
function parseInterpolation(context) {
  // 1.先获取 }} 结束的index
  // 2.通过closeIndex - startIndex 来获取到内容的长度 contextLength
  // 3. 通过slice来截取内容
  const openDelimiter = '{{'
  const closeDelimiter = '}}'

  const closeIndex = context.source.indexOf(closeDelimiter)

  // 清除开头的两个 '{{'
  advanceBy(context, openDelimiter.length)

  // 获取原生内容的长度
  const rawContentLength = closeIndex - openDelimiter.length

  // 获取原生内容
  const rawContent = parseTextData(context, rawContentLength)

  // 清除原生内容中不必要的空格
  const content = rawContent.trim()
  // 清除末尾的两个 '}}'
  advanceBy(context, closeDelimiter.length)
  // 返回对应的 插值 节点对象
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    }
  }
}
// 用于处理元素标签类型子节点
function parseElement(context, ancestors) {
  // 解析tag,返回初步处理的子节点
  const element: any = parseTag(context, TagType.Start)

  // 将正处理的标签 进行入栈操作
  ancestors.push(element)

  // 处理标签内子节点
  element.children = parseChildren(context, ancestors)

  // 处理完标签 进行出栈操作
  ancestors.pop()

  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End)
  } else {
    throw new Error(`缺失结束标签:${element.tag}`);
  }

  return element
}

// 用于处理元素标签类型子节点
function parseTag(context, type) {
  // 利用正则来匹配标签名
  const match: any = /^<\/?([a-z][^\r\n\t\f />]*)/i.exec(context.source);
  // 获取标签
  const tag = match[1]
  // 清除前置标签的内容
  advanceBy(context, match[0].length + 1)

  if (type === TagType.End) return

  return {
    type: NodeTypes.ELEMENT,
    tag
  }
}
// 检查该标签是否有
function startsWithEndTagOpen(source, tag) {

  return startsWith(source, '</') && source.slice(2, 2 + tag.length) === tag
}
// 用于处理文字类型子节点
function parseText(context) {
  // 声明文字类型内容的终止标志
  const endTokens = ['<', '{{']
  // 存储内容的长度
  let endIndex = context.source.length

  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i])
    if (index !== -1 && endIndex > index) {
      endIndex = index
    }
  }
  // 获取原生文本内容
  const content = parseTextData(context, endIndex)

  return {
    type: NodeTypes.TEXT,
    content
  }
}

// 用于截取原生文本内容
function parseTextData(context, length) {
  //  截取文本内容
  const rawText = context.source.slice(0, length)
  // 重置context.source(针对text类型)
  advanceBy(context, length)

  return rawText
}

function startsWith(source, searchString) {
  return source.startsWith(searchString);
}


// 用于推进代码 截取丢弃不要的内容
function advanceBy(context, numberOfCharacters) {
  context.source = context.source.slice(numberOfCharacters)
}