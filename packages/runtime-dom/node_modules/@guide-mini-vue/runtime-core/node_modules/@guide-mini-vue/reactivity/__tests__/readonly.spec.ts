import { readonly, isReadonly, isProxy } from "../src/reactive";
import { vi } from 'vitest'

describe('readonly', () => {
    it('happy path', () => {
        const original = { count: 1, bar:{ foo: 2 } }
        const wrapped = readonly(original)
        expect(wrapped).not.toBe(original)
        expect(wrapped.count).toBe(1)
        expect(isReadonly(original)).toBe(false)
        expect(isReadonly(wrapped)).toBe(true)
        expect(isProxy(wrapped)).toBe(true)
    })
    it('warn then call set', () => {
        console.warn = vi.fn()
        const user = readonly({
            name: 'sss'
        })
        user.name = 'aaa'
        expect(console.warn).toBeCalled()
    })
    it('nested reactive', () => {
        const original = {
            nested: {
                count: 1
            },
            arr: [{ bar: 2 }]
        }
        const observed = readonly(original)
        expect(isReadonly(observed.nested)).toBe(true)
        expect(isReadonly(observed.arr)).toBe(true)
        expect(isReadonly(observed.arr[0])).toBe(true)
    })
})