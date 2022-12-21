declare namespace Express {
    export interface Request {
        /** 只在特定的局部路由有用到。用于让中间件完成用户身份验证。 */
        payload?: {
            userId: number;
        }
    }
}

type BlogPostData = {
    id: number;
    author: string;
    authorId: number;
    summary: string;
    title: string;
    /** Markdown content */
    content: string;
    category: string;
    tags: string[];
    allowComment: boolean;
    // deleted
    createdAt: Date;
    lastModified: Date;
};

type BlogPostEditorData = Omit<BlogPostData, keyof {
    id: number;
    author: string;
    authorId: number;
    createdAt: Date;
    lastModified: Date;
}>;

type BlogSummaryData = {
    id: number;
    author: string;
    authorId: number;
    summary: string;
    title: string;
    category: string;
    tags: string[];
    createdAt: Date;
    // lastModified: Date;
};

type CategoryRecord = {
    name: string;
    postsCount: number;
};

type CategoryListData = CategoryRecord[];

type TagRecord = {
    name: string;
    postsCount: number;
};

type TagListData = TagRecord[];

type BlogUserCore = {
    id: number;
    // 用户权限标记
    flags: string[];
};

type BlogUserData = {
    username: string;
    avatar: string;
    signature: string;
};

type BlogUserContext = 'Not Login' | (BlogUserCore & BlogUserData);

type BlogComment = {
    id: number;
    blogId: number;
    replyTo: number | null;
    content: string;
    time: Date,
    user: BlogUserData;
    replyTarget?: BlogComment;
};