import { isReadonly, shallowReadonly } from "../src/reactive"
import { vi } from 'vitest'
describe('shallowReadonly', () => {
    it('should not make non-raective properties reactive', () => {
        console.warn = vi.fn()
        const props = shallowReadonly({
            n: {
                count: 1
            }
        })
        props.n = 's'
        expect(isReadonly(props)).toBe(true)
        expect(isReadonly(props.n)).toBe(false)
        expect(console.warn).toBeCalled()
    })
})