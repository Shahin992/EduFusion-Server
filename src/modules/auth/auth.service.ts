import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
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
    let user;
    try {
      console.log(`[AuthService] Validating user: ${email}`);
      user = await this.userModel.findOne({ email });
    } catch (dbError) {
      console.error('[AuthService] DB lookup error:', dbError);
      throw new InternalServerErrorException('Database connection failed during login lookup');
    }
    
    if (!user) {
      console.warn(`[AuthService] User not found: ${email}`);
      throw new NotFoundException('User with this email not found');
    }

    console.log(`[AuthService] User found, comparing passwords...`);
    const isPasswordMatching = await bcrypt.compare(pass, user.passwordHash);
    
    if (!isPasswordMatching) {
      console.warn(`[AuthService] Password mismatch for: ${email}`);
      throw new UnauthorizedException('Wrong password');
    }

    console.log(`[AuthService] Password verified for: ${email}`);
    const userObj = user.toObject();
    const { passwordHash, ...result } = userObj;
    return result;
  }

  async login(user: any) {
    try {
      console.log(`[AuthService] Starting login for user: ${user.email}`);
      
      const isValidObjectId = Types.ObjectId.isValid(user.instituteId);
      
      const institute = (user.instituteId && isValidObjectId)
        ? await this.instituteModel.findById(user.instituteId)
        : null;
      
      if (user.instituteId && !isValidObjectId) {
        console.warn(`[AuthService] user.instituteId "${user.instituteId}" is not a valid ObjectId. Skipping institute lookup.`);
      }
      
      console.log(`[AuthService] Institute lookup complete: ${institute ? institute.name : 'None'}`);

      const payload = { 
        email: user.email, 
        sub: user._id || user.id, 
        name: user.name,
        role: user.role, 
        instituteId: user.instituteId 
      };

      const token = this.jwtService.sign(payload);
      console.log(`[AuthService] JWT signed successfully`);

      return {
        access_token: token,
        user: {
          id: user._id || user.id,
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
        },
        isOnboarded: institute?.isOnboarded || false
      };
    } catch (error) {
      console.error('[AuthService] Login failed at JWT/Object stage:', error);
      throw new InternalServerErrorException('Login processing failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
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
