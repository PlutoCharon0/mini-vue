import { reactive } from "../src/reactive";
import { effect, stop } from "../src/effect";
import { vi } from "vitest";
describe('effect', () => {
    it('happy path', () => {
        const observed = reactive({ count: 1 })
        let step;
        effect(() => {
            step = observed.count + 10
        })
        observed.count++
        expect(step).toBe(12)
    })
    it('effect return', () => {
        const obj = reactive({ count: 1 })
        let step;
        const fn = effect(() => {
            step = obj.count + 5
            return step
        })
        const res = fn()
        expect(res).toBe(6)
    })
    it('scheduler', () => {
        let dummy
        let run: any;
        const scheduler = vi.fn(() => {
            run = runner;
        })
        const obj = reactive({ count: 1 })
        const runner = effect(() => {
            dummy = obj.count
        }, { scheduler })
        expect(scheduler).not.toHaveBeenCalled()
        expect(dummy).toBe(1)
        obj.count++;
        expect(scheduler).toHaveBeenCalledTimes(1)
        expect(dummy).toBe(1)
        run()
        expect(dummy).toBe(2)
    })
    it('stop', () => {
        let dummy;
        const obj = reactive({ count: 1 })
        const runner = effect(() => {
            dummy = obj.count
        })
        obj.count = 2
        expect(dummy).toBe(2)
        stop(runner)
        obj.count++
        expect(dummy).toBe(2)
        runner()
        expect(dummy).toBe(3)
    })
    it('onStop', () => {
        const obj = reactive({ count: 1 })
        const onStop = vi.fn()
        let dummy;
        const runner = effect(() => {
            dummy = obj.count
        }, {
            onStop
        })
        stop(runner)
        expect(onStop).toBeCalledTimes(1)
    })
    it('栈溢出', () => {
        try {
            const obj = reactive({ count: 1 })
            const runner = effect(() => {
                obj.count++
            })
            runner()
        } catch (error) {
            expect(error).toThrowError()
        }
    })
    it('副作用函数遗留问题', () => {
        const obj = reactive({
            count: 0,
            text: "text",
            ok: true
        })
        let dummy;
        let step;
        let count = 0
        effect(() => {
            count++ // 记录依赖函数的执行次数
            dummy = obj.ok ? obj.text : "not"
        })
        effect(() => {
            step = obj.text
        })
        obj.ok = false

        obj.text = 'notText'

        expect(dummy).toBe("not")
        expect(step).toBe('notText')
        // obj.ok的依赖函数只能执行2次
        expect(count).toBe(2)
    })
    it('副作用函数嵌套', () => {
        const obj = reactive({
            count: 0,
            text: "text",
            ok: true
        })
        let a = 0;
        let b = 0;
        effect(() => {

            a++; // 记录外层依赖函数执行次数
            effect(() => {
                const c = obj.text + "--Text";
               b++; // 记录内层依赖函数执行次数
            });
            const dummy = obj.count + 10;
        });

        obj.count = 11

        expect(a).toEqual(2)
    })
})