import { createRender } from "../../dist/guide-mini-vue.esm.js";
import App from './app.js'
const game = new PIXI.Application({
    width: 500,
    height: 500,
});

document.body.append(game.view);

const render = createRender({
    createElement(type) {
        if (type === "rect") {
            const rect = new PIXI.Graphics();
            rect.beginFill(0xff0000);
            rect.drawRect(0, 0, 100, 100);
            rect.endFill();
            return rect;
        }
    },
    patchProp(el, key, val) {
        el[key] = val
    },
    insert(el, parentContainer) {
        parentContainer.addChild(el)
    }
});

render.createApp(App).mount(game.stage)