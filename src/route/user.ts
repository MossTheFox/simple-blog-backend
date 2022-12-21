import { raw, Router } from "express";
import { INVITE_CODE } from "../constraint";
import { AppDataSource } from "../data-source";
import { BlogUser } from "../entity/BlogUser";
import { decodeUserToken, signUserToken } from "../utils/jwtTools";
import mime from "mime-types";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const router = Router();

router.use(raw({
    limit: '20mb',
    type: 'image/*'
}));

router.use(async (req, res, next) => {
    try {
        if (req.cookies.user) {
            let decoded = decodeUserToken('' + req.cookies.user);
            if (decoded) {
                req.payload = {
                    userId: decoded
                };
            }
        }
    } catch (err) {
        console.log(err);
    }
    next();
});

router.get('/', async (req, res, next) => {
    try {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (req.payload?.userId) {
            let user = await AppDataSource.manager.findOneBy(BlogUser, {
                id: req.payload.userId
            });
            if (user) {
                res.send({
                    code: 'ok',
                    data: {
                        id: user.id,
                        flags: user.flags,
                        username: user.username,
                        avatar: user.avatar,
                        signature: user.signature
                    }
                });
                return;
            }
        }
        res.send({
            code: 'ok',
            message: '未登录'
        });
        return;
    } catch (err) {
        console.log(err);
        res.send({
            code: 'not ok',
            message: '服务端验证登录状态出错。'
        });
    }
});

router.get('/profile/:username', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        let user = await AppDataSource.manager.findOneBy(BlogUser, {
            username: req.params.username
        });
        if (user) {
            res.send({
                code: 'ok',
                data: {
                    id: user.id,
                    flags: user.flags,
                    username: user.username,
                    avatar: user.avatar,
                    signature: user.signature
                }
            });
            return;
        }

        res.send({
            code: 'not ok',
            message: '用户不存在。'
        });
        return;
    } catch (err) {
        console.log(err);
        res.send({
            code: 'not ok',
            message: '服务端获取用户信息出错。'
        });
    }
});

router.post('/register', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        let data = req.body;
        if (!data.username || !data.password) {
            res.status(400).send({
                code: 'Bad Request',
                message: 'No.'
            });
            return;
        };
        if (INVITE_CODE && req.body.code !== INVITE_CODE) {
            res.send({
                code: 'not ok',
                message: '邀请码无效'
            });
            return;
        }
        let newUser = new BlogUser();
        newUser.username = data.username + '';
        newUser.password = data.password + '';
        await AppDataSource.manager.save(newUser);
        let signedToken = signUserToken({ id: newUser.id });
        res.cookie('user', signedToken, {
            sameSite: 'lax',
            httpOnly: true,
            secure: true,
            maxAge: 1000 * 60 * 60 * 24 * 15
        });
        res.send({
            code: 'ok',
            message: '注册成功',
            data: {
                id: newUser.id,
                flags: newUser.flags,
                username: newUser.username,
                avatar: newUser.avatar,
                signature: newUser.signature
            }
        });
    } catch (err) {
        console.log(err);
        res.send({
            code: 'not ok',
            message: '服务器内部错误。'
        });
    }
});

router.post('/login', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        let data = req.body;
        if (!data.username || !data.password) {
            res.status(400).send({
                code: 'Bad Request',
                message: 'No.'
            });
            return;
        };
        let user = await AppDataSource.manager.findOneBy(BlogUser, {
            username: data.username + '',
            password: data.password + '',
        });
        if (!user) {
            res.send({
                code: 'not ok',
                message: '登录信息有误。'
            });
            return;
        }
        let signedToken = signUserToken({ id: user.id });
        res.cookie('user', signedToken, {
            sameSite: 'lax',
            httpOnly: true,
            secure: true,
            maxAge: 1000 * 60 * 60 * 24 * 15
        });
        res.send({
            code: 'ok',
            message: '登录完成',
            data: {
                id: user.id,
                flags: user.flags,
                username: user.username,
                avatar: user.avatar,
                signature: user.signature
            }
        });
    } catch (err) {
        console.log(err);
        res.send({
            code: 'not ok',
            message: '服务器内部错误。'
        });
    }
});

router.put('/', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!req.payload?.userId) {
            res.send({
                code: 'not ok',
                message: '未登录'
            });
            return;
        }
        let user = await AppDataSource.manager.findOneBy(BlogUser, {
            id: req.payload.userId
        });
        if (!user) {
            res.send({
                code: 'not ok',
                message: '未登录'
            });
            return;
        }
        if (!req.body
            || (!req.body.username && !req.body.password && !req.body.signature)
        ) {
            res.status(400).send({
                code: 'Bad Request',
                message: "No."
            });
            return;
        }
        req.body.username && (user.username = req.body.username + '');
        req.body.password && (user.password = req.body.password + '');
        req.body.signature && (user.signature = req.body.signature + '');
        await AppDataSource.manager.save(user);

        res.send({
            code: 'ok',
            data: {
                id: user.id,
                flags: user.flags,
                username: user.username,
                avatar: user.avatar,
                signature: user.signature
            }
        });

        return;
    } catch (err) {
        console.log(err);
        res.send({
            code: 'not ok',
            message: '服务端验证登录状态出错。'
        });
    }
});

router.put('/avatar', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!req.payload?.userId) {
            res.send({
                code: 'not ok',
                message: '未登录'
            });
            return;
        }
        let user = await AppDataSource.manager.findOneBy(BlogUser, {
            id: req.payload.userId
        });
        if (!user) {
            res.send({
                code: 'not ok',
                message: '未登录'
            });
            return;
        }
        let data = req.body;
        if (!(data instanceof Buffer)) {
            res.status(400).send({
                code: 'not ok',
                message: 'Bad Request'
            });
            return;
        }
        let type = mime.extension(req.headers["content-type"] + '') || 'NO';
        if (!['png', 'jpg', 'jpeg', 'gif', 'bmp', 'jiff', 'svg'].includes(type)) {
            res.status(400).send({
                code: 'not ok',
                message: '不支持的文件格式。'
            });
            return;
        }
        const newUUID = randomUUID();
        const fileName = `${newUUID}.${type}`;
        await writeFile(path.join('public', 'user-content', fileName), data);
        user.avatar = 'user-content/' + fileName;
        await AppDataSource.manager.save(user);
        res.send({
            code: 'ok',
            message: '头像更新成功',
            data: 'user-content/' + fileName
        });
    } catch (err) {
        console.log(err);
        res.send({
            code: 'not ok',
            message: '更新出错'
        })
    }
});

router.post('/signoff', (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.cookie('user', '', {
        maxAge: 0
    });
    res.send({
        code: 'ok',
        message: '注销完成'
    })
})

export {
    router as userRoute
};