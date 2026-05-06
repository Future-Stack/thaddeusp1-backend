import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { IEnv } from 'src/config/env.config';

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const config = configService.get<IEnv['CLOUDINARY_CONFIG']>('env.CLOUDINARY_CONFIG');
    cloudinary.config({
      cloud_name: config?.CLOUDINARY_CLOUD_NAME,
      api_key: config?.CLOUDINARY_API_KEY,
      api_secret: config?.CLOUDINARY_API_SECRET,
    });

    return cloudinary;
  },
};
