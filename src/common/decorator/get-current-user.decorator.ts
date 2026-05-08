import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetCurrentUser = createParamDecorator(
  (data: keyof any, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    console.log("Current user from guard: ", request.user);
    if (data) {
      return request.user?.[data];
    }
    return request.user;
  },
);
