import { raw, Router } from "express";
import { ArrayContains, Like } from 'typeorm';
import { AppDataSource } from "../data-source";
import { ADMIN_FLAG, BlogUser } from "../entity/BlogUser";
import { decodeUserToken, signUserToken } from "../utils/jwtTools";
import mime from "mime-types";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { BlogPost } from "../entity/BlogPost";
import { getBlogRecordList, refreshTagAndCatList } from "../utils/siteConfigUtils";

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

router.get('/records/:query', async (req, res, next) => {
    try {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        let dataList: { name: string; postCount: number; }[] = [];
        switch (req.params.query) {
            case 'tags':
                dataList = await getBlogRecordList('tag');
                break;
            case 'categories':
                dataList = await getBlogRecordList('cat');
                break;
            default:
                res.status(400).send({
                    code: 'not ok',
                    message: 'No'
                })
                return;
        }
        res.send({
            code: 'ok',
            data: dataList
        })
    } catch (err) {
        console.log(err);
        res.send({
            code: 'not ok',
            message: '服务端错误。'
        });
    }
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

        let data = await AppDataSource.manager.findOneBy(BlogPost, {
            id: +req.params.id
        });
        if (!data) {
            res.send({
                code: 'not ok',
                message: '文章不存在'
            })
            return;
        }
        data.authorProfile = await AppDataSource.manager.findOneBy(BlogUser, {
            id: data.authorId
        });

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
        const searchQuery = {
            byAuthorName: (req.query.author || '') + '',
            byContent: (req.query.search || '') + '',
            byTag: (req.query.tag || '') + '',
            byCategory: (req.query.category || '') + '',
            page: +(req.query.page ?? 0),
            perPage: +(req.query.page_size ?? 0),
            noContent: req.query.no_content ? true : false
        };
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        if (!searchQuery.page || !searchQuery.perPage) {
            res.status(400).send({
                code: 'Bad Request',
                message: 'No.'
            })
            return;
        }

        const authorId = searchQuery.byAuthorName ?
            ((await AppDataSource.manager.findOneBy(BlogUser, { username: searchQuery.byAuthorName }))?.id || -1)
            :
            -1;

        const begin = searchQuery.perPage * (searchQuery.page - 1);
        const take = searchQuery.perPage;

        let [pageData, total] = await AppDataSource.manager.findAndCount(BlogPost, {
            where: {
                ...authorId > 0 ? { authorId } : {},
                ...searchQuery.byCategory ? { category: searchQuery.byCategory } : {},
                ...searchQuery.byTag ? { tags: Like(searchQuery.byTag) } : {},
                ...searchQuery.byContent ? { content: Like(`%${searchQuery.byContent}%`) } : {}
            },
            skip: begin,
            take,
            order: {
                id: 'DESC'
            }
        });

        for await (const v of pageData) {
            if (searchQuery.noContent) {
                v.content = ''
            }
            v.authorProfile = await AppDataSource.manager.findOneBy(BlogUser, {
                id: v.authorId
            });
        }

        await refreshTagAndCatList();

        res.send({
            code: 'ok',
            data: {
                blogList: pageData,
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

/** 发布新文章 */
type BlogPostEditorData = {
    summary: string;
    category: string;
    tags: string[];
    title: string;
    content: string;
    allowComment: boolean;
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
        if (!req.body) {
            res.status(400).send({
                code: 'Bad Request',
                message: 'No'
            });
            return;
        }
        const newPost = new BlogPost();
        let body = req.body as Partial<BlogPostEditorData>;
        newPost.authorId = user.id;
        (typeof body.title === 'string') && (newPost.title = body.title);
        (typeof body.summary === 'string') && (newPost.summary = body.summary);
        (typeof body.allowComment === 'boolean') && (newPost.allowComment = !!body.allowComment);
        (Array.isArray(body.tags)) && (newPost.tags = body.tags);
        (typeof body.category === 'string') && (newPost.category = body.category);
        (typeof body.content === 'string') && (newPost.content = body.content);

        let saved = await AppDataSource.manager.save(newPost);

        await refreshTagAndCatList();

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

/** 编辑文章 */
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

        // 验证 Body
        if (!req.body || (
            !req.body.id || isNaN(+req.body.id)
        )) {
            res.status(400).send({
                code: 'Bad Request',
                message: 'No'
            });
            return;
        }
        const blog = await AppDataSource.manager.findOneBy(BlogPost, { id: +req.body.id });
        if (!blog) {
            res.send({
                code: 'not ok',
                message: '修改的博客不存在'
            });
            return;
        }

        // 权限控制
        if (
            !(
                (user.flags?.includes(ADMIN_FLAG))
                || (user.id === blog.authorId)
            )
        ) {
            res.send({
                code: 'not ok',
                message: '您没有权限这么做'
            });
            return;
        }

        let body = req.body as Partial<BlogPostEditorData> & { id: number; };
        (typeof body.title === 'string') && (blog.title = body.title);
        (typeof body.summary === 'string') && (blog.summary = body.summary);
        (typeof body.allowComment === 'boolean') && (blog.allowComment = !!body.allowComment);
        (Array.isArray(body.tags)) && (blog.tags = body.tags);
        (typeof body.category === 'string') && (blog.category = body.category);
        (typeof body.content === 'string') && (blog.content = body.content);

        let saved = await AppDataSource.manager.save(blog);

        await refreshTagAndCatList();


        res.send({
            code: 'ok',
            message: '修改成功',
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
        if (!req.body || (
            !req.body.id || isNaN(+req.body.id)
        )) {
            res.status(400).send({
                code: 'Bad Request',
                message: 'No'
            });
            return;
        }
        const blog = await AppDataSource.manager.findOneBy(BlogPost, { id: +req.body.id });
        if (!blog) {
            res.send({
                code: 'not ok',
                message: '删除的博客不存在'
            });
            return;
        }

        // 权限控制
        if (
            !(
                (user.flags?.includes(ADMIN_FLAG))
                || (user.id === blog.authorId)
            )
        ) {
            res.send({
                code: 'not ok',
                message: '您没有权限这么做'
            });
            return;
        }
        await AppDataSource.manager.softDelete(BlogPost, {
            id: blog.id
        });

        await refreshTagAndCatList();

        res.send({
            code: 'ok',
            message: '删除成功',
        });

    } catch (err) {
        console.log(err);
        res.send({
            code: 'not ok',
            message: '服务器内部错误。'
        });
    }
});

router.post('/upload-image', async (req, res) => {
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

        // TODO: 存储文件上传用户的对应信息

        res.send({
            code: 'ok',
            message: '文件已上传',
            data: 'user-content/' + fileName
        });
    } catch (err) {
        console.log(err);
        res.send({
            code: 'not ok',
            message: '文件上传时发生出错'
        })
    }
});

export {
    router as blogRoute
};