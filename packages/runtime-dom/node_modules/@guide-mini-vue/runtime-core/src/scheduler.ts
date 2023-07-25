// 使用promise.resolva() 来创建一个promis实例 利用该实例将一个任务添加到微任务队列中
const p = Promise.resolve()

export function nextTick(fn?) {
  
  return fn ? p.then(fn) : p
}
// 存储视图更新任务
const queue: any[] = []
// 存储watchEffect回调
const activePreFlushCbs:any[] = []
// 一个标志代表是否正在刷新队列
let isFlushPending = false

export function queueJobs(job) {
  
  // 判断视图更新任务是否存在于队列中
  if (!(queue.includes(job))) {
    queue.push(job)
  }
  // 刷新队列
  queueFlush()
}
function queueFlush() {
  // 如果队列正在刷新 则不做任何处理
  if (isFlushPending) return;
  //  反之 修改状态 表示正在 刷新队列
  isFlushPending = true
  // 执行队列中的任务
  nextTick(flushJobs)
}

// 添加侦听器回调到队列中
export function queuePreFlushCb(job) {
  activePreFlushCbs.push(job)

  queueFlush()
}

function flushJobs() {
  // 执行watchEffect的回调 侦听器的回调都是在视图更新前执行
  flushPreFlushCbs()
  let job;
  // 执行任务
  while (job = queue.shift()) {
    job && job()
  }
  // 视图更新任务执行完毕 重置刷新状态
  isFlushPending = false
}
// 遍历队列 执行watchEffect的回调
function flushPreFlushCbs() {
  for(let i = 0; i < activePreFlushCbs.length; i++) {
    activePreFlushCbs[i]()
  }
}