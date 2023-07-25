import { reactive } from "@guide-mini-vue/reactivity"
import { nextTick } from "../src/scheduler";
import { watchEffect } from "../src/apiWatch";

describe("api: watch", () => {
  it("effect", async () => {
    const state = reactive({
      count: 0
    })
    let dummy;
    watchEffect(() => {
      dummy = state.count
    })
    expect(dummy).toBe(0)

    state.count++
    // 在侦听器回调中获取的是视图更新前的数据 调用nextTick() 以获取获取最新状态视图
    await nextTick()
    expect(dummy).toBe(1)
  })
  it("stopping the watcheEffect",async () => {
    const state = reactive({
      count: 0
    })
    let dummy;
    const stop: any = watchEffect(() => {
      dummy = state.count
    })
    expect(dummy).toBe(0)
    stop()
    state.count++
    await nextTick()

    expect(dummy).toBe(0)
  })
  it("cleanup registration effect", async () => {
    const state = reactive({
      count: 0
    })
    const cleanup = vi.fn()
    let dummy;
    const stop: any = watchEffect((onCleanup) => {
      onCleanup(cleanup)
      dummy = state.count
    })
    expect(dummy).toBe(0)
    state.count++
    
    await nextTick()
    expect(cleanup).toHaveBeenCalledTimes(1)

    stop()
    expect(cleanup).toHaveBeenCalledTimes(2)
  })
})