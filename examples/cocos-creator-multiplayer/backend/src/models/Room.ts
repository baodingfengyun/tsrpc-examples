import { WsConnection, WsServer } from "tsrpc";
import { gameConfig } from "../shared/game/gameConfig";
import { GameSystem, GameSystemInput, PlayerJoin } from "../shared/game/GameSystem";
import { ReqJoin } from "../shared/protocols/PtlJoin";
import { ServiceType } from "../shared/protocols/serviceProto";

/**
 * 服务端 - 房间 - 逻辑系统
 */
export class Room {

    // 帧同步频率，次数/秒
    syncRate = gameConfig.syncRate;
    // 玩家 ID 生成器
    nextPlayerId = 1;

    // 游戏状态
    gameSystem = new GameSystem();

    // 基于 WebSocket 的服务器
    server: WsServer<ServiceType>;
    // WebSocket 连接
    conns: WsConnection<ServiceType>[] = [];
    // 待处理的输入
    pendingInputs: GameSystemInput[] = [];
    // 玩家最近一个确认号
    playerLastSn: { [playerId: number]: number | undefined } = {};
    // 最近一次同步时间
    lastSyncTime?: number;

    constructor(server: WsServer<ServiceType>) {
        this.server = server;
        // 设置处理速度
        setInterval(() => { this.sync() }, 1000 / this.syncRate);
    }

    /** 加入房间 */
    join(req: ReqJoin, conn: WsConnection<ServiceType>) {
        let input: PlayerJoin = {
            type: 'PlayerJoin',
            playerId: this.nextPlayerId++,
            // 初始位置随机
            pos: {
                x: Math.random() * 10 - 5,
                y: Math.random() * 10 - 5
            }
        }
        // 加入待处理消息队列
        this.applyInput(input);

        // 将连接加入连接队列
        this.conns.push(conn);

        // 绑定连接与玩家
        conn.playerId = input.playerId;
        
        conn.listenMsg('client/ClientInput', call => {
            this.playerLastSn[input.playerId] = call.msg.sn;
            call.msg.inputs.forEach(v => {
                this.applyInput({
                    ...v,
                    playerId: input.playerId
                });
            })
        });

        return input.playerId;
    }

    applyInput(input: GameSystemInput) {
        this.pendingInputs.push(input);
    }

    /**
     * 服务器 LOCKSTEP 帧同步广播
     */
    sync() {
        // 取出所有待处理的消息
        let inputs = this.pendingInputs;
        this.pendingInputs = [];

        // 修改游戏状态
        // Apply inputs
        inputs.forEach(v => {
            this.gameSystem.applyInput(v)
        });

        // Apply TimePast
        let now = process.uptime() * 1000;
        // 将时间流逝封装成事件
        this.applyInput({
            type: 'TimePast',
            dt: now - (this.lastSyncTime ?? now)
        });
        this.lastSyncTime = now;
        //console.log("server sync time:" + now);

        // 发送同步帧
        this.conns.forEach(v => {
            v.sendMsg('server/Frame', {
                inputs: inputs,
                lastSn: this.playerLastSn[v.playerId!]
            })
        });
    }

    /** 离开房间 */
    leave(playerId: number, conn: WsConnection<ServiceType>) {
        // 删除连接
        this.conns.removeOne(v => v.playerId === playerId);
        
        // 加入消息
        this.applyInput({
            type: 'PlayerLeave',
            playerId: playerId
        });
    }
}

declare module 'tsrpc' {
    export interface WsConnection {
        playerId?: number;
    }
}