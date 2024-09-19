/* eslint-disable */
/// <reference types="@welldone-software/why-did-you-render" />
import React from 'react';

//NOTE: 推奨がrequiredのためこのファイルだけeslint無効

if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
  });
}
/* eslint-enable */
