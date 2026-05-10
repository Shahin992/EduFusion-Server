import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from '../../schemas/user.schema';
import { Institute } from '../../schemas/institute.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Institute.name) private instituteModel: Model<Institute>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userModel.findOne({ email });
    
    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    const isPasswordMatching = await bcrypt.compare(pass, user.passwordHash);
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Wrong password');
    }

    const { passwordHash, ...result } = user.toObject();
    return result;
  }

  async login(user: any) {
    const institute = await this.instituteModel.findById(user.instituteId);
    
    const payload = { 
      email: user.email, 
      sub: user._id, 
      name: user.name,
      role: user.role, 
      instituteId: user.instituteId 
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        photoUrl: user.photoUrl,
        role: user.role,
        instituteId: user.instituteId,
        institute: institute ? {
          name: institute.name,
          logoUrl: institute.logoUrl,
          branding: institute.branding,
          isOnboarded: institute.isOnboarded
        } : null
      }
    };
  }

  async register(userData: any) {
    const { instituteName, ...userFields } = userData;
    
    // Check if user exists
    const existingUser = await this.userModel.findOne({ email: userFields.email });
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    let instituteId = null;

    // If registering as admin, we create an institute
    if (userFields.role === 'admin' && instituteName) {
      const slug = instituteName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      const trialDays = 30;
      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + trialDays);

      const institute = new this.instituteModel({
        name: instituteName,
        slug: slug,
        isActive: true,
        trialExpiresAt: trialExpiresAt,
        branding: {
          email: userFields.email
        }
      });
      const savedInstitute = await institute.save();
      instituteId = savedInstitute._id;
    }

    const hashedPassword = await bcrypt.hash(userFields.password, 10);
    const createdUser = new this.userModel({
      ...userFields,
      instituteId: userFields.instituteId || instituteId,
      passwordHash: hashedPassword,
    });

    const savedUser = await createdUser.save();

    // Link admin back to institute if we just created one
    if (instituteId && userFields.role === 'admin') {
      await this.instituteModel.findByIdAndUpdate(instituteId, {
        $set: { adminId: savedUser._id }
      });
    }

    return { 
      userId: savedUser._id,
      message: 'Registration successful! Please log in to your account.'
    };
  }

  async getUserById(id: string) {
    return this.userModel.findById(id).populate('instituteId');
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    if (updateProfileDto.email) {
      const existingUser = await this.userModel.findOne({
        email: updateProfileDto.email,
        _id: { $ne: new Types.ObjectId(userId) },
      });

      if (existingUser) {
        throw new ConflictException('Another user already uses this email address');
      }
    }

    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateProfileDto },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.login(user);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordMatching = await bcrypt.compare(changePasswordDto.currentPassword, user.passwordHash);
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(changePasswordDto.newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    user.passwordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await user.save();

    return { message: 'Password updated successfully' };
  }
}
