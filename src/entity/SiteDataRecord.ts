import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";

const siteConfigTypes = ['catList', 'tagList', 'unknown'] as const;

@Entity()
export class SiteDataRecord {

    @PrimaryColumn('text')
    type: typeof siteConfigTypes[number];

    /** 也可以记录 JSON 字符串 */
    @Column('text')
    data: string;

}