import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn } from "typeorm";
import { BlogUser } from "./BlogUser";

@Entity()
export class BlogComment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    blogId: number;

    @Column()
    userId: number;

    user: BlogUser;

    @Column()
    replyTo: number;

    replyTarget: BlogComment | null;

    @Column('text')
    content: string;

    @CreateDateColumn()
    createdAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;

}