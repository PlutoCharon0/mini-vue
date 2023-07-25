
import { ReactiveEffect } from "../../reactivity/src/effect";
import { queuePreFlushCb } from "./scheduler";

export function watchEffect(source) {
  function job () {
    effect.run()
  }
  let cleanup; // 存储清理回调
  // 注册清理回调
  const onCleanup = function (fn){
    cleanup = effect.onStop = () => {
      fn()
    }
  }
  function getter() {
    if (cleanup) {
      // 如果存在清理回调 在该副作用下一次执行前被调用 用于清理无效的副作用
      cleanup()
    }
    source(onCleanup)
  }
  // 根据侦听器的回调 创建依赖函数
  const effect = new ReactiveEffect(getter, () => {
    queuePreFlushCb(job)
  })
  // 收集依赖
  effect.run()

  return () => {
    effect.stop()
  }
}