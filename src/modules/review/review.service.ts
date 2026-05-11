import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    return this.prisma.review.create({
      data: {
        text: dto.text,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profileImg: true,
          },
        },
      },
    });
  }

  async findAll(query: { page?: string; limit?: string }) {
    const { page = '1', limit = '10' } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              profileImg: true,
            },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count(),
    ]);

    return {
      data: reviews,
      meta: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async remove(id: string, userId: string, isAdmin: boolean) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    if (!isAdmin && review.userId !== userId) {
      throw new Error('You can only delete your own reviews');
    }

    return this.prisma.review.delete({ where: { id } });
  }
}
