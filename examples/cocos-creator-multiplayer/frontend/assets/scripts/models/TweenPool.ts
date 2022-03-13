import { Tween } from "cc";

// 插值池
export class TweenPool {

    private _tweens: Tween<any>[] = [];

    add(tween: Tween<any>) {
        this._tweens.push(tween);
    }

    clear() {
        this._tweens?.forEach(v => v.stop());
        this._tweens = [];
    }

}