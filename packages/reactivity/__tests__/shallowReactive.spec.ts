import { isReactive, shallowReactive } from "../src/reactive"

describe('shallowReactive', () => {
    it('should not make non-raective properties reactive', () => {
        const state = shallowReactive({
            foo: 1,
            nested: {
              bar: 2
            }
          })          
          
        expect(isReactive(state)).toBe(true)
        expect(isReactive(state.nested)).toBe(false)
    })
})