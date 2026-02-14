import { Request, Response, NextFunction } from 'express';
import { GroupsService } from './groups.service';

const groupsService = new GroupsService();

export class GroupsController {
    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const group = await groupsService.createGroup(req.user!.userId, req.body);
            res.status(201).json({ success: true, data: { group } });
        } catch (error) {
            next(error);
        }
    }

    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const groups = await groupsService.getUserGroups(req.user!.userId);
            res.json({ success: true, data: { groups } });
        } catch (error) {
            next(error);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await groupsService.getGroupDetail(req.params.groupId as string);
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    static async invite(req: Request, res: Response, next: NextFunction) {
        try {
            const member = await groupsService.inviteMember(req.params.groupId as string, req.body);
            res.status(201).json({ success: true, data: { member } });
        } catch (error) {
            next(error);
        }
    }

    static async removeMember(req: Request, res: Response, next: NextFunction) {
        try {
            await groupsService.removeMember(
                req.params.groupId as string,
                req.params.userId as string,
                req.user!.userId
            );
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
