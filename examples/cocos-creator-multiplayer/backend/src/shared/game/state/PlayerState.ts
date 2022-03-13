// 定义玩家状态
export interface PlayerState {
    // 玩家ID
    id: number,
    // 位置
    pos: { x: number, y: number },
    // 晕眩结束时间
    dizzyEndTime?: number,
}