declare namespace Express {
    export interface Request {
        /** 只在特定的局部路由有用到。用于让中间件完成用户身份验证。 */
        payload?: {
            userId: number;
        }
    }
}