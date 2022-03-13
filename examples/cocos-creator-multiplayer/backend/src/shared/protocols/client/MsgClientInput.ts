import { PlayerAttack, PlayerMove } from "../../game/GameSystem";

/** 发送自己的输入 */
export interface MsgClientInput {
    // 输入序号
    sn: number,
    // 输入内容
    inputs: ClientInput[]
};

// 定义客户端输入类型
export type ClientInput =
        Omit<PlayerMove, 'playerId'>
     |  Omit<PlayerAttack, 'playerId'>;