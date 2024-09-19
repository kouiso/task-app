/* eslint-disable */
import type * as Types from '../@types';

export type Methods = {
  get: {
    query: {
      /** 郵便番号は必須です */
      zipCode: string;
    };

    status: 200;

    resBody: Types.ResponseDto & {
      data: Types.GetZipcodeOutputDto;
    };
  };
};
