import { effect } from '../src/effect'
import { reactive, isReactive, isProxy } from '../src/reactive'

describe('reactive', () => {
    it('happy path', () => {
        const original = { count: 1 }
        debugger
        const observed = reactive(original)
        expect(observed).not.toBe(original)
        expect(observed.count).toBe(1)
        expect(isReactive(observed)).toBe(true)
        expect(isReactive(original)).toBe(false)
        expect(isProxy(observed)).toBe(true)
    })
    it('nested reactive', () => {
        const original = {
            nested: {
                count: 1
            },
            arr: [{ bar: 2 }]
        }
        const observed = reactive(original)
        expect(isReactive(observed.nested)).toBe(true)
        expect(isReactive(observed.arr)).toBe(true)
        expect(isReactive(observed.arr[0])).toBe(true)
    })
    it('Object', () => {
        const original = { foo: 1 }
        const observed = reactive(original)
        expect(observed).not.toBe(original)
        expect(isReactive(observed)).toBe(true)
        expect(isReactive(original)).toBe(false)
        // get
        expect(observed.foo).toBe(1)
        // has
        expect('foo' in observed).toBe(true)
        // ownKeys
        expect(Object.keys(observed)).toEqual(['foo'])
    })
    it('in operator', () => {
        // 当用户在函数中对代理对象使用了 in 操作符判断 同样的需要将该函数作为依赖收集
        // 处理方式复写hasOwnProperty
        const original = { foo: 1 }
        const observed = reactive(original)
        let count = 0
        debugger
        effect(() => {
            if ('foo' in observed) {
                count++
            }
        })
        observed.foo = 2
        expect(count).toEqual(2)
    })
    it(' for-in operator && handleDelete', () => {
        const original = {
            count: 1,
            foo: 'aa'
        }
        const observed = reactive(original)
        let res;
        const effectFn = effect(() => {
            res = ``
            for (let k in observed) {
                res+= `key: ${k};`
            }
            return res
        })
        expect(effectFn()).toBe(`key: count;key: foo;`)
        debugger
        delete observed.foo
        expect(res).toBe(`key: count;`)
        observed.foo = 'aa'
        expect(effectFn()).toBe(`key: count;key: foo;`)
    })
})