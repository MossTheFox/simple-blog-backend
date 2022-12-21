import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../constraint';


export function signUserToken(data: { id: number }, expires = 1000 * 60 * 60 * 24 * 30) {
    return jwt.sign(data, JWT_SECRET);
}

export function decodeUserToken(token: string) {
    let decoded = jwt.decode(token);
    if (!decoded) return null;
    if (typeof decoded === 'object' && 'id' in decoded) {
        return +decoded.id;
    }
    return null;
}