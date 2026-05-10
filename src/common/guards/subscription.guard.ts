import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Institute } from '../../schemas/institute.schema';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    @InjectModel(Institute.name) private instituteModel: Model<Institute>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user (public route), allow
    if (!user || !user.instituteId) {
      return true;
    }

    const institute = await this.instituteModel.findById(user.instituteId);
    if (!institute) {
      throw new ForbiddenException('Institution not found');
    }

    const now = new Date();
    const isTrialExpired = institute.subscriptionTier === 'trial' && institute.trialExpiresAt && now > institute.trialExpiresAt;
    const isSubscriptionExpired = institute.subscriptionTier !== 'trial' && institute.subscriptionEndsAt && now > institute.subscriptionEndsAt;

    const isExpired = isTrialExpired || isSubscriptionExpired || !institute.isActive;

    if (isExpired) {
      // Logic: Allow students read-only access to their own data
      if (user.role === 'student' && request.method === 'GET') {
        // We allow students to view their profile or info
        return true;
      }

      // Block Admins, Teachers, and non-GET requests for students
      throw new ForbiddenException({
        message: 'Your institution subscription has expired.',
        error: 'SUBSCRIPTION_EXPIRED',
        statusCode: 402, // Payment Required
      });
    }

    return true;
  }
}
