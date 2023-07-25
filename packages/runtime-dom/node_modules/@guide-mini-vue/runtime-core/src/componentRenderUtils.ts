export function shouldUpdateComponent(prevVNode, nextVNode) {
  // 解构出绑定在组件上的props
  const { props: prevProps } = prevVNode
  const { props: nextProps } = nextVNode
  // 1. 如果props没有发生变化 就不需要更新
  if (prevProps === nextProps) {
    return false
  }
  // 2.如果之前没有props 就观察当前新的节点是否有props
  if (!prevProps) {
    return !!nextProps
  }
  // 3.如果之前有props 现在没有props 则需要更新
  if (!nextProps) {
    return true
  }
  return hasPropsChanged(prevProps, nextProps)
}

function hasPropsChanged(prevProps, nextProps) {
  // 依次对比每个props
  const nextKeys = Object.keys(nextProps)
  // 对比length 如果length不一致 则需要进行更新
  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true
  }
  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i]
    if (nextProps[key] !== prevProps[key]) {
      return true
    }
  }
  return false
} 