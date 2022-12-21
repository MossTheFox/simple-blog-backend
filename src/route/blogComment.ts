import { raw, Router } from "express";
import { ArrayContains, Like } from 'typeorm';
import { AppDataSource } from "../data-source";
import { ADMIN_FLAG, BlogUser } from "../entity/BlogUser";
import { decodeUserToken } from "../utils/jwtTools";
import { BlogPost } from "../entity/BlogPost";
import { BlogComment } from "../entity/BlogComment";

const router = Router();

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

router.get('/id/:id', async (req, res, next) => {
    try {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (isNaN(+req.params.id)) {
            res.status(400).send({
                code: 'not ok',
                message: '无效的 ID'
            })
            return;
        }

        let data = await AppDataSource.manager.findOneBy(BlogComment, {
            id: +req.params.id
        });
        if (!data) {
            res.send({
                code: 'not ok',
                message: '评论不存在'
            })
            return;
        }

        res.send({
            code: 'ok',
            data: data
        });
    } catch (err) {
        console.log(err);
        res.send({
            code: 'not ok',
            message: '服务端出错。'
        });
    }
});

router.get('/search', async (req, res) => {
    try {
        let user = req.payload?.userId ? await AppDataSource.manager.findOneBy(BlogUser, {
            id: req.payload.userId
        }) : null;
        const searchQuery = {
            forBlogId: +(req.query.blog_id ?? 0),
            byUserId: +(req.query.user_id ?? 0),
            byUsername: (req.query.username || '') + '',
            page: +(req.query.page ?? 0),
            perPage: +(req.query.page_size ?? 0),
            adminAction: !!(user && user.flags?.includes(ADMIN_FLAG)) && !!req.query.admin
        };
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        if (!searchQuery.page || !searchQuery.perPage) {
            res.status(400).send({
                code: 'Bad Request',
                message: 'No.'
            })
            return;
        }

        const userId = searchQuery.byUserId || (searchQuery.byUsername ?
            ((await AppDataSource.manager.findOneBy(BlogUser, { username: searchQuery.byUsername }))?.id || -1)
            :
            -1);

        const begin = searchQuery.perPage * (searchQuery.page - 1);
        const take = searchQuery.perPage;

        let [pageData, total] = await AppDataSource.manager.findAndCount(BlogComment, {
            where: {
                ...userId > 0 ? { userId } : {},
                ...searchQuery.forBlogId ? { blogId: searchQuery.forBlogId } : {},

                // 管理员
                ...searchQuery.adminAction ? { validated: false } : { validated: true }
            },
            skip: begin,
            take,
            order: {
                id: 'DESC'
            }
        });

        for await (const v of pageData) {
            v.userProfile = await AppDataSource.manager.findOneBy(BlogUser, {
                id: v.userId
            });
            if (v.replyTo) {
                v.replyTarget = await AppDataSource.manager.findOneBy(BlogComment, { id: v.replyTo });
                if (v.replyTarget) {
                    v.replyTarget.userProfile = await AppDataSource.manager.findOneBy(BlogUser, {
                        id: v.replyTarget.userId
                    });
                }
            }
        }

        res.send({
            code: 'ok',
            data: {
                commentList: pageData,
                total: total
            }
        });
    } catch (err) {
        console.log(err);
        res.send({
            code: 'not ok',
            message: '服务端出错。'
        });
    }
});

/** 发布评论 */
type BlogCommentRequestBody = {
    content: string;
    toBlogId: number;
    replyToCommentId?: number;
};

router.post('/', async (req, res) => {
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

        // 验证 Body
        if (!req.body || isNaN(req.body.toBlogId) || !req.body.content) {
            res.status(400).send({
                code: 'Bad Request',
                message: 'No'
            });
            return;
        }

        let body = req.body as BlogCommentRequestBody;
        let blogTarget = await AppDataSource.manager.findOneBy(BlogPost, { id: +body.toBlogId })
        if (!blogTarget) {
            res.send({
                code: 'not ok',
                message: '目标文章不存在或已删除'
            })
            return;
        }
        const newComment = new BlogComment();
        newComment.userId = user.id;
        newComment.blogId = blogTarget.id;
        body.replyToCommentId && (newComment.replyTo = body.replyToCommentId);
        (typeof body.content === 'string') && (newComment.content = body.content);

        let saved = await AppDataSource.manager.save(newComment);

        res.send({
            code: 'ok',
            message: '发布成功',
            data: saved
        });

    } catch (err) {
        console.log(err);
        res.send({
            code: 'not ok',
            message: '服务器内部错误。'
        });
    }
});

router.delete('/', async (req, res) => {
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

        // 验证 Body
        if (!req.body || isNaN(req.body.id)) {
            res.status(400).send({
                code: 'Bad Request',
                message: 'No'
            });
            return;
        }

        let body = req.body as { id: number };
        let commentTarget = await AppDataSource.manager.findOneBy(BlogComment, { id: +body.id })

        if (!commentTarget) {
            res.send({
                code: 'not ok',
                message: '目标评论不存在。'
            });
            return;
        }

        // 权限控制
        if (
            !(
                (user.flags?.includes(ADMIN_FLAG))
                || (user.id === commentTarget?.userId)
            )
        ) {
            res.send({
                code: 'not ok',
                message: '您没有权限这么做'
            });
            return;
        }

        await AppDataSource.manager.softDelete(BlogComment, {
            id: commentTarget.id
        });

        res.send({
            code: 'ok',
            message: '已删除',
        });

    } catch (err) {
        console.log(err);
        res.send({
            code: 'not ok',
            message: '服务器内部错误。'
        });
    }
});

// 管理员操作
router.put('/validate', async (req, res) => {
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

        // 验证 Body
        if (!req.body || isNaN(req.body.id) || (typeof req.body.undo === 'undefined')) {
            res.status(400).send({
                code: 'Bad Request',
                message: 'No'
            });
            return;
        }

        let body = req.body as { id: number, undo: boolean };
        let commentTarget = await AppDataSource.manager.findOneBy(BlogComment, { id: +body.id })

        if (!commentTarget) {
            res.send({
                code: 'not ok',
                message: '目标评论不存在。'
            });
            return;
        }

        // 权限控制
        if (
            !(user.flags?.includes(ADMIN_FLAG))
        ) {
            res.send({
                code: 'not ok',
                message: '您没有权限这么做'
            });
            return;
        }

        commentTarget.validated = body.undo ? false : true;
        await AppDataSource.manager.save(commentTarget);

        res.send({
            code: 'ok',
            message: '操作成功',
        });

    } catch (err) {
        console.log(err);
        res.send({
            code: 'not ok',
            message: '服务器内部错误。'
        });
    }
});


export {
    router as blogCommentRouter
};