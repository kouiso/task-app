/* eslint-disable */
import type * as Types from '../../@types';

export type Methods = {
  post: {
    status: 200;

    resBody: Types.ResponseDto & {
      data: Types.CreatePaymentIntentOutputDto;
    };

    reqBody: Types.CreatePaymentIntentInputDto;
  };
};
