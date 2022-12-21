import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export const BLOG_USER_PERMISSION_FLAGS = ['ADMIN'] as const;
export type BlogUserPermissionFlag = (typeof BLOG_USER_PERMISSION_FLAGS[number])[]

@Entity()
export class BlogUser {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        length: 30,
        unique: true
    })
    username: string;

    /** Hashed */
    @Column()
    password: string;

    /** [].join(',') */
    @Column('simple-array', {
        nullable: true
    })
    flags: BlogUserPermissionFlag[] | null;

    /** Avatar Url */
    @Column({
        length: 100,
        default: '/vite.svg'
    })
    avatar: string;

    @Column({ length: 100, 
        default: ''
    })
    signature: string;
};