/**
 * 定义飞行的箭的状态
 */
export type ArrowState = {
    // 箭ID
    id: number,
    // 哪个玩家发出的箭
    fromPlayerId: number,
    // 落地时间（游戏时间）
    targetTime: number,
    // 落点坐标位置（游戏位置）
    targetPos: { x: number, y: number }
}