import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";
import { BlogUser } from "./BlogUser";

@Entity()
export class BlogPost {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    authorId: number;

    authorProfile: BlogUser | null;

    @Column('text', {
        default: ''
    })
    summary: string;

    @Column({
        length: 200,
        default: '无标题'
    })
    title: string;

    /** Markdown */
    @Column('text', {
        default: ''
    })
    content: string;

    @Column({
        default: ''
    })
    category: string;

    @Column('simple-array')
    tags: string[];

    @Column({ default: true })
    allowComment: boolean;

    @CreateDateColumn()
    createdAt: Date;

    /** 被删除或恢复，会造成此值变化 */
    @UpdateDateColumn()
    lastModified: Date;

    @DeleteDateColumn()
    deletedAt: Date;

}