import "reflect-metadata"
import { DataSource } from "typeorm"
import { BlogComment } from "./entity/BlogComment"
import { BlogPost } from "./entity/BlogPost"
import { BlogUser } from "./entity/BlogUser"
import { SiteDataRecord } from "./entity/SiteDataRecord"

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "blog-demo.sqlite3",
    synchronize: true,
    logging: false,
    entities: [BlogUser, BlogPost, BlogComment, SiteDataRecord],
    migrations: [],
    subscribers: [],
});