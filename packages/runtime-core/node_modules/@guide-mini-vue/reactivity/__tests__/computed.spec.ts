import { computed } from "../src/computed"
import { reactive } from "../src/reactive"
import { vi } from 'vitest'

describe('computed', () => {
    it('happy path', () => {
        const user = reactive({
            age: 18
        })
        const age = computed(() => {
            return user.age
        })
        expect(age.value).toBe(18)
    })
    it('should compute lazily', () => {
        const value = reactive({
            foo: 1
        })
        const getter = vi.fn(() => {
            return value.foo
        })
        const cValue = computed(getter)

        expect(getter).toHaveBeenCalledTimes(0)

        expect(cValue.value).toBe(1)

        expect(getter).toHaveBeenCalledTimes(1)

        cValue.value
        expect(getter).toHaveBeenCalledTimes(1)

        value.foo = 2
        expect(getter).toHaveBeenCalledTimes(1)

        expect(cValue.value).toBe(2)
        expect(getter).toHaveBeenCalledTimes(2)
    })
})