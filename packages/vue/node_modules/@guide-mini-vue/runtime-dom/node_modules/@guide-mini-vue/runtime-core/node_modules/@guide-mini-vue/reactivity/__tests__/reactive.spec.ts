import { reactive, isReactive, isProxy } from '../src/reactive'

describe('reactive', () => {
    it('happy path', () => {
        const original = { count: 1 }
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
})