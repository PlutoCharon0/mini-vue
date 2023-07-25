import { ReactiveEffect } from "./effect";

class computedRefImpl{
    private _dirty: Boolean = true
    private _value: any;
    private _effect: any; // 存储副作用实例对象
    constructor(getter) {
        this._effect = new ReactiveEffect(getter, () => {
            if (!this._dirty) {
                this._dirty = true
            }
        })
    }
    get value() {
        // 只有当dirty变量为true时，即数据发生改变时才更新值
        if (this._dirty) {
            this._dirty = false
            this._value = this._effect.run()
            return this._value
        }
        return this._value
    }
}

export function computed(getter) {
    return new computedRefImpl(getter)
}