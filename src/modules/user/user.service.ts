import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async updateProfile(
    userId: string,
    data: UpdateProfileDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    let profileImg = user.profileImg;

    if (file) {
      const uploadResult: any = await this.cloudinary.uploadImageFromBuffer(
        file.buffer,
        'profile-images',
        `user_${userId}_${Date.now()}`,
      );
      profileImg = uploadResult.secure_url;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName ?? user.fullName,
        phone: data.phone ?? user.phone,
        streetAddress: data.streetAddress ?? user.streetAddress,
        city: data.city ?? user.city,
        state: data.state ?? user.state,
        zip: data.zip ? parseInt(data.zip, 10) : user.zip,
        profileImg,
      },
    });

    const { password, lastOtp, refreshToken, ...rest } = updatedUser;
    return rest;
  }
}
