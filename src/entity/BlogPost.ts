import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";

@Entity()
export class BlogPost {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    authorId: number;

    author: string;

    @Column('text')
    summary: string;

    @Column({ length: 200 })
    title: string;

    /** Markdown */
    @Column('text')
    content: string;

    @Column()
    category: string;

    @Column('simple-array')
    tags: string[];

    @Column({ default: true })
    allowComment: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    lastModified: Date;

    @DeleteDateColumn()
    deletedAt: Date;

}