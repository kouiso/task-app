/* eslint-disable */
import type * as Types from '../../@types';

export type Methods = {
  get: {
    status: 200;

    resBody: Types.ResponseDto & {
      data: Types.FindOneAddressOutputDto;
    };
  };

  patch: {
    status: 200;
    reqBody: Types.UpdateAddressDto;
  };
};
