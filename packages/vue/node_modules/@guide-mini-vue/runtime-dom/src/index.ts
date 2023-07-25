import { createRender } from "@guide-mini-vue/runtime-core"

export function createElement(type) {
    return document.createElement(type)
}

export function patchProp(el, key, prevVal, nextVal) {
    const isOn = (key: string) => /^on[A-Z]/.test(key)

    if (isOn(key)) {
        const eventName = key.slice(2).toLocaleLowerCase()

        el.addEventListener(eventName, nextVal)
    } else {
        if (!nextVal) {
            el.removeAttribute(key)
        } else {
            if (Array.isArray(nextVal)) nextVal = nextVal.toString().replaceAll(',', ' ')
            el.setAttribute(key, nextVal)
        }
    }
}

export function insert(children, parentContainer, anchor) {
    parentContainer.insertBefore(children, anchor || null)

}

export function remove(children) {
    const parentNode = children.parentNode
    if (parentNode) {
        parentNode.removeChild(children)
    }
}

export function setTextElement(el, text) {
    el.textContent = text
}

const render = createRender({
    createElement,
    patchProp,
    insert,
    remove,
    setTextElement
})

export function createApp(...args: [any]) {
    return render.createApp(...args)
}

export * from '@guide-mini-vue/runtime-core'