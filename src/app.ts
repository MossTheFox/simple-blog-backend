import "reflect-metadata";

import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import { SERVER_PORT } from "./constraint";
import { AppDataSource } from "./data-source";
import { userRoute } from "./route/user";
import { blogRoute } from "./route/blog";
import { blogCommentRouter } from "./route/blogComment";
import path from "path";

const app = express();

// express 全局中间件。特殊的接口 (例如，文件上传) 在对应位置加。
app.use(express.json({
    limit: "20mb"       // 可能要注意
}));

app.use(cookieParser());

// 跨域配置
app.use((req, res, next) => {
    ///////////////////////////////////
    // ★ 如果有需要，请额外添加:      //
    // Access-Control-Allow-Origin   //
    ///////////////////////////////////
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader('Access-Control-Allow-Credentials', "true");    // Allow cross-site cookie
    res.removeHeader("X-Powered-By");
    next();
});
//////////// ROUTES ///////////////////////////////////

app.use(express.static('public'));

app.use('/user', userRoute);
app.use('/blog', blogRoute);
app.use('/comment', blogCommentRouter);

///////////////////////////////////////////////////////
// ⚠ React Router 行为。请留意
app.get('*', (req, res) => res.sendFile(path.resolve('public', 'index.html')));

// 404 Handler
app.use(function (req, res, next) {
    res.setHeader("content-type", "application/json; charset=utf-8")
    res.status(404).send({
        code: 404,
        message: "无效请求..."
    });
});

// 500 Handler, 避免把错误发去前端
app.use((err: Error, req: Request, res: Response, next: () => any) => {
    console.log(err);
    res.status(500).send({
        code: 500,
        message: "Internal Server Error."
    });
});



AppDataSource.initialize().then(() => {
    // DB init ok.
    app.listen(SERVER_PORT, () => {
        console.log(`Server started on port ${SERVER_PORT}.`);
    });
}).catch((err) => {
    console.log(err);
});
