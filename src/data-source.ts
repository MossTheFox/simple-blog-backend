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

/**
 * Document: https://typeorm.io/
 * Example:
 * import { AppDataSource } from "./data-source"
   import { User } from "./entity/User"

AppDataSource.initialize().then(async () => {

    console.log("Inserting a new user into the database...")
    const user = new User()
    user.firstName = "Timber"
    user.lastName = "Saw"
    user.age = 25
    await AppDataSource.manager.save(user)
    console.log("Saved a new user with id: " + user.id)

    console.log("Loading users from the database...")
    const users = await AppDataSource.manager.find(User)
    console.log("Loaded users: ", users)

    console.log("Here you can setup and run express / fastify / any other framework.")

}).catch(error => console.log(error))

 */