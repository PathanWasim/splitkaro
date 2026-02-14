import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

const authService = new AuthService();

export class AuthController {
    static async register(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await authService.register(req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    static async login(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await authService.login(req.body);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    static async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await authService.getProfile(req.user!.userId);
            res.json({ success: true, data: { user } });
        } catch (error) {
            next(error);
        }
    }

    static async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await authService.updateProfile(req.user!.userId, req.body);
            res.json({ success: true, data: { user } });
        } catch (error) {
            next(error);
        }
    }
}
