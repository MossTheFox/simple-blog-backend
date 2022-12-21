import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn } from "typeorm";
import { BlogUser } from "./BlogUser";

@Entity()
export class BlogComment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    blogId: number;

    @Column({
        default: false
    })
    validated: boolean;

    @Column()
    userId: number;

    userProfile: BlogUser | null;

    @Column({
        nullable: true
    })
    replyTo: number;

    replyTarget: BlogComment | null;

    @Column('text')
    content: string;

    @CreateDateColumn()
    createdAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;

}