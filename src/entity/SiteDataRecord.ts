import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";

const siteConfigTypes = ['catList', 'tagList', 'unknown'] as const;

@Entity()
export class SiteDataRecord {

    @PrimaryColumn('text')
    type: typeof siteConfigTypes[number];

    /** Might be json if is cat list or tag list */
    @Column('text')
    data: string;

}