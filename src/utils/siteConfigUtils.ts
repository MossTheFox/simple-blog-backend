import { AppDataSource } from "../data-source";
import { BlogPost } from "../entity/BlogPost";
import { SiteDataRecord } from "../entity/SiteDataRecord";

type ListUnit = {
    name: string;
    postCount: number;
}

export async function refreshTagAndCatList() {
    let blogs = await AppDataSource.manager.find(BlogPost, {
        select: {
            category: true,
            tags: true
        }
    });
    const catList: Map<string, number> = new Map();
    const tagList: Map<string, number> = new Map();

    for (const b of blogs) {
        if (b.category) {
            let get = catList.get(b.category);
            if (get) {
                catList.set(b.category, get + 1);
            } else {
                catList.set(b.category, 1);
            }
        }
        for (const tag of b.tags) {
            let get = tagList.get(tag);
            if (get) {
                tagList.set(tag, get + 1);
            } else {
                tagList.set(tag, 1);
            }
        }
    }

    let stored: ListUnit[] = [];
    for (const [v, i] of catList.entries()) {
        stored.push({
            name: v,
            postCount: i
        });
    }

    let configA = new SiteDataRecord();
    configA.type = 'catList';
    configA.data = JSON.stringify(stored);

    stored.splice(0, stored.length);

    for (const [v, i] of tagList.entries()) {
        stored.push({
            name: v,
            postCount: i
        });
    }

    let configB = new SiteDataRecord();
    configB.type = 'tagList';
    configB.data = JSON.stringify(stored);

    await AppDataSource.manager.save([configB, configA]);
}

export async function getBlogRecordList(type: 'cat' | 'tag'): Promise<ListUnit[]> {
    let data = await AppDataSource.manager.findOneBy(SiteDataRecord, {
        type: type === 'cat' ? 'catList' : 'tagList'
    });
    if (!data) return [];
    return JSON.parse(data.data);
}