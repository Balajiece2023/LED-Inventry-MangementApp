import prisma from '../prisma';
import { Role, NotificationType } from '@prisma/client';

export const logAudit = async (
  userId: string | null | undefined,
  userName: string,
  action: string,
  module: string,
  details?: string,
  ipAddress?: string
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userName: userName || 'System',
        action,
        module,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};

export const createNotification = async (
  title: string,
  message: string,
  type: NotificationType,
  targetRole?: Role,
  link?: string
) => {
  try {
    return await prisma.notification.create({
      data: {
        title,
        message,
        type,
        targetRole: targetRole || null,
        link: link || null,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};
