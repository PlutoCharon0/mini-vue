export const extend = Object.assign;

export const EMPTY_OBJ = {}

export * from './toDisplayString'

export const isObject = (value) => {
    return value != null && typeof value === 'object'
}

export const isString = (value) => typeof value === 'string'

export const hasChanged = (newVal, oldVal) => {
    return !Object.is(newVal, oldVal)
}

export const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key)

/**
 * 处理驼峰命名法的事件名称 
 * @param { String } str 
*/
export const camelize = (str: string) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : "" // 
    })
}
/**
 * 处理emit的事件名称格式
 * @param { String } str 
*/
export const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
}
// 格式化自定义事件名称
export const toHandelrKey = (str: string) => {
    return str ? `on${capitalize(str)}` : ""
}

export * from './shapeFlags'