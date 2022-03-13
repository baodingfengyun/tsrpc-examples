import { gameConfig } from "./gameConfig";
import { ArrowState } from "./state/ArrowState";
import { PlayerState } from "./state/PlayerState";

// 游戏状态定义
export interface GameSystemState {
    // 当前的时间（游戏时间）
    now: number,
    // 玩家
    players: PlayerState[],
    // 飞行中的箭矢
    arrows: ArrowState[],
    // 箭矢的 ID 生成
    nextArrowId: number
}

/**
 * 前后端复用的状态计算模块
 */
export class GameSystem {

    // 当前状态(初始化)
    private _state: GameSystemState = {
        now: 0,
        players: [],
        arrows: [],
        nextArrowId: 1
    }
    // 获取当前状态(只读)
    get state(): Readonly<GameSystemState> {
        return this._state
    }

    // 重设状态
    reset(state: GameSystemState) {
        this._state = Object.merge({}, state);
    }

    // 主要是明白, 计算状态变更的操作, 由谁来调用.
    // 应用输入，计算状态变更
    applyInput(input: GameSystemInput) {
        if (input.type === 'PlayerMove') {
            // 找出输入命令 与 哪个玩家匹配(ID 相等)
            let player = this._state.players.find(v => v.id === input.playerId);
            if (!player) {
                return;
            }

            // 注意理解同步策略: 预测, 和解, 插值
            // 需要注意的是这段逻辑是客户端与服务器共享的(以当前状态为基准,操作可能是预测得来的)
            // 如果玩家当前处于不可移动的眩晕状态,就放弃移动
            if (player.dizzyEndTime && player.dizzyEndTime > this._state.now) {
                return;
            }

            // 仅修改状态(不用关心渲染层的表现)
            player.pos.x += input.speed.x * input.dt;
            player.pos.y += input.speed.y * input.dt;
        }
        else if (input.type === 'PlayerAttack') {
            // 找出输入命令 与 哪个玩家匹配(ID 相等)
            let player = this._state.players.find(v => v.id === input.playerId);
            if (!player) {
                return;
            }

            // 生成一个箭
            let newArrow: ArrowState = {
                // 箭ID自增
                id: this._state.nextArrowId++,
                // 箭的发射者就是当前攻击者
                fromPlayerId: input.playerId,
                // 箭的目标
                targetPos: { ...input.targetPos },
                // 落点时间
                targetTime: input.targetTime
            };

            // 加入箭组
            this._state.arrows.push(newArrow);
            // 事件:发射箭矢
            this.onNewArrow.forEach(v => v(newArrow));
        }
        else if (input.type === 'PlayerJoin') {
            // 玩家加入处理
            this.state.players.push({
                id: input.playerId,
                pos: { ...input.pos }
            })
        }
        else if (input.type === 'PlayerLeave') {
            // 玩家移除处理
            this.state.players.remove(v => v.id === input.playerId);
        }
        else if (input.type === 'TimePast') {
            // 时间处理
            this._state.now += input.dt;

            // 落地的 Arrow
            for (let i = this._state.arrows.length - 1; i >= 0; --i) {
                // 遍历箭
                let arrow = this._state.arrows[i];
                if (arrow.targetTime <= this._state.now) {
                    // 伤害判定,选择伤害范围内的玩家
                    let damagedPlayers = this._state.players.filter(v => {
                        // 距离: 当前玩家与箭攻击点的距离, 伤害不是点,而是半径.
                        let distance = (v.pos.x - arrow.targetPos.x) * (v.pos.x - arrow.targetPos.x) + (v.pos.y - arrow.targetPos.y) * (v.pos.y - arrow.targetPos.y);
                        return distance <= gameConfig.arrowAttackRadius * gameConfig.arrowAttackRadius
                    });
                    // 针对伤害半径内的所有玩家,修改状态
                    damagedPlayers.forEach(p => {
                        // 设置击晕状态(截止时间)
                        p.dizzyEndTime = this._state.now + gameConfig.arrowDizzyTime;

                        //TODO
                        // Event
                    })

                    // 将这只箭从箭组中移除
                    this._state.arrows.splice(i, 1);
                }
            }
        }
    }

    /*
     * 事件
     * 某些转瞬即逝的事件，可能不会直观的体现在前后两帧状态的变化中，但表面层又需要知晓。
     * 例如一颗狙击枪的子弹，在少于一帧的时间内创建和销毁，前后两帧的状态中都不包含这颗子弹；但表现层却需要绘制出子弹的弹道。
     * 此时，可以通过事件的方式通知表现层。
     */
    // 发射箭矢
    onNewArrow: ((arrow: ArrowState) => void)[] = [];

}

// 定义操作:玩家移动
export interface PlayerMove {
    type: 'PlayerMove',
    playerId: number,
    // 移动速度(x/s, y/s)
    speed: { x: number, y: number },
    // 移动的时间 (秒)
    dt: number,
}

// 定义操作:玩家攻击
export interface PlayerAttack {
    type: 'PlayerAttack',
    playerId: number,
    // 落点坐标
    targetPos: { x: number, y: number },
    // 落点时间（游戏时间）
    targetTime: number
}

// 定义操作:玩家加入
export interface PlayerJoin {
    type: 'PlayerJoin',
    playerId: number,
    pos: { x: number, y: number }
}

// 定义操作:玩家离开
export interface PlayerLeave {
    type: 'PlayerLeave',
    playerId: number
}

// 定义:时间流逝
export interface TimePast {
    type: 'TimePast',
    dt: number
}

// 输入定义[各种可能都包含]
export type GameSystemInput = PlayerMove
    | PlayerAttack
    | PlayerJoin
    | PlayerLeave
    | TimePast;
