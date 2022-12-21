import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";

const siteConfigTypes = ['cat', 'tag', 'config'] as const;

@Entity()
export class SiteDataRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    type: typeof siteConfigTypes[number];

    @Column('text')
    data: string;

}