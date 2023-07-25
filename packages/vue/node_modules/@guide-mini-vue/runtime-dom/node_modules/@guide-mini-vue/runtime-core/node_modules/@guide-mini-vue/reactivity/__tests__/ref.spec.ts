import { effect } from "../src/effect"
import { reactive } from "../src/reactive"
import { isRef, ref, unRef, proxyRefs } from "../src/ref"

describe('ref', () => {
    it('happy path', () => {
        const a = ref(10)
        expect(a.value).toBe(10)
    })
    // 当前测试存在问题
    /*   it('should be reactive', () => {
          const a = ref(1);
          let dummy;
          let calls = 0;
          effect(() => {
            calls++;
            dummy = a.value;
          });
          expect(calls).toBe(1);
          expect(dummy).toBe(1);
          a.value = 2;
          expect(calls).toBe(2);
          expect(dummy).toBe(2);
          // same value should not trigger
          a.value = 2;
          expect(calls).toBe(2);
          expect(dummy).toBe(2);
      }) */
    it('should make nested properties reative', () => {
        const a = ref({
            count: 1
        })
        let dummy;
        effect(() => {
            dummy = a.value.count
        })
        expect(dummy).toBe(1)
        a.value.count = 2
        expect(dummy).toBe(2)
    })
    it('isRef', () => {
        const a = ref(1)
        const b = reactive({
            count: 1
        })
        expect(isRef(a)).toBe(true)
        expect(isRef(1)).toBe(false)
        expect(isRef(b)).toBe(false)
    })
    it('unRef', () => {
        const a = ref(1)
        const b = reactive({
            count: 1
        })
        expect(unRef(a)).toBe(1)
        expect(unRef(1)).toBe(1)
        expect(unRef(b)).toBe(b)
    })
    it('proxyRefs', () => {
        const user = {
            name: 'aa',
            age: ref(10)
        }
        const proxyUser = proxyRefs(user)
        expect(user.age.value).toBe(10)
        expect(proxyUser.age).toBe(10)
        expect(proxyUser.name).toBe('aa')

        proxyUser.age = 20
        expect(proxyUser.age).toBe(20)
        expect(user.age.value).toBe(20)

        proxyUser.age = ref(11)
        expect(proxyUser.age).toBe(11)
        expect(user.age.value).toBe(11)
    })
})