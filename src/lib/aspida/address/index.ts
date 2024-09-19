/* eslint-disable */
import type * as Types from '../@types';

export type Methods = {
  post: {
    status: 201;
    reqBody: Types.CreateAddressInputDto;
  };

  get: {
    query: {
      /** 住所の種類 */
      type: number;
    };

    status: 200;

    resBody: Types.ResponseDto & {
      data: Types.FindManyAddressOutputDto[];
    };
  };

  delete: {
    status: 200;
  };
};
